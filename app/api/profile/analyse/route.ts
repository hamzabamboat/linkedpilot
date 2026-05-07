import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runProfileAnalysis } from '@/lib/profile-analyzer'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runProfileAnalysis(user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Profile analysis error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('profile_analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('analysed_at', { ascending: false })
    .limit(2)

  return NextResponse.json({ analyses: data || [] })
}
