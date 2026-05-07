import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userId = request.cookies.get('session_user_id')?.value

  // Admin protection — check admin_session cookie matches ADMIN_SECRET
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminSession = request.cookies.get('admin_session')?.value
    if (!adminSession || adminSession !== process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  // Only protect dashboard and onboarding
  const isDashboard = pathname.startsWith('/dashboard')
  const isOnboarding = pathname === '/onboarding'

  if (!isDashboard && !isOnboarding) return NextResponse.next()

  // Must be logged in for both
  if (!userId) return NextResponse.redirect(new URL('/', request.url))

  // Onboarding just needs a logged-in user
  if (isOnboarding) return NextResponse.next()

  // Dashboard: check sub, trial, or access_code
  const cachedStatus = request.cookies.get('sub_status')?.value
  if (cachedStatus === 'active' || cachedStatus === 'trial' || cachedStatus === 'access_code') {
    return NextResponse.next()
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: user } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  if (user?.subscription_status === 'access_code') {
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
  const isTrial = sub?.status === 'trial' && !!sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()

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
  matcher: ['/dashboard/:path*', '/onboarding', '/admin/:path*'],
}
