import { NextRequest, NextResponse } from 'next/server'
import { getDodo, DODO_PLANS, DODO_ANNUAL_PLANS, DodoPlan, DodoCurrency, BillingPeriod } from '@/lib/dodo'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const plan = (body.plan || 'standard') as DodoPlan
  const currency = (body.currency || 'USD') as DodoCurrency
  const billingPeriod = (body.billing_period || 'monthly') as BillingPeriod
  const accountId = body.account_id as string | undefined
  // force_new=true means this request is from the /upgrade page — never do a plan
  // change, always require a fresh checkout. false (default) = settings page context.
  const forceNew = body.force_new === true

  const planTable = billingPeriod === 'annual' ? DODO_ANNUAL_PLANS : DODO_PLANS
  const planConfig = planTable[plan]?.[currency]
  if (!planConfig?.productId) {
    return NextResponse.json({ error: 'Invalid plan or currency' }, { status: 400 })
  }

  // Fetch the existing subscription to check trial status
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('status, trial_ends_at, dodo_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingSub?.status === 'active' && existingSub.dodo_subscription_id) {
    if (forceNew) {
      // Called from /upgrade — user somehow reached the page while already active.
      // Don't do a plan change; just send them back to the dashboard.
      return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 })
    }
    // Called from settings — try to change their plan without a new checkout
    const dodo = getDodo()
    try {
      await dodo.subscriptions.changePlan(existingSub.dodo_subscription_id, {
        product_id: planConfig.productId,
        proration_billing_mode: 'prorated_immediately',
        quantity: 1,
      })
      await supabaseAdmin
        .from('subscriptions')
        .update({ currency, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      return NextResponse.json({ upgraded: true, plan, currency })
    } catch (err) {
      // changePlan failed (e.g. env mismatch, invalid sub ID) — fall through to new checkout
      console.error('[dodo/create-subscription] changePlan failed, falling back to checkout:', err)
    }
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

  let subscription: Awaited<ReturnType<typeof dodo.subscriptions.create>>
  try {
    subscription = await dodo.subscriptions.create({
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
      metadata: { user_id: user.id, account_id: resolvedAccountId ?? '', plan, currency, billing_period: billingPeriod },
    })
  } catch (err) {
    console.error('[dodo/create-subscription] Dodo API error:', err)
    const message = err instanceof Error ? err.message : 'Payment provider error'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (!subscription.payment_link) {
    console.error('[dodo/create-subscription] No payment_link returned for subscription', subscription.subscription_id)
    return NextResponse.json({ error: 'No checkout URL returned from payment provider' }, { status: 502 })
  }

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
    billing_period: billingPeriod,
    account_id: resolvedAccountId,
  })
}
