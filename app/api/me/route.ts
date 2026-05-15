import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const agencyId = request.cookies.get('agency_mode')?.value

    const [{ data: profile }, { data: subscription }, agencyContext] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin
        .from('subscriptions')
        .select('status, trial_ends_at, plan_id, next_billing_date')
        .eq('user_id', user.id)
        .maybeSingle(),
      agencyId
        ? supabaseAdmin
            .from('agencies')
            .select('id, name')
            .eq('id', agencyId)
            .maybeSingle()
            .then(r => r.data)
        : Promise.resolve(null),
    ])

    // When in agency mode, also fetch the client display name
    let agencyClientName: string | null = null
    if (agencyId) {
      const { data: clientRow } = await supabaseAdmin
        .from('agency_clients')
        .select('client_name')
        .eq('agency_id', agencyId)
        .eq('user_id', user.id)
        .maybeSingle()
      agencyClientName = clientRow?.client_name ?? null
    }

    return NextResponse.json(
      {
        user,
        profile,
        subscription,
        agencyMode: agencyContext
          ? { agencyId: agencyContext.id, agencyName: agencyContext.name, clientName: agencyClientName }
          : null,
      },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } }
    )
  } catch (err) {
    console.error('[me]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
