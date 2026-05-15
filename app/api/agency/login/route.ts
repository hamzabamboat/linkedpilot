import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const newHash = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'))
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('id, name, password_hash, is_active')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (!agency) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    if (!agency.is_active) {
      return NextResponse.json({ error: 'Account is deactivated. Contact support.' }, { status: 403 })
    }
    if (!verifyPassword(password, agency.password_hash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true, agencyName: agency.name })
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }
    response.cookies.set('session_agency_id', agency.id, cookieOpts)
    // Clear any existing user session
    response.cookies.delete('session_user_id')
    response.cookies.delete('sub_status')
    response.cookies.delete('agency_mode')
    return response
  } catch (err) {
    console.error('[agency/login]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
