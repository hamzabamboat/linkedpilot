import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// Google sign-in is disabled — all authentication is via LinkedIn.
export async function GET(_request: NextRequest) {
  return NextResponse.redirect(`${APP_URL}?error=use_linkedin`)
}
