import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BOT_UA_PATTERNS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /burpsuite/i,
  /python-requests\/[0-9]/i, /go-http-client\/[0-9]/i,
]

const PUBLIC_API_PATHS = [
  '/api/auth/linkedin',
  '/api/auth/linkedin/callback',
  '/api/auth/google',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/agency/login',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userId = request.cookies.get('session_user_id')?.value
  const agencyId = request.cookies.get('session_agency_id')?.value

  // Always allow public auth API paths
  if (PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Block known malicious bots on API routes
  if (pathname.startsWith('/api/')) {
    const ua = request.headers.get('user-agent') ?? ''
    if (!ua || BOT_UA_PATTERNS.some(p => p.test(ua))) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // Admin protection — check admin_session cookie matches ADMIN_SECRET
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminSession = request.cookies.get('admin_session')?.value
    if (!adminSession || adminSession !== process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  // Agency area protection — require session_agency_id
  if (pathname.startsWith('/agency') && pathname !== '/agency/login') {
    if (!agencyId) {
      return NextResponse.redirect(new URL('/agency/login', request.url))
    }
    // Verify agency is still active
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: agency } = await supabase
      .from('agencies')
      .select('is_active')
      .eq('id', agencyId)
      .maybeSingle()
    if (!agency || !agency.is_active) {
      const response = NextResponse.redirect(new URL('/agency/login', request.url))
      response.cookies.delete('session_agency_id')
      response.cookies.delete('session_user_id')
      response.cookies.delete('agency_mode')
      return response
    }
    return NextResponse.next()
  }

  const country = request.headers.get('x-vercel-ip-country') ?? 'IN'

  // Redirect logged-in users away from public entry points
  const isPublicPage = pathname === '/' || pathname === '/upgrade'
  if (isPublicPage && userId) {
    // Check if they have any subscription access before bouncing to dashboard
    const cachedStatus = request.cookies.get('sub_status')?.value
    if (cachedStatus === 'active' || cachedStatus === 'trial' || cachedStatus === 'access_code') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // No cached status — do a quick DB check
    const supabaseQuick = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: userRow } = await supabaseQuick
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single()
    if (!userRow) {
      // Stale/invalid session cookie — clear it and let them see the public page
      // Without this, the middleware would redirect to /upgrade, and the upgrade
      // page would redirect back to /, creating an infinite redirect loop.
      const res = NextResponse.next()
      res.cookies.delete('session_user_id')
      res.cookies.delete('sub_status')
      res.cookies.delete('used_code')
      return res
    }
    if (userRow.subscription_status === 'access_code') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    const { data: subRow } = await supabaseQuick
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('user_id', userId)
      .maybeSingle()
    const hasAccess =
      subRow?.status === 'active' ||
      ((subRow?.status === 'trial' || subRow?.status === 'trialing') &&
        !!subRow.trial_ends_at &&
        new Date(subRow.trial_ends_at) > new Date())
    if (hasAccess) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Logged in but no active subscription — let them see the upgrade page
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/upgrade', request.url))
    }
  }

  // Only protect dashboard and onboarding
  const isDashboard = pathname.startsWith('/dashboard')
  const isOnboarding = pathname === '/onboarding'

  if (!isDashboard && !isOnboarding) {
    const res = NextResponse.next()
    if (!request.cookies.get('user_country')) {
      res.cookies.set('user_country', country, { maxAge: 60 * 60 * 24 * 30, path: '/' })
    }
    return res
  }

  // Agency managing a client — agency_mode cookie + session_user_id (the client) is set
  // sub_status is pre-set to 'active' when switching to a client, so let it through
  const agencyMode = request.cookies.get('agency_mode')?.value
  if (agencyMode && userId) {
    return NextResponse.next()
  }

  // Bypass subscription check in local development
  if (process.env.NODE_ENV === 'development' && userId) {
    return NextResponse.next()
  }

  // Must be logged in for both
  if (!userId) return NextResponse.redirect(new URL('/', request.url))

  // Onboarding just needs a logged-in user
  if (isOnboarding) {
    const res = NextResponse.next()
    if (!request.cookies.get('user_country')) {
      res.cookies.set('user_country', country, { maxAge: 60 * 60 * 24 * 30, path: '/' })
    }
    return res
  }

  // Dashboard: check sub, trial, or access_code
  const cachedStatus = request.cookies.get('sub_status')?.value
  const usedCode = request.cookies.get('used_code')?.value

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // If user has an access_code session, verify the code is still active
  if (cachedStatus === 'access_code' && usedCode) {
    const { data: codeRow } = await supabase
      .from('access_codes')
      .select('is_active')
      .eq('code', usedCode)
      .maybeSingle()
    if (!codeRow || !codeRow.is_active) {
      const response = NextResponse.redirect(new URL('/?deactivated=1', request.url))
      response.cookies.delete('session_user_id')
      response.cookies.delete('sub_status')
      response.cookies.delete('used_code')
      return response
    }
    return NextResponse.next()
  }

  if (cachedStatus === 'active' || cachedStatus === 'trial') {
    return NextResponse.next()
  }

  const { data: user } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  if (user?.subscription_status === 'access_code') {
    if (usedCode) {
      const { data: codeRow } = await supabase
        .from('access_codes')
        .select('is_active')
        .eq('code', usedCode)
        .maybeSingle()
      if (!codeRow || !codeRow.is_active) {
        const response = NextResponse.redirect(new URL('/?deactivated=1', request.url))
        response.cookies.delete('session_user_id')
        response.cookies.delete('sub_status')
        response.cookies.delete('used_code')
        return response
      }
    }
    const response = NextResponse.next()
    response.cookies.set('sub_status', 'access_code', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle()

  const hasActiveSub = sub?.status === 'active'
  const isTrial = (sub?.status === 'trial' || sub?.status === 'trialing') && !!sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()

  if (!hasActiveSub && !isTrial) {
    return NextResponse.redirect(new URL('/upgrade', request.url))
  }

  const response = NextResponse.next()
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
  if (hasActiveSub) {
    response.cookies.set('sub_status', 'active', { ...cookieOpts, maxAge: 60 * 60 })
  } else if (isTrial) {
    response.cookies.set('sub_status', 'trial', { ...cookieOpts, maxAge: 60 * 60 * 24 * 8 })
  }
  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/onboarding', '/upgrade', '/admin/:path*', '/agency/:path*'],
}
