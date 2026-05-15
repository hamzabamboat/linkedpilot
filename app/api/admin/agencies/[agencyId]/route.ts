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

// PATCH — update seat limit, active status, name, or reset password
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { agencyId } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.seatLimit !== undefined) updates.seat_limit = Number(body.seatLimit)
  if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive)
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    updates.password_hash = hashPassword(body.password)
  }

  const { data: agency, error } = await supabaseAdmin
    .from('agencies')
    .update(updates)
    .eq('id', agencyId)
    .select('id, name, email, seat_limit, notes, is_active, created_at')
    .single()

  if (error) {
    console.error('[admin/agencies PATCH]', error)
    return NextResponse.json({ error: 'Failed to update agency' }, { status: 500 })
  }

  return NextResponse.json({ agency })
}

// DELETE — permanently remove an agency and all its client links
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { agencyId } = await params

  // agency_clients rows cascade-delete via FK, but let's be explicit
  await supabaseAdmin.from('agency_clients').delete().eq('agency_id', agencyId)
  await supabaseAdmin.from('agencies').delete().eq('id', agencyId)

  return NextResponse.json({ ok: true })
}
