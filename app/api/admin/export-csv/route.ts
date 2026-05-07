import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

function esc(v: unknown): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export async function GET(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [usersRes, postsRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select(`
        id, linkedin_id, linkedin_name, email, subscription_status,
        subscription_count, created_at, updated_at,
        user_profiles(name, plan, posts_used_this_month),
        subscriptions(status)
      `)
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('posts').select('user_id'),
  ])

  const users = usersRes.data || []
  const postCountMap: Record<string, number> = {}
  for (const p of postsRes.data || []) {
    postCountMap[p.user_id] = (postCountMap[p.user_id] || 0) + 1
  }

  const headers = [
    'Name', 'Email', 'LinkedIn ID', 'Plan', 'Subscription Status',
    'Sub Status', 'Joined', 'Posts Total', 'Posts This Month',
    'Subscriptions Count', 'Last Active',
  ]

  const rows = users.map((u: Record<string, unknown>) => {
    const profile = (u.user_profiles as Record<string, unknown>[] | null)?.[0] ?? {}
    const sub = (u.subscriptions as Record<string, unknown>[] | null)?.[0] ?? {}
    return [
      esc((profile.name as string | null) ?? u.linkedin_name),
      esc(u.email),
      esc(u.linkedin_id),
      esc(profile.plan ?? 'starter'),
      esc(u.subscription_status),
      esc(sub.status ?? u.subscription_status),
      esc(u.created_at),
      esc(postCountMap[u.id as string] ?? 0),
      esc(profile.posts_used_this_month ?? 0),
      esc(u.subscription_count ?? 0),
      esc(u.updated_at),
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="personalink-users-${date}.csv"`,
    },
  })
}
