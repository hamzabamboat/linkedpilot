import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

// GET — list all access codes
export async function GET(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('access_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codes: data })
}

// POST — create a new access code
export async function POST(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { code, plan, max_uses, expires_at, created_by } = body
  if (!code || !plan) return NextResponse.json({ error: 'code and plan required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('access_codes')
    .insert({ code: code.toUpperCase().trim(), plan, max_uses: max_uses || 1, expires_at: expires_at || null, created_by: created_by || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ code: data })
}

// PATCH — toggle is_active on a code
export async function PATCH(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin
    .from('access_codes')
    .update({ is_active })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
