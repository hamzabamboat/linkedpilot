import { NextRequest, NextResponse } from 'next/server'
import { getDodo, DODO_PLANS, DodoPlan, DodoCurrency } from '@/lib/dodo'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const plan = (body.plan || 'standard') as DodoPlan
  const currency = (body.currency || 'USD') as DodoCurrency

  const planConfig = DODO_PLANS[plan]?.[currency]
  if (!planConfig?.productId) {
    return NextResponse.json({ error: 'Invalid plan or currency' }, { status: 400 })
  }

  // Block if already on an active or trialing subscription
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingSub?.status === 'active' || existingSub?.status === 'trial') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
  }

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('email, linkedin_name')
    .eq('id', user.id)
    .single()

  const dodo = getDodo()

  const subscription = await dodo.subscriptions.create({
    billing: { city: '', country: 'US', state: '', street: '', zipcode: '' },
    customer: {
      email: userData?.email ?? '',
      name: userData?.linkedin_name ?? 'User',
      create_new_customer: false,
    },
    product_id: planConfig.productId,
    quantity: 1,
    payment_link: true,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
    metadata: { user_id: user.id, plan, currency },
  })

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: user.id,
      dodo_subscription_id: subscription.subscription_id,
      status: 'created',
      payment_processor: 'dodo',
      currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({
    checkout_url: subscription.payment_link,
    plan,
    currency,
  })
}
