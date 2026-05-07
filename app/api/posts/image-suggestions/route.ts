import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateImageSuggestions } from '@/lib/anthropic'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postContent } = await request.json()
  if (!postContent) return NextResponse.json({ error: 'postContent required' }, { status: 400 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('industry')
    .eq('user_id', user.id)
    .maybeSingle()

  const suggestions = await generateImageSuggestions(postContent, profile?.industry || 'business')
  return NextResponse.json({ suggestions })
}
