import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/memories — list recent memories for the user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const onlyUnposted = searchParams.get('unposted') === 'true'
    const days = parseInt(searchParams.get('days') || '30', 10)

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    let query = supabaseAdmin
      .from('user_memories')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50)

    if (onlyUnposted) {
      query = query.eq('posted_about', false)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ memories: data || [] })
  } catch (error) {
    console.error('[memories/GET]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH /api/memories — mark a memory as posted_about or delete it
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, posted_about, _delete } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    if (_delete) {
      const { error } = await supabaseAdmin
        .from('user_memories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabaseAdmin
      .from('user_memories')
      .update({ posted_about })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[memories/PATCH]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/memories — manually add a memory
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { memory_type, content, occurred_at } = await request.json()
    if (!content || !memory_type) return NextResponse.json({ error: 'memory_type and content required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('user_memories')
      .insert({
        user_id: user.id,
        memory_type,
        content,
        occurred_at: occurred_at || null,
        source: 'manual',
        posted_about: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ memory: data })
  } catch (error) {
    console.error('[memories/POST]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
