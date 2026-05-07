import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { google } from 'googleapis'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  const cron = request.headers.get('authorization')
  return (
    cookie === process.env.ADMIN_SECRET ||
    header === process.env.ADMIN_SECRET ||
    cron === `Bearer ${process.env.CRON_SECRET}`
  )
}

export async function POST(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheetId = process.env.GOOGLE_SHEETS_ID
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!sheetId || !serviceAccountKey) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID or GOOGLE_SERVICE_ACCOUNT_KEY not set' }, { status: 500 })
  }

  // Fetch all user data
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

  const header = [
    'Name', 'Email', 'Plan', 'Status', 'Joined',
    'Posts Total', 'Posts This Month', 'Subscriptions Count', 'Last Active',
  ]

  const rows = users.map((u: Record<string, unknown>) => {
    const profile = (u.user_profiles as Record<string, unknown>[] | null)?.[0] ?? {}
    return [
      String((profile.name as string | null) ?? u.linkedin_name ?? ''),
      String(u.email ?? ''),
      String(profile.plan ?? 'starter'),
      String(u.subscription_status ?? ''),
      String(u.created_at ?? ''),
      String(postCountMap[u.id as string] ?? 0),
      String(profile.posts_used_this_month ?? 0),
      String(u.subscription_count ?? 0),
      String(u.updated_at ?? ''),
    ]
  })

  // Authenticate with Google using service account
  const credentials = JSON.parse(serviceAccountKey)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  // Clear and rewrite the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: 'Sheet1',
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [header, ...rows] },
  })

  return NextResponse.json({ ok: true, rows: rows.length, synced_at: new Date().toISOString() })
}
