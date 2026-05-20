import { NextResponse } from 'next/server'

// Google sign-in is disabled — all authentication is via LinkedIn.
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '/'
  return NextResponse.redirect(`${appUrl}?error=use_linkedin`)
}
