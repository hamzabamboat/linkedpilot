import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.toUpperCase().trim()
  if (!code) return NextResponse.json({ valid: false, error: 'Code required' })

  const { data } = await supabaseAdmin
    .from('access_codes')
    .select('id, code, plan, max_uses, uses_count, expires_at, is_active')
    .eq('code', code)
    .single()

  if (!data || !data.is_active) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired code' })
  }
  if (data.uses_count >= data.max_uses) {
    return NextResponse.json({ valid: false, error: 'This code has reached its maximum uses' })
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'This code has expired' })
  }

  return NextResponse.json({ valid: true, plan: data.plan, code: data.code })
}
