import { supabaseAdmin } from './supabase-admin'
import { alertCircuitOpen, alertSpendThreshold } from './admin-alerts'

type CBState = 'CLOSED' | 'OPEN'

interface CBCache {
  state: CBState
  openedAt: number
  checkedAt: number
}

// Module-level cache: avoid DB hit on every request (serverless warm-instance optimization)
let _cache: CBCache = { state: 'CLOSED', openedAt: 0, checkedAt: 0 }

const CACHE_TTL_MS = 30_000        // re-check DB every 30 seconds
const AUTO_RESET_MS = 900_000      // auto-reset OPEN breaker after 15 minutes

// Approximate Claude costs in INR (based on ~83 INR/USD, June 2025 pricing)
export const SPEND_RATES = {
  claude_sonnet: 1.50,    // per call (avg ~1k input + 500 output tokens)
  claude_haiku: 0.25,     // per call
  openai_whisper: 0.83,   // per minute of audio (~$0.006/min)
}

export async function checkCircuitBreaker(): Promise<{ open: boolean; state: CBState }> {
  const now = Date.now()

  // Use cached state if still fresh
  if (now - _cache.checkedAt < CACHE_TTL_MS) {
    if (_cache.state === 'OPEN' && now - _cache.openedAt >= AUTO_RESET_MS) {
      _cache = { state: 'CLOSED', openedAt: 0, checkedAt: now }
      resetCBInDB().catch(console.error)
      return { open: false, state: 'CLOSED' }
    }
    return { open: _cache.state === 'OPEN', state: _cache.state }
  }

  // Refresh from Supabase
  const { data } = await supabaseAdmin
    .from('circuit_breaker_events')
    .select('state, opened_at')
    .eq('event_type', 'state_change')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data || data.state === 'CLOSED') {
    _cache = { state: 'CLOSED', openedAt: 0, checkedAt: now }
    return { open: false, state: 'CLOSED' }
  }

  const openedAt = new Date(data.opened_at).getTime()

  if (now - openedAt >= AUTO_RESET_MS) {
    _cache = { state: 'CLOSED', openedAt: 0, checkedAt: now }
    resetCBInDB().catch(console.error)
    return { open: false, state: 'CLOSED' }
  }

  _cache = { state: 'OPEN', openedAt, checkedAt: now }
  return { open: true, state: 'OPEN' }
}

export async function openCircuitBreaker(reason: string, stats: Record<string, unknown> = {}): Promise<void> {
  const now = new Date()
  _cache = { state: 'OPEN', openedAt: now.getTime(), checkedAt: now.getTime() }
  try {
    await supabaseAdmin.from('circuit_breaker_events').insert({
      event_type: 'state_change',
      state: 'OPEN',
      reason,
      opened_at: now.toISOString(),
      stats,
    })
  } catch { /* non-fatal: module cache still reflects OPEN */ }
  await alertCircuitOpen('API', reason, stats)
}

async function resetCBInDB(): Promise<void> {
  try {
    await supabaseAdmin.from('circuit_breaker_events').insert({
      event_type: 'state_change',
      state: 'CLOSED',
      reason: 'auto_reset_15min',
      opened_at: new Date().toISOString(),
    })
  } catch { /* non-fatal */ }
}

// Call after each Claude/Whisper API call to track spend and check thresholds
export async function trackAndCheckSpend(service: keyof typeof SPEND_RATES, userId?: string, extraMeta?: Record<string, unknown>): Promise<void> {
  const costInr = SPEND_RATES[service] ?? 0
  if (costInr === 0) return

  try {
    await supabaseAdmin.from('spend_tracking').insert({
      user_id: userId ?? null,
      service,
      cost_inr: costInr,
      meta: extraMeta ?? {},
    })
  } catch { /* non-fatal */ }

  // Check spend thresholds asynchronously (don't block the response)
  checkSpendThresholds(costInr).catch(console.error)
}

async function checkSpendThresholds(justSpent: number): Promise<void> {
  // Only re-check thresholds when we cross likely boundaries
  // (don't hammer DB on every single call)
  if (justSpent < 1.0 && Math.random() > 0.1) return // 10% sample for cheap calls

  const [hourRow, dayRow] = await Promise.all([
    supabaseAdmin.from('spend_tracking').select('cost_inr').gte('created_at', new Date(Date.now() - 3_600_000).toISOString()),
    supabaseAdmin.from('spend_tracking').select('cost_inr').gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  const hourlyInr = (hourRow.data ?? []).reduce((s, r) => s + (r.cost_inr ?? 0), 0)
  const dailyInr = (dayRow.data ?? []).reduce((s, r) => s + (r.cost_inr ?? 0), 0)

  if (hourlyInr > 5000 || dailyInr > 20000) {
    const reason = hourlyInr > 5000
      ? `Hourly spend ₹${hourlyInr.toFixed(0)} exceeded ₹5000`
      : `Daily spend ₹${dailyInr.toFixed(0)} exceeded ₹20000`
    await openCircuitBreaker(reason, { hourlyInr, dailyInr })
  } else if (hourlyInr > 2000) {
    await alertSpendThreshold('1 hour', hourlyInr, 2000)
  }
}
