import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runProfileAnalysis } from '@/lib/profile-analyzer'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'

  // Circuit breaker + hourly rate limit
  const [cb, rl] = await Promise.all([
    checkCircuitBreaker(),
    checkRateLimit(user.id, 'profile_analysis'),
  ])
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })
  if (!rl.allowed) return NextResponse.json({ error: 'You have already run a profile analysis this hour. Try again next hour.' }, { status: 429 })

  const analysisCheck = await checkLimit(user.id, plan, 'profile_analyses')
  if (!analysisCheck.allowed) {
    await logViolation(user.id, 'profile_analyses', plan)
    return NextResponse.json({
      error: `You've used all ${analysisCheck.limit} profile analyses this month.`,
      feature: 'profile_analyses',
      used: analysisCheck.used,
      limit: analysisCheck.limit,
      plan,
    }, { status: 429 })
  }

  try {
    const result = await runProfileAnalysis(user.id)
    await Promise.all([
      incrementUsage(user.id, 'profile_analyses'),
      incrementRateLimit(user.id, 'profile_analysis'),
      trackAndCheckSpend('claude_haiku', user.id),
    ])
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[analyse route] Analysis failed:', message)
    return NextResponse.json(
      { error: message || 'Analysis failed — check server logs for details.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('profile_analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('analysed_at', { ascending: false })
    .limit(2)

  return NextResponse.json({ analyses: data || [] })
}
