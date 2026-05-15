import { NextRequest, NextResponse } from 'next/server'
import { getAgencyFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

// GET — list all clients for the logged-in agency
export async function GET(request: NextRequest) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clients, error } = await supabaseAdmin
    .from('agency_clients')
    .select(`
      id,
      client_name,
      is_active,
      created_at,
      user_id,
      users:user_id (
        id,
        linkedin_name,
        linkedin_picture,
        linkedin_id,
        subscription_status
      ),
      user_profiles:user_id (
        posts_used_this_month,
        posts_limit,
        plan,
        onboarding_completed_at
      )
    `)
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[agency/clients GET]', error)
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 })
  }

  return NextResponse.json({ clients, seatLimit: agency.seat_limit })
}

// POST — create a new client account for this agency
export async function POST(request: NextRequest) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!agency.is_active) return NextResponse.json({ error: 'Account deactivated' }, { status: 403 })

  // Check seat limit
  const { count } = await supabaseAdmin
    .from('agency_clients')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('is_active', true)

  if ((count ?? 0) >= agency.seat_limit) {
    return NextResponse.json(
      { error: `Seat limit reached (${agency.seat_limit}). Contact us to increase your limit.` },
      { status: 403 }
    )
  }

  const { clientName, email } = await request.json()
  if (!clientName?.trim()) {
    return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
  }

  // Create a placeholder users row for this client
  const placeholderId = crypto.randomUUID()
  const { data: newUser, error: userErr } = await supabaseAdmin
    .from('users')
    .insert({
      linkedin_id: `agency_client_${placeholderId}`,
      linkedin_name: clientName.trim(),
      email: email?.trim() || null,
      subscription_status: 'active',
    })
    .select('id')
    .single()

  if (userErr) {
    console.error('[agency/clients POST] user create', userErr)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }

  // Create a user_profile so the dashboard works
  await supabaseAdmin.from('user_profiles').insert({
    user_id: newUser.id,
    name: clientName.trim(),
    posts_limit: 30,
    posts_used_this_month: 0,
    plan: 'pro',
    onboarding_completed_at: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
    preferred_post_hour: 9,
  })

  // Create an active subscription row
  await supabaseAdmin.from('subscriptions').insert({
    user_id: newUser.id,
    status: 'active',
    plan_id: 'agency_managed',
  })

  // Link to agency
  const { data: clientRow, error: linkErr } = await supabaseAdmin
    .from('agency_clients')
    .insert({
      agency_id: agency.id,
      user_id: newUser.id,
      client_name: clientName.trim(),
    })
    .select()
    .single()

  if (linkErr) {
    console.error('[agency/clients POST] link create', linkErr)
    return NextResponse.json({ error: 'Failed to link client' }, { status: 500 })
  }

  return NextResponse.json({ client: clientRow, userId: newUser.id }, { status: 201 })
}
