import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

function requireAdmin(request: NextRequest) {
  const session = request.cookies.get('admin_session')?.value
  return session && session === process.env.ADMIN_SECRET
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

// GET — list all agencies
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: agencies, error } = await supabaseAdmin
    .from('agencies')
    .select('id, name, email, seat_limit, notes, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load agencies' }, { status: 500 })
  }

  // Get seat usage counts
  const agencyIds = agencies?.map(a => a.id) ?? []
  const { data: seatCounts } = await supabaseAdmin
    .from('agency_clients')
    .select('agency_id')
    .in('agency_id', agencyIds)
    .eq('is_active', true)

  const countMap: Record<string, number> = {}
  seatCounts?.forEach(r => {
    countMap[r.agency_id] = (countMap[r.agency_id] ?? 0) + 1
  })

  const result = agencies?.map(a => ({ ...a, seats_used: countMap[a.id] ?? 0 }))
  return NextResponse.json({ agencies: result })
}

// POST — create a new agency
export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, password, seatLimit, notes } = await request.json()
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { data: agency, error } = await supabaseAdmin
    .from('agencies')
    .insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: hashPassword(password),
      seat_limit: seatLimit ?? 5,
      notes: notes?.trim() || null,
    })
    .select('id, name, email, seat_limit, notes, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'An agency with this email already exists' }, { status: 409 })
    }
    console.error('[admin/agencies POST]', error)
    return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 })
  }

  return NextResponse.json({ agency }, { status: 201 })
}
