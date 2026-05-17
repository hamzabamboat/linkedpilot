import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/linkedin/accounts — list all connected LinkedIn accounts for the current user
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: accounts, error } = await supabaseAdmin
    .from('linkedin_accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ accounts })
}

// POST /api/linkedin/accounts — connect a company page account
// Body: { linkedin_id: string, name: string, picture_url?: string }
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { linkedin_id, name, picture_url } = body as {
    linkedin_id?: string
    name?: string
    picture_url?: string
  }

  if (!linkedin_id || !name) {
    return NextResponse.json({ error: 'linkedin_id and name are required' }, { status: 400 })
  }

  // Verify the user's token actually has access to this org page
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('linkedin_access_token')
    .eq('id', user.id)
    .single()

  if (!userData?.linkedin_access_token) {
    return NextResponse.json({ error: 'No LinkedIn token found' }, { status: 400 })
  }

  const aclRes = await fetch(
    `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget))`,
    { headers: { Authorization: `Bearer ${userData.linkedin_access_token}` } }
  )

  if (!aclRes.ok) {
    return NextResponse.json({ error: 'Could not verify org access from LinkedIn' }, { status: 400 })
  }

  const aclData = await aclRes.json()
  const orgUrns: string[] = (aclData.elements ?? []).map(
    (el: { organizationalTarget: string }) => el.organizationalTarget
  )
  // org URN format: urn:li:organization:12345 — extract the numeric ID
  const orgIds = orgUrns.map(urn => urn.split(':').pop())

  if (!orgIds.includes(linkedin_id)) {
    return NextResponse.json(
      { error: 'You are not an admin of this LinkedIn page' },
      { status: 403 }
    )
  }

  // Insert the company account — starts inactive until paid
  const { data: account, error: insertError } = await supabaseAdmin
    .from('linkedin_accounts')
    .upsert(
      {
        user_id: user.id,
        account_type: 'company',
        linkedin_id,
        name,
        picture_url: picture_url ?? null,
        subscription_status: 'inactive',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,linkedin_id', ignoreDuplicates: true }
    )
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ account })
}
