import { NextRequest, NextResponse } from 'next/server'
import { getAgencyFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// POST { clientId } — switch to managing a specific client
// POST {} / no clientId — exit client mode back to agency dashboard
export async function POST(request: NextRequest) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { clientId } = body

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }

  // Exit client mode
  if (!clientId) {
    const response = NextResponse.json({ ok: true, redirect: '/agency/dashboard' })
    response.cookies.delete('session_user_id')
    response.cookies.delete('sub_status')
    response.cookies.delete('agency_mode')
    return response
  }

  // Verify the client belongs to this agency
  const { data: clientRow } = await supabaseAdmin
    .from('agency_clients')
    .select('user_id, client_name')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const response = NextResponse.json({ ok: true, redirect: '/dashboard' })
  // Set the active client as the session user
  response.cookies.set('session_user_id', clientRow.user_id, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 })
  // Mark as active so middleware lets them through without subscription check
  response.cookies.set('sub_status', 'active', { ...cookieOpts, maxAge: 60 * 60 * 24 })
  // Track which agency is operating (used by /api/me to show the banner)
  response.cookies.set('agency_mode', agency.id, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 })
  return response
}
