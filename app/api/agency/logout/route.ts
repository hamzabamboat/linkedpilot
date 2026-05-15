import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('session_agency_id')
  response.cookies.delete('session_user_id')
  response.cookies.delete('sub_status')
  response.cookies.delete('agency_mode')
  return response
}
