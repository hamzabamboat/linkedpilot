import { NextRequest, NextResponse } from 'next/server'
import { getAgencyFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// GET — initiates LinkedIn OAuth for a specific agency client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.redirect(`${APP_URL}/agency/login`)

  const { clientId } = await params

  // Verify client belongs to this agency
  const { data: clientRow } = await supabaseAdmin
    .from('agency_clients')
    .select('user_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .maybeSingle()

  if (!clientRow) {
    return NextResponse.redirect(`${APP_URL}/agency/dashboard?error=client_not_found`)
  }

  const state = crypto.randomBytes(16).toString('hex')
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', process.env.LINKEDIN_CLIENT_ID!)
  authUrl.searchParams.set('redirect_uri', `${APP_URL}/api/auth/linkedin/callback`)
  authUrl.searchParams.set('state', state)
  // r_member_social is deprecated by LinkedIn — requesting it causes access_denied
  authUrl.searchParams.set('scope', 'openid profile email w_member_social')

  const response = NextResponse.redirect(authUrl.toString())
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 min
  }
  response.cookies.set('linkedin_oauth_state', state, cookieOpts)
  // Tag this as an agency client setup — the callback will read this
  response.cookies.set('agency_oauth_client_user_id', clientRow.user_id, cookieOpts)
  return response
}
