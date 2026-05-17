import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendWelcomeEmail } from '@/lib/email'
import { runProfileAnalysis } from '@/lib/profile-analyzer'
import { TRIAL_DAYS } from '@/lib/razorpay'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // LinkedIn sends error before we can read the state cookie — clear it anyway
  const clearState = (res: NextResponse) => {
    res.cookies.delete('linkedin_oauth_state')
    return res
  }

  if (error) {
    console.error('[linkedin/callback] LinkedIn error:', error, errorDescription)
    // access_denied = user cancelled OR missing OIDC/Share products in LinkedIn app
    const reason = error === 'access_denied' ? 'scope_denied' : 'linkedin_denied'
    return clearState(NextResponse.redirect(`${APP_URL}/?error=${reason}`))
  }

  // Verify state to prevent CSRF
  const storedState = request.cookies.get('linkedin_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    console.error('[linkedin/callback] state mismatch — stored:', storedState, 'got:', state)
    return clearState(NextResponse.redirect(`${APP_URL}/?error=state_mismatch`))
  }

  if (!code) {
    return clearState(NextResponse.redirect(`${APP_URL}/?error=no_code`))
  }

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${APP_URL}/api/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text()
      console.error('[linkedin/callback] token exchange failed:', tokenResponse.status, body)
      throw new Error(`Token exchange HTTP ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      console.error('[linkedin/callback] no access_token in response:', tokenData)
      throw new Error('No access token returned')
    }

    const accessToken = tokenData.access_token
    // LinkedIn tokens expire in 60 days; fall back to that if expires_in is missing
    const expiresInMs = (tokenData.expires_in ?? 5184000) * 1000
    const expiresAt = new Date(Date.now() + expiresInMs)

    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileResponse.ok) {
      throw new Error(`Profile fetch failed: ${profileResponse.status}`)
    }

    const profile = await profileResponse.json()

    // Agency client LinkedIn setup: link credentials to existing client user record
    const agencyClientUserId = request.cookies.get('agency_oauth_client_user_id')?.value
    if (agencyClientUserId) {
      await supabaseAdmin
        .from('users')
        .update({
          linkedin_id: profile.sub,
          linkedin_name: profile.name,
          email: profile.email ?? undefined,
          linkedin_picture: profile.picture ?? undefined,
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', agencyClientUserId)

      await supabaseAdmin
        .from('user_profiles')
        .update({ name: profile.name })
        .eq('user_id', agencyClientUserId)

      const response = NextResponse.redirect(`${APP_URL}/agency/dashboard?linked=1`)
      response.cookies.delete('agency_oauth_client_user_id')
      response.cookies.delete('linkedin_oauth_state')
      return response
    }

    const isNew = !(await supabaseAdmin
      .from('users')
      .select('id')
      .eq('linkedin_id', profile.sub)
      .maybeSingle()
      .then(r => r.data))

    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          linkedin_id: profile.sub,
          linkedin_name: profile.name,
          email: profile.email,
          linkedin_picture: profile.picture,
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'linkedin_id' }
      )
      .select()
      .single()

    if (dbError) throw dbError

    if (isNew && user.email) {
      sendWelcomeEmail({ to: user.email, userName: user.linkedin_name || 'there' }).catch(
        console.error
      )
    }

    // Run profile analysis in background (don't await — shouldn't block redirect)
    runProfileAnalysis(user.id).catch(console.error)

    // Upsert the personal linkedin_account record.
    // Grant a trial only if this user has no other accounts yet (first account ever).
    const { count: existingAccountCount } = await supabaseAdmin
      .from('linkedin_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const isFirstAccount = (existingAccountCount ?? 0) === 0
    const personalAccountStatus = isFirstAccount ? 'trialing' : 'inactive'

    await supabaseAdmin
      .from('linkedin_accounts')
      .upsert(
        {
          user_id: user.id,
          account_type: 'personal',
          linkedin_id: profile.sub,
          name: profile.name,
          picture_url: profile.picture ?? null,
          // Only set status on insert; don't overwrite an existing active/paid status
          subscription_status: personalAccountStatus,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,linkedin_id',
          ignoreDuplicates: true, // preserve existing subscription_status on re-login
        }
      )

    // Fetch the account row to get its ID for the subscriptions table
    const { data: accountRow } = await supabaseAdmin
      .from('linkedin_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('linkedin_id', profile.sub)
      .single()

    // For new users: create a trial subscription row so the middleware can
    // verify trial validity via trial_ends_at. Without this row the user
    // gets redirected to /upgrade immediately after sign-up.
    if (isFirstAccount && accountRow) {
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: user.id,
            account_id: accountRow.id,
            status: 'trialing',
            trial_ends_at: trialEndsAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
    }

    // Check existing subscription to set the sub_status cookie
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    // Check if user has completed onboarding
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('onboarding_completed_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const redirectTo = isNew || !existingProfile?.onboarding_completed_at
      ? `${APP_URL}/onboarding`
      : `${APP_URL}/dashboard`

    const response = NextResponse.redirect(redirectTo)
    response.cookies.set('session_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }
    if (sub?.status === 'active') {
      response.cookies.set('sub_status', 'active', { ...cookieOpts, maxAge: 60 * 60 })
    } else if (
      (sub?.status === 'trial' || sub?.status === 'trialing') &&
      sub.trial_ends_at &&
      new Date(sub.trial_ends_at) > new Date()
    ) {
      response.cookies.set('sub_status', 'trial', { ...cookieOpts, maxAge: 60 * 60 * 24 * 8 })
    }
    response.cookies.delete('linkedin_oauth_state')
    return response
  } catch (err) {
    console.error('[linkedin/callback] unhandled error:', err)
    const res = NextResponse.redirect(`${APP_URL}/?error=oauth_failed`)
    res.cookies.delete('linkedin_oauth_state')
    res.cookies.delete('agency_oauth_client_user_id')
    return res
  }
}
