import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('session_user_id', '', { maxAge: 0, path: '/' })
  response.cookies.set('sub_status', '', { maxAge: 0, path: '/' })
  response.cookies.set('used_code', '', { maxAge: 0, path: '/' })
  response.cookies.set('agency_mode', '', { maxAge: 0, path: '/' })
  return response
}
