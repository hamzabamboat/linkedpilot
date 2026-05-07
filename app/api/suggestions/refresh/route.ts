import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateSuggestionsForUser } from '@/lib/anthropic'
import { getTrendsForProfile } from '@/lib/trends'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

  const plan = profile.plan || 'starter'

  // Circuit breaker + hourly rate limits
  const [cb, rlClaude, rlRefresh] = await Promise.all([
    checkCircuitBreaker(),
    checkRateLimit(user.id, 'claude_calls'),
    checkRateLimit(user.id, 'trend_refresh'),
  ])
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })
  if (!rlClaude.allowed) return NextResponse.json({ error: `Too many AI calls this hour (limit: ${rlClaude.limit}). Try again in ${Math.ceil(rlClaude.retryAfterSeconds / 60)} minutes.` }, { status: 429 })
  if (!rlRefresh.allowed) return NextResponse.json({ error: 'You have already refreshed trends twice this hour. Try again next hour.' }, { status: 429 })

  // Check trend_refreshes limit before calling Claude
  const refreshCheck = await checkLimit(user.id, plan, 'trend_refreshes')
  if (!refreshCheck.allowed) {
    await logViolation(user.id, 'trend_refreshes', plan)
    return NextResponse.json({
      error: `You've used all ${refreshCheck.limit} trend refreshes this month.`,
      feature: 'trend_refreshes',
      used: refreshCheck.used,
      limit: refreshCheck.limit,
      plan,
    }, { status: 429 })
  }

  // Get trending news
  let trendingNews: string[] = []
  try {
    const trends = await getTrendsForProfile(profile)
    trendingNews = [
      ...trends.trendingTopics.slice(0, 3),
      ...trends.newsArticles.slice(0, 3).map((a: { title: string }) => a.title),
    ]
  } catch { /* non-fatal */ }

  // Get recent post topics
  const { data: recentPosts } = await supabaseAdmin
    .from('posts')
    .select('generation_prompt, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const recentTopics = (recentPosts || [])
    .map(p => p.generation_prompt || p.content?.slice(0, 80))
    .filter(Boolean) as string[]

  // Call Claude to generate suggestions — increment only on success
  const suggestions = await generateSuggestionsForUser(profile, trendingNews, recentTopics)

  if (suggestions.length > 0) {
    await supabaseAdmin
      .from('post_suggestions')
      .update({ status: 'dismissed' })
      .eq('user_id', user.id)
      .eq('status', 'pending')

    await supabaseAdmin.from('post_suggestions').insert(
      suggestions.map(s => ({
        user_id: user.id,
        suggestion_text: s.suggestion_text,
        angle: s.angle,
        hashtags: s.hashtags,
        why_it_works: s.why_it_works,
        source: s.source || 'news',
        status: 'pending',
      }))
    )

    await Promise.all([
      incrementUsage(user.id, 'trend_refreshes'),
      incrementRateLimit(user.id, 'claude_calls'),
      incrementRateLimit(user.id, 'trend_refresh'),
      trackAndCheckSpend('claude_sonnet', user.id),
    ])
  }

  return NextResponse.json({ count: suggestions.length })
}
