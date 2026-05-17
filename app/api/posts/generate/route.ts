import { analyzeContent } from "@/lib/compliance"
import { calculateSimilarityScore } from "@/lib/similarity"
import { logComplianceEvent } from "@/lib/compliance-events"
import { NextRequest, NextResponse } from 'next/server'
export const maxDuration = 60
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts, extractMemoriesFromContent, extractTopicsFromPost } from '@/lib/anthropic'
import { getTrendsForProfile } from '@/lib/trends'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Circuit breaker
  const cb = await checkCircuitBreaker()
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })

  // Per-user hourly rate limit
  const rl = await checkRateLimit(user.id, 'claude_calls')
  if (!rl.allowed) {
    const retryAt = new Date(Date.now() + rl.retryAfterSeconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    return NextResponse.json(
      { error: `You've hit the limit of ${rl.limit} generations per hour. Try again at ${retryAt}.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

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
  const hasActiveSub = sub?.status === 'active' || sub?.status === 'trial' || sub?.status === 'trialing'
  const postsUsed = profile.posts_used_this_month || 0
  if (!hasActiveSub && postsUsed >= 3) {
    return NextResponse.json({ error: 'trial_exhausted' }, { status: 402 })
  }

  const { topic, voiceNoteId, storyBankId, additionalContext, imageIds } = await request.json()

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

  // Get recent posts for deduplication — last 30 for richer topic awareness
  const { data: recentPostRows } = await supabaseAdmin
    .from('posts')
    .select('content, generation_prompt, topics_extracted, content_pillar')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const recentContents: string[] = (recentPostRows || [])
    .map(p => p.content)
    .filter(Boolean) as string[]

  const recentTopics = (recentPostRows || [])
    .flatMap(p => {
      const fromPrompt = p.generation_prompt ? [p.generation_prompt] : []
      const fromTags = Array.isArray(p.topics_extracted) ? p.topics_extracted : []
      return [...fromPrompt, ...fromTags]
    })
    .filter(Boolean) as string[]

  // Group topics by content pillar so the AI can rotate underused pillars
  const recentTopicsByPillar: Record<string, string[]> = {}
  for (const p of (recentPostRows || [])) {
    if (p.content_pillar) {
      if (!recentTopicsByPillar[p.content_pillar]) recentTopicsByPillar[p.content_pillar] = []
      if (p.generation_prompt) recentTopicsByPillar[p.content_pillar].push(p.generation_prompt)
    }
  }

  // Fetch recent unposted memories (last 21 days) for lifestyle recall
  const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  const { data: userMemories } = await supabaseAdmin
    .from('user_memories')
    .select('content, memory_type, created_at, occurred_at')
    .eq('user_id', user.id)
    .eq('posted_about', false)
    .gte('created_at', threeWeeksAgo)
    .order('created_at', { ascending: false })
    .limit(10)

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

  // Resolve selected images and build context (non-fatal if table missing)
  let imageContext: string | undefined
  let selectedImageUrls: string[] = []
  if (imageIds?.length) {
    try {
      const { data: postImages } = await supabaseAdmin
        .from('post_images')
        .select('*')
        .in('id', imageIds)
        .eq('user_id', user.id)
      if (postImages?.length) {
        selectedImageUrls = postImages.map((img: { public_url: string }) => img.public_url)
        imageContext = `The user has selected ${postImages.length} photo(s) to include with this post.\n` +
          postImages.map((img: { ai_description?: string; ai_mood?: string; ai_topics?: string[]; ai_text_detected?: string }, i: number) =>
            `Photo ${i + 1}:\n- What's in it: ${img.ai_description || 'unknown'}\n- Mood: ${img.ai_mood || 'unknown'}\n- Topics: ${(img.ai_topics || []).join(', ')}\n- Text visible: ${img.ai_text_detected || 'none'}`
          ).join('\n')
      }
    } catch { /* post_images table may not exist yet — skip image context */ }
  }

  const posts = await generateLinkedInPosts({
    profile, topic, transcript, storyText, additionalContext, trendingContext,
    recentTopics, recentTopicsByPillar,
    userMemories: userMemories || undefined,
    imageContext,
  })

  const validPosts = posts.filter(p => p && p.trim().length >= 50)
  if (validPosts.length === 0) {
    return NextResponse.json({ error: 'Generation failed — response too short. Please try again.' }, { status: 500 })
  }

  // Save drafts
  const insertedPosts = await Promise.all(
    validPosts.map(async content => {
      const scores = analyzeContent(content)
      const similarityScore = calculateSimilarityScore(content, recentContents)

      const row: Record<string, unknown> = {
        user_id: user.id,
        content,
        status: 'draft',
        source: voiceNoteId ? 'voice_note' : storyBankId ? 'story_bank' : 'ai_generated',
        voice_note_id: voiceNoteId || null,
        story_bank_id: storyBankId || null,
        generation_prompt: topic || transcript?.slice(0, 200) || storyText?.slice(0, 200),
        spam_score: scores.spam_score,
        humanity_score: scores.humanity_score,
        hook_similarity_score: scores.hook_similarity_score,
        originality_score: scores.originality_score,
        similarity_score: similarityScore,
        requires_manual_review: scores.requires_manual_review,
      }
      if (selectedImageUrls.length) row.image_urls = selectedImageUrls

      const result = await supabaseAdmin
        .from('posts')
        .insert(row)
        .select()
        .single()

      if (result.error) {
        console.error('[posts/generate] insert error:', result.error.message)
        return null
      }

      // Log compliance events for flagged content (non-blocking)
      if (scores.spam_score >= 40) {
        logComplianceEvent(user.id, 'high_spam_generation', scores.spam_score >= 60 ? 'high' : 'medium', {
          spam_score: scores.spam_score,
          humanity_score: scores.humanity_score,
          flags: scores.flags,
        }, result.data?.id)
      } else if (scores.requires_manual_review) {
        logComplianceEvent(user.id, 'post_flagged_review', 'low', {
          flags: scores.flags,
        }, result.data?.id)
      }

      return result.data
    })
  )

  // Increment usage tracking
  await Promise.all([
    incrementUsage(user.id, 'posts_generated'),
    storyBankId ? incrementUsage(user.id, 'story_conversions') : Promise.resolve(),
    incrementRateLimit(user.id, 'claude_calls'),
    trackAndCheckSpend('claude_sonnet', user.id),
    supabaseAdmin
      .from('user_profiles')
      .update({ posts_used_this_month: postsUsed + 1 })
      .eq('user_id', user.id),
  ])

  if (storyBankId) {
    await supabaseAdmin.from('story_bank').update({ status: 'converted' }).eq('id', storyBankId)
  }

  const savedPosts = insertedPosts.filter(Boolean) as Array<{ id: string; content: string }>

  // Fire-and-forget: extract topics + memories from saved posts and source content
  Promise.allSettled([
    // Tag each saved post with topic keywords
    ...savedPosts.map(async (post) => {
      const topics = await extractTopicsFromPost(post.content)
      if (topics.length) {
        await supabaseAdmin.from('posts').update({ topics_extracted: topics }).eq('id', post.id)
      }
    }),
    // Extract memories from voice note transcript (first post's content as proxy)
    (async () => {
      const sourceText = transcript || storyText
      if (!sourceText) return
      const memories = await extractMemoriesFromContent(sourceText, transcript ? 'voice_note' : 'post')
      if (!memories.length) return
      await supabaseAdmin.from('user_memories').insert(
        memories.map(m => ({
          user_id: user.id,
          memory_type: m.memory_type,
          content: m.content,
          occurred_at: m.occurred_at,
          source: transcript ? 'voice_note' : 'post',
          source_id: voiceNoteId || storyBankId || null,
          posted_about: false,
        }))
      )
    })(),
  ]).catch(() => { /* non-fatal */ })

  return NextResponse.json({ posts: savedPosts })
  } catch (error) {
    console.error('[posts/generate]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
