import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabaseAdmin
      .from('subscriptions')
      .select('status, trial_ends_at, plan_id, next_billing_date')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return NextResponse.json(
    { user, profile, subscription },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } }
  )
}
