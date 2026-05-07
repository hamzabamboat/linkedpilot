import { supabaseAdmin } from './supabase-admin'
import { alertHighCallVolume } from './admin-alerts'

// Per-user hourly limits
const HOURLY_LIMITS: Record<string, number> = {
  claude_calls: 20,
  whisper_calls: 5,
  image_uploads: 10,
  api_requests: 100,
  profile_analysis: 1,
  trend_refresh: 2,
  batch_generation: 1,
}

function currentHourWindow(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  return d.toISOString()
}

function currentMinuteWindow(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  return d.toISOString()
}

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
  retryAfterSeconds: number
}

export async function checkRateLimit(userId: string, feature: string): Promise<RateLimitResult> {
  const limit = HOURLY_LIMITS[feature] ?? 100
  const window = currentHourWindow()

  const { data } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('window_start', window)
    .maybeSingle()

  const count = data?.count ?? 0
  const allowed = count < limit

  const nextHour = new Date(window)
  nextHour.setHours(nextHour.getHours() + 1)
  const retryAfterSeconds = Math.ceil((nextHour.getTime() - Date.now()) / 1000)

  return { allowed, count, limit, retryAfterSeconds }
}

export async function incrementRateLimit(userId: string, feature: string): Promise<void> {
  const window = currentHourWindow()
  try {
    await supabaseAdmin.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_feature: feature,
      p_window: window,
    })
  } catch { /* non-fatal */ }
}

// Check and alert on suspiciously high global Claude call volume (50+ in 5 min)
export async function checkGlobalCallVolume(): Promise<void> {
  const fiveMinAgo = new Date(Date.now() - 300_000).toISOString()
  const { data } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('count')
    .eq('feature', 'claude_calls')
    .gte('window_start', fiveMinAgo)

  if (!data) return

  const total = data.reduce((s, r) => s + (r.count ?? 0), 0)
  if (total >= 50) {
    await alertHighCallVolume(total, fiveMinAgo).catch(console.error)
  }
}

// Unauthenticated IP-based rate limit check using rate_limit_tracking
export async function checkIpRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const window = currentMinuteWindow()
  const limit = 10 // 10 requests per minute for unauthenticated IPs

  const { data } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('count')
    .eq('user_id', `ip:${ip}`)
    .eq('feature', 'anon_requests')
    .eq('window_start', window)
    .maybeSingle()

  const count = data?.count ?? 0
  if (count >= limit) return { allowed: false }

  try {
    await supabaseAdmin.rpc('increment_rate_limit', {
      p_user_id: `ip:${ip}`,
      p_feature: 'anon_requests',
      p_window: window,
    })
  } catch { /* non-fatal */ }

  return { allowed: true }
}
