import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTokenExpired } from '@/lib/linkedin-api'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('linkedin_access_token, linkedin_token_expires_at')
    .eq('id', user.id)
    .single()

  if (!userData?.linkedin_access_token || isTokenExpired(userData.linkedin_token_expires_at)) {
    return NextResponse.json({ error: 'LinkedIn token expired. Please log out and reconnect LinkedIn.' }, { status: 403 })
  }

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, linkedin_post_id')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .not('linkedin_post_id', 'is', null)
    .limit(50)

  if (!posts?.length) {
    return NextResponse.json({ synced: 0, message: 'No published posts with LinkedIn IDs found.' })
  }

  let synced = 0
  let failed = 0
  let scopeError = false

  for (const post of posts) {
    try {
      const encodedUrn = encodeURIComponent(post.linkedin_post_id!)

      // Use the Share Statistics API for impressions, likes, comments, clicks
      const statsRes = await fetch(
        `https://api.linkedin.com/v2/shareStatistics?q=shares&shares[0]=${encodedUrn}`,
        {
          headers: {
            Authorization: `Bearer ${userData.linkedin_access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (statsRes.status === 403) {
        scopeError = true
        // Fall back to socialActions endpoint for reactions only
        const actionsRes = await fetch(
          `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
          {
            headers: {
              Authorization: `Bearer ${userData.linkedin_access_token}`,
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        )

        if (!actionsRes.ok) {
          failed++
          continue
        }

        const actionsData = await actionsRes.json()
        const reactions = actionsData.likesSummary?.totalLikes ?? null
        const comments = actionsData.commentsSummary?.totalFirstLevelComments ?? null

        if (reactions !== null) {
          await supabaseAdmin
            .from('posts')
            .update({ reactions, ...(comments !== null && { comments }) })
            .eq('id', post.id)
          synced++
        }
        continue
      }

      if (!statsRes.ok) {
        failed++
        continue
      }

      const statsData = await statsRes.json()
      const stat = statsData.elements?.[0]?.shareStatistics

      if (!stat) {
        failed++
        continue
      }

      const reactions = stat.likeCount ?? stat.likesSummary?.totalLikes ?? stat.likesSummary?.aggregatedTotalLikes ?? null
      const impressions = stat.impressionCount ?? null
      const comments = stat.commentCount ?? null

      await supabaseAdmin
        .from('posts')
        .update({
          ...(reactions !== null && { reactions }),
          ...(impressions !== null && { impressions }),
          ...(comments !== null && { comments }),
        })
        .eq('id', post.id)
      synced++
    } catch {
      failed++
    }
  }

  const message =
    failed > 0
      ? `Synced ${synced} of ${posts.length} posts (${failed} failed — LinkedIn may have rejected those URNs)`
      : `Synced ${synced} of ${posts.length} posts`

  return NextResponse.json({
    synced,
    failed,
    total: posts.length,
    message,
    ...(scopeError && {
      warning: 'Impression data unavailable — reconnect LinkedIn to grant full analytics access.',
    }),
  })
}
