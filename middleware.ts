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

// Hard limit: if more than this many redirects happen in REDIRECT_WINDOW_SECS,
// something is badly wrong — break the loop unconditionally.
const MAX_REDIRECT_COUNT  = 4
const REDIRECT_WINDOW_SECS = 10

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userId   = request.cookies.get('session_user_id')?.value
  const agencyId = request.cookies.get('session_agency_id')?.value

  // ── Redirect loop guard ────────────────────────────────────────────────────
  // _redir_n is a short-lived cookie (REDIRECT_WINDOW_SECS) that counts
  // consecutive redirects. If we hit MAX_REDIRECT_COUNT, wipe auth state and
  // send to the homepage. This is the nuclear fallback — normal paths should
  // never come close to triggering it.
  const redirCount = parseInt(request.cookies.get('_redir_n')?.value ?? '0', 10)
  if (redirCount >= MAX_REDIRECT_COUNT) {
    const res = NextResponse.redirect(new URL('/', request.url))
    for (const name of ['session_user_id', 'sub_status', 'trial_ends_at', 'used_code', '_redir_n']) {
      res.cookies.delete(name)
    }
    return res
  }

  // Every redirect goes through this helper so the counter always increments.
  // When the user reaches a page without being redirected the cookie expires
  // naturally after REDIRECT_WINDOW_SECS seconds — no cleanup needed.
  function redirect(destination: string | URL) {
    const url = typeof destination === 'string'
      ? new URL(destination, request.url)
      : destination
    const res = NextResponse.redirect(url)
    res.cookies.set('_redir_n', String(redirCount + 1), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   REDIRECT_WINDOW_SECS,
    })
    return res
  }

  // ── Always allow public auth API paths ─────────────────────────────────────
  if (PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Block known malicious bots on API routes ───────────────────────────────
  if (pathname.startsWith('/api/')) {
    const ua = request.headers.get('user-agent') ?? ''
    if (!ua || BOT_UA_PATTERNS.some(p => p.test(ua))) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // ── Admin protection ───────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminSession = request.cookies.get('admin_session')?.value
    if (!adminSession || adminSession !== process.env.ADMIN_SECRET) {
      return redirect('/admin/login')
    }
    return NextResponse.next()
  }

  // ── Agency area protection ─────────────────────────────────────────────────
  if (pathname.startsWith('/agency') && pathname !== '/agency/login') {
    if (!agencyId) {
      return redirect('/agency/login')
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: agency, error: agencyErr } = await supabase
      .from('agencies')
      .select('is_active')
      .eq('id', agencyId)
      .maybeSingle()

    // DB error — be permissive rather than locking the agency out
    if (agencyErr) return NextResponse.next()

    if (!agency || !agency.is_active) {
      const res = redirect('/agency/login')
      res.cookies.delete('session_agency_id')
      res.cookies.delete('session_user_id')
      res.cookies.delete('agency_mode')
      return res
    }
    return NextResponse.next()
  }

  const country = request.headers.get('x-vercel-ip-country') ?? 'IN'

  // ── Redirect logged-in users away from public entry points (/ and /upgrade) ─
  const isPublicPage = pathname === '/' || pathname === '/upgrade'

  if (isPublicPage && userId) {
    const cachedStatus   = request.cookies.get('sub_status')?.value
    const trialEndsAtRaw = request.cookies.get('trial_ends_at')?.value

    // active / access_code: trust the cache (active has a 1-hour TTL)
    if (cachedStatus === 'active' || cachedStatus === 'access_code') {
      return redirect('/dashboard')
    }

    // trial: ONLY trust the cache if trial_ends_at is set AND still in the future.
    // Without this check a stale 'trial' cookie would keep bouncing an expired-trial
    // user from /upgrade back to /dashboard.
    if (cachedStatus === 'trial') {
      if (trialEndsAtRaw && new Date(trialEndsAtRaw) > new Date()) {
        return redirect('/dashboard')
      }
      // Trial has expired per the cached date — fall through to DB check
    }

    // No valid cached status — do a quick DB check
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single()

    if (userErr) {
      // Supabase hiccup — don't clear the session; just let them see the page.
      // If we cleared the cookie here, the next request would lack a session,
      // potentially causing a redirect chain.
      const res = NextResponse.next()
      if (!request.cookies.get('user_country')) {
        res.cookies.set('user_country', country, { maxAge: 60 * 60 * 24 * 30, path: '/' })
      }
      return res
    }

    if (!userRow) {
      // Stale session cookie (user row deleted) — clear it so they see the page
      // cleanly. Without this the middleware would redirect to /upgrade, which
      // would redirect back to / → infinite loop.
      const res = NextResponse.next()
      for (const name of ['session_user_id', 'sub_status', 'trial_ends_at', 'used_code']) {
        res.cookies.delete(name)
      }
      return res
    }

    if (userRow.subscription_status === 'access_code') {
      return redirect('/dashboard')
    }

    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('user_id', userId)
      .maybeSingle()

    const hasAccess =
      subRow?.status === 'active' ||
      (
        (subRow?.status === 'trial' || subRow?.status === 'trialing') &&
        !!subRow.trial_ends_at &&
        new Date(subRow.trial_ends_at) > new Date()
      )

    if (hasAccess) {
      return redirect('/dashboard')
    }

    // Logged in but no active subscription
    if (pathname === '/') {
      return redirect('/upgrade')
    }
    // pathname === '/upgrade' — fall through to NextResponse.next() below
  }

  // ── Only protect /dashboard and /onboarding ────────────────────────────────
  const isDashboard  = pathname.startsWith('/dashboard')
  const isOnboarding = pathname === '/onboarding'

  if (!isDashboard && !isOnboarding) {
    const res = NextResponse.next()
    if (!request.cookies.get('user_country')) {
      res.cookies.set('user_country', country, { maxAge: 60 * 60 * 24 * 30, path: '/' })
    }
    return res
  }

  // ── Agency managing a client ───────────────────────────────────────────────
  const agencyMode = request.cookies.get('agency_mode')?.value
  if (agencyMode && userId) {
    return NextResponse.next()
  }

  // ── Bypass subscription check in local development ─────────────────────────
  if (process.env.NODE_ENV === 'development' && userId) {
    return NextResponse.next()
  }

  // ── Must be logged in ──────────────────────────────────────────────────────
  if (!userId) return redirect('/')

  // ── Onboarding just needs a session ───────────────────────────────────────
  if (isOnboarding) {
    const res = NextResponse.next()
    if (!request.cookies.get('user_country')) {
      res.cookies.set('user_country', country, { maxAge: 60 * 60 * 24 * 30, path: '/' })
    }
    return res
  }

  // ── Dashboard: full subscription check ────────────────────────────────────
  const cachedStatus   = request.cookies.get('sub_status')?.value
  const trialEndsAtRaw  = request.cookies.get('trial_ends_at')?.value
  const usedCode       = request.cookies.get('used_code')?.value

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Access-code fast path — validate the code is still active
  if (cachedStatus === 'access_code' && usedCode) {
    const { data: codeRow, error: codeErr } = await supabase
      .from('access_codes')
      .select('is_active')
      .eq('code', usedCode)
      .maybeSingle()

    if (codeErr) return NextResponse.next() // DB error — be permissive

    if (!codeRow || !codeRow.is_active) {
      const res = redirect('/?deactivated=1')
      for (const name of ['session_user_id', 'sub_status', 'trial_ends_at', 'used_code']) {
        res.cookies.delete(name)
      }
      return res
    }
    return NextResponse.next()
  }

  // Active subscription cache (1-hour TTL refreshed below)
  if (cachedStatus === 'active') {
    return NextResponse.next()
  }

  // Trial cache — ONLY trust it if trial_ends_at confirms it's still live.
  // This is the key guard that prevents a stale 'trial' cookie from letting an
  // expired-trial user bypass the DB check and linger on the dashboard.
  if (cachedStatus === 'trial') {
    if (trialEndsAtRaw && new Date(trialEndsAtRaw) > new Date()) {
      return NextResponse.next()
    }
    // Expired (or no trial_ends_at stored) — fall through to DB check
  }

  // DB check — both cookies were either missing or stale
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  // DB error — be permissive rather than redirecting and potentially looping
  if (userErr) return NextResponse.next()

  if (user?.subscription_status === 'access_code') {
    if (usedCode) {
      const { data: codeRow, error: codeErr } = await supabase
        .from('access_codes')
        .select('is_active')
        .eq('code', usedCode)
        .maybeSingle()

      if (codeErr) return NextResponse.next()

      if (!codeRow || !codeRow.is_active) {
        const res = redirect('/?deactivated=1')
        for (const name of ['session_user_id', 'sub_status', 'trial_ends_at', 'used_code']) {
          res.cookies.delete(name)
        }
        return res
      }
    }
    const res = NextResponse.next()
    res.cookies.set('sub_status', 'access_code', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 30,
    })
    return res
  }

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  // DB error — be permissive
  if (subErr) return NextResponse.next()

  const hasActiveSub = sub?.status === 'active'
  const isTrial      =
    (sub?.status === 'trial' || sub?.status === 'trialing') &&
    !!sub.trial_ends_at &&
    new Date(sub.trial_ends_at) > new Date()
  // Only grant a brief grace period when returning from the payment provider
  // (return_url includes ?upgraded=1). Direct navigation to /dashboard never
  // gets this window, so clicking "Start Free Trial" then abandoning checkout
  // cannot be used to bypass the paywall.
  const isPaymentPending =
    sub?.status === 'created' &&
    !!sub.updated_at &&
    Date.now() - new Date(sub.updated_at).getTime() < 2 * 60 * 1000 &&
    request.nextUrl.searchParams.get('upgraded') === '1'

  if (!hasActiveSub && !isTrial && !isPaymentPending) {
    // No valid subscription — send to the upgrade page.
    // CRITICAL: delete the cached status cookies so /upgrade doesn't read a
    // stale 'trial' or 'active' value and immediately bounce the user back to
    // /dashboard, which would redirect to /upgrade again → redirect loop.
    const res = redirect('/upgrade')
    res.cookies.delete('sub_status')
    res.cookies.delete('trial_ends_at')
    return res
  }

  // Valid subscription — let through and refresh the cache
  const res = NextResponse.next()
  if (!request.cookies.get('user_country')) {
    res.cookies.set('user_country', country, { maxAge: 60 * 60 * 24 * 30, path: '/' })
  }
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
  }
  if (hasActiveSub) {
    // 1-hour TTL: cancelled subscriptions become inaccessible within 1 hour
    res.cookies.set('sub_status', 'active', { ...cookieOpts, maxAge: 60 * 60 })
  } else if (isTrial) {
    res.cookies.set('sub_status', 'trial', { ...cookieOpts, maxAge: 60 * 60 * 24 * 8 })
    // Also persist the expiry date so future requests can validate the trial
    // without a DB round-trip, and without risk of a stale-cache bounce loop
    if (sub?.trial_ends_at) {
      res.cookies.set('trial_ends_at', sub.trial_ends_at, { ...cookieOpts, maxAge: 60 * 60 * 24 * 8 })
    }
  }
  return res
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/onboarding', '/upgrade', '/admin/:path*', '/agency/:path*'],
}
