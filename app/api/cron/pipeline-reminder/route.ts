// Vercel cron — runs every Thursday at 10am UTC (see vercel.json)
// Sends a reminder to standard/pro users whose post queue is running low (< 3 upcoming posts).
// At most one reminder per user per week (enforced via last_pipeline_reminder_sent_at).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendPipelineReminderEmail } from '@/lib/email'
import crypto from 'crypto'

const LOW_QUEUE_THRESHOLD = 3

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Idempotency lock
  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'pipeline-reminder', run_date: today, lock_id: lockId })
  if (lockError) {
    return NextResponse.json({ skipped: true, reason: 'already_ran_today', date: today })
  }

  // Fetch standard/pro users with an active or trialing subscription and an email address
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, linkedin_name, subscription_status')
    .not('email', 'is', null)
    .in('subscription_status', ['active', 'trialing'])

  if (error) {
    console.error('Pipeline reminder: failed to fetch users', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()

  const results = await Promise.allSettled(
    (users ?? []).map(async (user) => {
      if (!user.email) return { id: user.id, skipped: 'no_email' }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('plan, posts_used_this_month, posts_limit, last_pipeline_reminder_sent_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile) return { id: user.id, skipped: 'no_profile' }

      // Only standard and pro plans
      if (!['standard', 'pro'].includes(profile.plan ?? '')) {
        return { id: user.id, skipped: 'starter_plan' }
      }

      // Throttle: skip if a reminder was sent within the last 6 days
      if (
        profile.last_pipeline_reminder_sent_at &&
        profile.last_pipeline_reminder_sent_at > sixDaysAgo
      ) {
        return { id: user.id, skipped: 'recently_reminded' }
      }

      // Count upcoming posts in the pipeline
      const { count: upcomingCount, error: countError } = await supabaseAdmin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'pending_approval', 'approved'])
        .gt('scheduled_at', new Date().toISOString())

      if (countError) return { id: user.id, skipped: 'count_error', reason: countError.message }

      const upcoming = upcomingCount ?? 0
      if (upcoming >= LOW_QUEUE_THRESHOLD) {
        return { id: user.id, skipped: 'queue_healthy', upcoming }
      }

      await sendPipelineReminderEmail({
        to: user.email,
        userName: user.linkedin_name || 'there',
        upcomingCount: upcoming,
        postsUsed: profile.posts_used_this_month ?? 0,
        postsLimit: profile.posts_limit ?? 12,
        plan: profile.plan ?? 'standard',
      })

      await supabaseAdmin
        .from('user_profiles')
        .update({ last_pipeline_reminder_sent_at: new Date().toISOString() })
        .eq('user_id', user.id)

      return { id: user.id, sent: true, upcoming }
    })
  )

  const summary = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { id: users![i].id, error: String(r.reason) }
  )

  const sent = summary.filter(r => r && 'sent' in r && r.sent).length
  console.log(`Pipeline reminder: ${sent}/${users?.length} emails sent`)

  await supabaseAdmin
    .from('cron_locks')
    .update({ completed_at: new Date().toISOString() })
    .eq('lock_id', lockId)

  return NextResponse.json({ sent, total: users?.length, results: summary })
}

export { handler as GET, handler as POST }
