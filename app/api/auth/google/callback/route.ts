import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const clearState = (res: NextResponse) => {
    res.cookies.delete('google_oauth_state')
    return res
  }

  if (error) {
    console.error('[google/callback] OAuth error:', error)
    return clearState(NextResponse.redirect(`${APP_URL}/?error=google_denied`))
  }

  const storedState = request.cookies.get('google_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    console.error('[google/callback] state mismatch — stored:', storedState, 'got:', state)
    return clearState(NextResponse.redirect(`${APP_URL}/?error=state_mismatch`))
  }

  if (!code) {
    return clearState(NextResponse.redirect(`${APP_URL}/?error=no_code`))
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      console.error('[google/callback] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set')
      throw new Error('Google OAuth is not configured on this server')
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text()
      console.error('[google/callback] token exchange failed:', tokenResponse.status, body)
      throw new Error(`Token exchange HTTP ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      console.error('[google/callback] no access_token in response:', tokenData)
      throw new Error('No access token from Google')
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!profileResponse.ok) {
      throw new Error(`Google profile fetch failed: ${profileResponse.status}`)
    }

    const profile = await profileResponse.json()

    // First try to find by google_id
    let { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('google_id', profile.sub)
      .maybeSingle()

    // If not found by google_id, find by email (user may have signed up via LinkedIn)
    if (!existingUser && profile.email) {
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', profile.email)
        .maybeSingle()

      if (userByEmail) {
        // Link Google account to existing user
        await supabaseAdmin
          .from('users')
          .update({ google_id: profile.sub, updated_at: new Date().toISOString() })
          .eq('id', userByEmail.id)
        existingUser = userByEmail
      }
    }

    let userId: string

    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          google_id: profile.sub,
          auth_provider: 'google',
          email: profile.email,
          linkedin_name: profile.name,
          linkedin_picture: profile.picture,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      userId = newUser.id
    } else {
      userId = existingUser.id
    }

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('onboarding_completed_at')
      .eq('user_id', userId)
      .maybeSingle()

    const redirectTo = !userProfile?.onboarding_completed_at
      ? `${APP_URL}/onboarding`
      : `${APP_URL}/dashboard`

    const response = NextResponse.redirect(redirectTo)
    response.cookies.set('session_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    response.cookies.delete('google_oauth_state')
    return response
  } catch (err) {
    console.error('[google/callback] unhandled error:', err)
    const res = NextResponse.redirect(`${APP_URL}/?error=google_failed`)
    res.cookies.delete('google_oauth_state')
    return res
  }
}
