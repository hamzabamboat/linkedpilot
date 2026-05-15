// IMPORTANT — LinkedIn Developer Portal setup required:
// Your app needs TWO products enabled:
//   1. "Sign In with LinkedIn using OpenID Connect" → gives openid, profile, email scopes
//   2. "Share on LinkedIn" → gives w_member_social scope
// Add both at: https://www.linkedin.com/developers/apps → Your App → Products
// Without the OIDC product, LinkedIn rejects the openid/profile/email scopes → error=access_denied

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`
  const scope = 'openid profile email w_member_social r_member_social'
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 min to complete OAuth
    path: '/',
  })

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
