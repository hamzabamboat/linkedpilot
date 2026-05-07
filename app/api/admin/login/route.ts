import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { secret } = await request.json()
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_session', process.env.ADMIN_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
