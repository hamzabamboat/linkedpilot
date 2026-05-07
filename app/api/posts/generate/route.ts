import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/anthropic'
import { getTrendsForProfile } from '@/lib/trends'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 400 })

  // Check post limit
  const postsUsed = profile.posts_used_this_month || 0
  const postsLimit = profile.posts_limit || 12
  const { data: sub } = await supabaseAdmin.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle()
  const hasActiveSub = sub?.status === 'active'

  if (!hasActiveSub && postsUsed >= 3) {
    return NextResponse.json({ error: 'trial_exhausted' }, { status: 402 })
  }
  if (hasActiveSub && postsUsed >= postsLimit) {
    return NextResponse.json({ error: 'monthly_limit_reached', limit: postsLimit }, { status: 402 })
  }

  const { topic, voiceNoteId, storyBankId, additionalContext } = await request.json()

  // Resolve voice note transcript
  let transcript: string | undefined
  if (voiceNoteId) {
    const { data: note } = await supabaseAdmin.from('voice_notes').select('transcript').eq('id', voiceNoteId).eq('user_id', user.id).single()
    transcript = note?.transcript ?? undefined
  }

  // Resolve story bank text
  let storyText: string | undefined
  if (storyBankId) {
    const { data: story } = await supabaseAdmin.from('story_bank').select('raw_text').eq('id', storyBankId).eq('user_id', user.id).single()
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
  } catch {}

  const posts = await generateLinkedInPosts({ profile, topic, transcript, storyText, additionalContext, trendingContext, recentTopics })

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

  // Increment counter
  await supabaseAdmin.from('user_profiles').update({ posts_used_this_month: postsUsed + 1 }).eq('user_id', user.id)

  // Mark story as converted
  if (storyBankId) {
    await supabaseAdmin.from('story_bank').update({ status: 'converted' }).eq('id', storyBankId)
  }

  return NextResponse.json({ posts: insertedPosts.filter(Boolean) })
}
