import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runProfileAnalysis } from '@/lib/profile-analyzer'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  console.log('[analyse route] POST called for user:', user.id)

  try {
    const result = await runProfileAnalysis(user.id)
    console.log('[analyse route] Success, score:', result.score)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[analyse route] Analysis failed:', message)
    return NextResponse.json(
      { error: message || 'Analysis failed — check server logs for details.' },
      { status: 500 }
    )
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
