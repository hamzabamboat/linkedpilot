import { NextRequest, NextResponse } from 'next/server'
import { getAgencyFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// DELETE — remove a client from this agency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await params

  // Verify this client belongs to the agency
  const { data: clientRow } = await supabaseAdmin
    .from('agency_clients')
    .select('id, user_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .maybeSingle()

  if (!clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Soft-delete: deactivate the client row
  await supabaseAdmin
    .from('agency_clients')
    .update({ is_active: false })
    .eq('id', clientId)

  return NextResponse.json({ ok: true })
}

// PATCH — rename a client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await params
  const { clientName } = await request.json()
  if (!clientName?.trim()) {
    return NextResponse.json({ error: 'Client name required' }, { status: 400 })
  }

  const { data: clientRow } = await supabaseAdmin
    .from('agency_clients')
    .select('id, user_id')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .maybeSingle()

  if (!clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  await Promise.all([
    supabaseAdmin
      .from('agency_clients')
      .update({ client_name: clientName.trim() })
      .eq('id', clientId),
    supabaseAdmin
      .from('user_profiles')
      .update({ name: clientName.trim() })
      .eq('user_id', clientRow.user_id),
  ])

  return NextResponse.json({ ok: true })
}
