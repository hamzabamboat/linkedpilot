import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

const PLAN_PRICE: Record<string, number> = { starter: 999, standard: 2500, pro: 5000 }

export async function GET(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [usersRes, postsRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select(`
        id, linkedin_id, linkedin_name, email, subscription_status,
        subscription_count, trial_posts_used, created_at, updated_at,
        user_profiles(plan, posts_used_this_month),
        subscriptions(status, plan_id, start_date, next_billing_date)
      `)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('posts').select('user_id'),
  ])

  const users = usersRes.data || []
  const posts = postsRes.data || []

  // Build post count map
  const postCountMap: Record<string, number> = {}
  for (const p of posts) {
    postCountMap[p.user_id] = (postCountMap[p.user_id] || 0) + 1
  }

  // Flatten user rows
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const rows = users.map((u: Record<string, unknown>) => {
    const profile = (u.user_profiles as Record<string, unknown>[] | null)?.[0] ?? {}
    const sub = (u.subscriptions as Record<string, unknown>[] | null)?.[0] ?? {}
    return {
      id: u.id,
      name: (profile.name as string | null) ?? (u.linkedin_name as string | null) ?? '—',
      email: u.email ?? '—',
      linkedin_id: u.linkedin_id,
      plan: (profile.plan as string | null) ?? 'starter',
      subscription_status: u.subscription_status,
      sub_status: sub.status ?? u.subscription_status,
      subscription_count: u.subscription_count ?? 0,
      joined: u.created_at,
      last_active: u.updated_at,
      posts_total: postCountMap[u.id as string] ?? 0,
      posts_this_month: (profile.posts_used_this_month as number) ?? 0,
    }
  })

  // Revenue summary
  const activeUsers = rows.filter(r => r.subscription_status === 'active')
  const mrr = activeUsers.reduce((sum, r) => sum + (PLAN_PRICE[r.plan] || 0), 0)
  const planBreakdown = { starter: 0, standard: 0, pro: 0 }
  for (const r of activeUsers) {
    if (r.plan in planBreakdown) planBreakdown[r.plan as keyof typeof planBreakdown]++
  }

  const newThisMonth = rows.filter(r => String(r.joined) >= startOfMonth)
  const newSubsThisMonth = newThisMonth.filter(r => r.subscription_status === 'active' || r.subscription_status === 'trialing')
  const churnedThisMonth = rows.filter(
    r => (r.sub_status === 'cancelled' || r.sub_status === 'expired') && String(r.last_active) >= startOfMonth
  )

  return NextResponse.json({
    users: rows,
    revenue: {
      total_active: activeUsers.length,
      mrr,
      plan_breakdown: planBreakdown,
      new_subs_this_month: newSubsThisMonth.length,
      churned_this_month: churnedThisMonth.length,
    },
  })
}
