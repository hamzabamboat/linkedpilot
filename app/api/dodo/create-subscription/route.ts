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
  const accountId = body.account_id as string | undefined

  const planConfig = DODO_PLANS[plan]?.[currency]
  if (!planConfig?.productId) {
    return NextResponse.json({ error: 'Invalid plan or currency' }, { status: 400 })
  }

  // Fetch the existing subscription to check trial status
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('status, trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingSub?.status === 'active') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
  }

  // Allow checkout when the trial has expired; block if it's still running
  if (existingSub?.status === 'trial' || existingSub?.status === 'trialing') {
    const trialStillActive =
      existingSub.trial_ends_at && new Date(existingSub.trial_ends_at) > new Date()
    if (trialStillActive) {
      return NextResponse.json({ error: 'Your free trial is still active' }, { status: 409 })
    }
    // Trial has expired — fall through and let them subscribe
  }

  // Resolve which linkedin_account to attach the subscription to
  let resolvedAccountId = accountId

  if (resolvedAccountId) {
    const { data: account } = await supabaseAdmin
      .from('linkedin_accounts')
      .select('id')
      .eq('id', resolvedAccountId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
  } else {
    // Default to the user's personal account
    const { data: personalAccount } = await supabaseAdmin
      .from('linkedin_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_type', 'personal')
      .maybeSingle()

    resolvedAccountId = personalAccount?.id
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    product_id: planConfig.productId,
    quantity: 1,
    payment_link: true,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
    metadata: { user_id: user.id, account_id: resolvedAccountId ?? '', plan, currency },
  })

  // Update the subscription row (overwrites the trial row with the new Dodo sub)
  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: user.id,
      account_id: resolvedAccountId ?? null,
      dodo_subscription_id: subscription.subscription_id,
      status: 'created',
      payment_processor: 'dodo',
      currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (resolvedAccountId) {
    await supabaseAdmin
      .from('linkedin_accounts')
      .update({ dodo_subscription_id: subscription.subscription_id, updated_at: new Date().toISOString() })
      .eq('id', resolvedAccountId)
  }

  return NextResponse.json({
    checkout_url: subscription.payment_link,
    plan,
    currency,
    account_id: resolvedAccountId,
  })
}
