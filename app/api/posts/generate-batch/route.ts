import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { anthropic } from '@/lib/anthropic'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export const maxDuration = 300

async function generateBatch(
  count: number,
  profile: Record<string, unknown>,
  pillars: string[],
): Promise<Array<{ content: string; content_pillar: string; format: string }>> {
  const voiceCtx = [
    profile.voice_fingerprint ? `Voice fingerprint:\n${profile.voice_fingerprint}` : '',
    profile.writing_sample ? `Writing sample:\n${String(profile.writing_sample).slice(0, 400)}` : '',
  ].filter(Boolean).join('\n\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `Generate exactly ${count} LinkedIn posts for this person.

Author: ${profile.name || 'Professional'}, ${profile.role || 'expert'} in ${profile.industry || 'business'}
Content pillars (rotate evenly): ${pillars.join(', ')}
${voiceCtx}

Rules:
1. Scroll-stopping first line — no generic openers, never start with "I"
2. Short punchy paragraphs, blank lines between
3. 150-300 words per post
4. Include 5-8 hashtags (mix of large/medium/niche) on the last line
5. Vary formats: story, tips list, contrarian take, industry insight, behind-the-scenes, lesson learned, question to audience
6. Sound 100% human — match the writing sample's rhythm exactly
7. Each post must be on a completely different topic

Respond with ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "content": "<full post text with hashtags>",
    "content_pillar": "<pillar name>",
    "format": "<story|tips|insight|contrarian|behind_the_scenes|lesson|question>"
  }
]

Generate all ${count} posts now.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

function buildScheduleSlots(now: Date, count: number, preferredHour: number, preferredDays: string[]): Date[] {
  const slots: Date[] = []
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const startDay = now.getDate() + 1

  for (let day = startDay; day <= daysInMonth && slots.length < count; day++) {
    const d = new Date(now.getFullYear(), now.getMonth(), day)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
    if (!preferredDays.length || preferredDays.includes(dayName)) {
      slots.push(new Date(now.getFullYear(), now.getMonth(), day, preferredHour, 0, 0))
    }
  }

  if (slots.length < count) {
    for (let day = startDay; day <= daysInMonth && slots.length < count; day++) {
      const d = new Date(now.getFullYear(), now.getMonth(), day, preferredHour, 0, 0)
      if (!slots.some(s => s.getDate() === d.getDate())) slots.push(d)
    }
  }

  return slots
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Circuit breaker
  const cb = await checkCircuitBreaker()
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })

  // Per-user hourly rate limits
  const [rlClaude, rlBatch] = await Promise.all([
    checkRateLimit(user.id, 'claude_calls'),
    checkRateLimit(user.id, 'batch_generation'),
  ])
  if (!rlClaude.allowed) return NextResponse.json({ error: `Too many AI calls this hour (limit: ${rlClaude.limit}). Try again in ${Math.ceil(rlClaude.retryAfterSeconds / 60)} minutes.` }, { status: 429 })
  if (!rlBatch.allowed) return NextResponse.json({ error: 'You have already run batch generation this hour. Try again next hour.' }, { status: 429 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Complete your profile first before generating posts.' }, { status: 404 })
  }

  const plan = profile.plan || 'starter'

  // Check batch_runs limit
  const batchCheck = await checkLimit(user.id, plan, 'batch_runs')
  if (!batchCheck.allowed) {
    await logViolation(user.id, 'batch_runs', plan)
    return NextResponse.json({
      error: `You've used all ${batchCheck.limit} batch generation run${batchCheck.limit !== 1 ? 's' : ''} this month. Upgrade to get more.`,
      feature: 'batch_runs',
      used: batchCheck.used,
      limit: batchCheck.limit,
      plan,
    }, { status: 429 })
  }

  // Check how many posts are remaining this month
  const postsCheck = await checkLimit(user.id, plan, 'posts_generated')
  if (postsCheck.remaining === 0) {
    return NextResponse.json({
      error: `You've used all ${postsCheck.limit} post generations this month.`,
      feature: 'posts_generated',
      used: postsCheck.used,
      limit: postsCheck.limit,
      plan,
    }, { status: 429 })
  }

  const postsToGenerate = postsCheck.remaining
  const pillars: string[] = (profile.content_pillars as string[]) || ['Professional Insights', 'Industry Trends', 'Personal Growth']
  const controlPreference: string = (profile.control_preference as string) || 'approve'
  const preferredHour: number = (profile.preferred_post_hour as number) || 9
  const preferredDays: string[] = (profile.preferred_days as string[]) || ['Monday', 'Wednesday', 'Friday']

  const now = new Date()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // Generate in batches of 10 to stay within token limits
  const BATCH_SIZE = 10
  const allPosts: Array<{ content: string; content_pillar: string; format: string }> = []
  let batchIdx = 0

  while (allPosts.length < postsToGenerate) {
    const remaining = postsToGenerate - allPosts.length
    const batchCount = Math.min(remaining, BATCH_SIZE)
    const batch = await generateBatch(batchCount, profile as Record<string, unknown>, pillars)
    allPosts.push(...batch)
    batchIdx++
    if (batch.length === 0) break
  }

  if (allPosts.length === 0) {
    return NextResponse.json({ error: 'Failed to generate posts. Please try again.' }, { status: 500 })
  }

  const slots = buildScheduleSlots(now, allPosts.length, preferredHour, preferredDays)

  const postStatus = controlPreference === 'autopilot' ? 'scheduled'
    : controlPreference === 'suggest' ? 'draft'
    : 'pending_approval'

  const insertPayloads = allPosts.map((post, i) => ({
    user_id: user.id,
    content: post.content,
    content_pillar: post.content_pillar || pillars[i % pillars.length],
    source: 'ai_generated',
    status: postStatus,
    scheduled_at: slots[i]?.toISOString() ?? null,
  }))

  const { data: insertedPosts, error: insertError } = await supabaseAdmin
    .from('posts')
    .insert(insertPayloads)
    .select()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save posts: ' + insertError.message }, { status: 500 })
  }

  // Increment usage: one batch_run + all posts_generated
  await Promise.all([
    incrementUsage(user.id, 'batch_runs'),
    incrementUsage(user.id, 'posts_generated', allPosts.length),
    incrementRateLimit(user.id, 'claude_calls'),
    incrementRateLimit(user.id, 'batch_generation'),
    trackAndCheckSpend('claude_sonnet', user.id, { posts: allPosts.length }),
    supabaseAdmin.from('user_profiles').update({
      posts_used_this_month: (profile.posts_used_this_month || 0) + allPosts.length,
    }).eq('user_id', user.id),
  ])

  const nextScheduled = (insertedPosts || [])
    .filter(p => p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  const nextPostDate = nextScheduled?.scheduled_at
    ? new Date(nextScheduled.scheduled_at).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : null

  return NextResponse.json({
    ok: true,
    postsGenerated: insertedPosts?.length || 0,
    monthName,
    nextPostDate,
    controlPreference,
  })
}
