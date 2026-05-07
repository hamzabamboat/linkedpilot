import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/anthropic'
import { getTrendsForProfile } from '@/lib/trends'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Circuit breaker
  const cb = await checkCircuitBreaker()
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })

  // Per-user hourly rate limit
  const rl = await checkRateLimit(user.id, 'claude_calls')
  if (!rl.allowed) return NextResponse.json({ error: `Too many requests. You've made ${rl.count} AI calls this hour (limit: ${rl.limit}). Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.` }, { status: 429 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 400 })

  const plan = profile.plan || 'starter'

  // Trial guard (3 free posts before subscription)
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  const hasActiveSub = sub?.status === 'active'
  const postsUsed = profile.posts_used_this_month || 0
  if (!hasActiveSub && postsUsed >= 3) {
    return NextResponse.json({ error: 'trial_exhausted' }, { status: 402 })
  }

  const { topic, voiceNoteId, storyBankId, additionalContext } = await request.json()

  // Check posts_generated limit
  const postsCheck = await checkLimit(user.id, plan, 'posts_generated')
  if (!postsCheck.allowed) {
    await logViolation(user.id, 'posts_generated', plan)
    return NextResponse.json({
      error: `You've used all ${postsCheck.limit} post generations this month. Upgrade to ${plan === 'starter' ? 'Standard for 20' : 'Pro for 30'} posts.`,
      feature: 'posts_generated',
      used: postsCheck.used,
      limit: postsCheck.limit,
      plan,
    }, { status: 429 })
  }

  // If story conversion, check story_conversions limit too
  if (storyBankId) {
    const storyCheck = await checkLimit(user.id, plan, 'story_conversions')
    if (!storyCheck.allowed) {
      return NextResponse.json({
        error: `You've used all ${storyCheck.limit} story conversions this month.`,
        feature: 'story_conversions',
        used: storyCheck.used,
        limit: storyCheck.limit,
        plan,
      }, { status: 429 })
    }
  }

  // Resolve voice note transcript
  let transcript: string | undefined
  if (voiceNoteId) {
    const { data: note } = await supabaseAdmin
      .from('voice_notes')
      .select('transcript')
      .eq('id', voiceNoteId)
      .eq('user_id', user.id)
      .single()
    transcript = note?.transcript ?? undefined
  }

  // Resolve story bank text
  let storyText: string | undefined
  if (storyBankId) {
    const { data: story } = await supabaseAdmin
      .from('story_bank')
      .select('raw_text')
      .eq('id', storyBankId)
      .eq('user_id', user.id)
      .single()
    storyText = story?.raw_text ?? undefined
  }

  // Get recent topics to avoid repetition
  const { data: recentPosts } = await supabaseAdmin
    .from('posts')
    .select('generation_prompt')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  const recentTopics = (recentPosts || []).map(p => p.generation_prompt).filter(Boolean) as string[]

  // Fetch trending context
  let trendingContext: string | undefined
  try {
    const trends = await getTrendsForProfile(profile)
    if (trends.trendingTopics.length || trends.newsArticles.length) {
      const topTopics = trends.trendingTopics.slice(0, 5).join(', ')
      const topNews = trends.newsArticles.slice(0, 3).map((a: { title: string }) => a.title).join('; ')
      trendingContext = [topTopics && `Trending: ${topTopics}`, topNews && `News: ${topNews}`].filter(Boolean).join(' | ')
    }
  } catch { /* non-fatal */ }

  const posts = await generateLinkedInPosts({
    profile, topic, transcript, storyText, additionalContext, trendingContext, recentTopics,
  })

  // Save drafts
  const insertedPosts = await Promise.all(
    posts.map(content =>
      supabaseAdmin
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          status: 'draft',
          source: voiceNoteId ? 'voice_note' : storyBankId ? 'story_bank' : 'ai_generated',
          voice_note_id: voiceNoteId || null,
          story_bank_id: storyBankId || null,
          generation_prompt: topic || transcript?.slice(0, 200) || storyText?.slice(0, 200),
        })
        .select()
        .single()
        .then(r => r.data)
    )
  )

  // Increment usage tracking
  await Promise.all([
    incrementUsage(user.id, 'posts_generated'),
    storyBankId ? incrementUsage(user.id, 'story_conversions') : Promise.resolve(),
    incrementRateLimit(user.id, 'claude_calls'),
    trackAndCheckSpend('claude_sonnet', user.id),
    // Keep posts_used_this_month in sync for the existing dashboard counter
    supabaseAdmin
      .from('user_profiles')
      .update({ posts_used_this_month: postsUsed + 1 })
      .eq('user_id', user.id),
  ])

  if (storyBankId) {
    await supabaseAdmin.from('story_bank').update({ status: 'converted' }).eq('id', storyBankId)
  }

  return NextResponse.json({ posts: insertedPosts.filter(Boolean) })
}
