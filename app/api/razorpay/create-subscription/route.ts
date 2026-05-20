import { NextRequest, NextResponse } from 'next/server'
import { getRazorpay, PLAN_IDS, ANNUAL_PLAN_IDS, PLAN_AMOUNTS, ANNUAL_PLAN_AMOUNTS, TRIAL_DAYS } from '@/lib/razorpay'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPostHogClient } from '@/lib/posthog-server'


export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const planId: string = body.planId || 'standard'
    const billingPeriod: 'monthly' | 'annual' = body.billing_period === 'annual' ? 'annual' : 'monthly'

    const razorpayPlanId = billingPeriod === 'annual' ? ANNUAL_PLAN_IDS[planId] : PLAN_IDS[planId]
    if (!razorpayPlanId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    const planAmount = billingPeriod === 'annual' ? ANNUAL_PLAN_AMOUNTS[planId] : PLAN_AMOUNTS[planId]

    // Block if already on an active or non-expired trialing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('razorpay_subscription_id, status, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const trialStillActive =
      (existingSub?.status === 'trial' || existingSub?.status === 'trialing') &&
      !!existingSub.trial_ends_at &&
      new Date(existingSub.trial_ends_at) > new Date()

    if (existingSub?.status === 'active' || trialStillActive) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
    }

    const now = new Date()
    const trialEndTimestamp = Math.floor(now.getTime() / 1000) + TRIAL_DAYS * 24 * 60 * 60
    const trialEndsAt = new Date(trialEndTimestamp * 1000).toISOString()

    const rzp = getRazorpay()
    const subscription = await rzp.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: 120,
      start_at: trialEndTimestamp,
      notes: { user_id: user.id, plan: planId },
    })

    await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: user.id,
        razorpay_subscription_id: subscription.id,
        status: 'trialing',
        plan_id: razorpayPlanId,
        current_period_start: now.toISOString(),
        trial_ends_at: trialEndsAt,
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' }
    )

    getPostHogClient().capture({
      distinctId: user.id,
      event: 'subscription_started',
      properties: { plan: planId, billing_period: billingPeriod, amount: planAmount, trial_days: TRIAL_DAYS, processor: 'razorpay', subscription_id: subscription.id },
    })

    return NextResponse.json({
      subscription_id: subscription.id,
      plan: planId,
      billing_period: billingPeriod,
      amount: planAmount,
      trial_days: TRIAL_DAYS,
    })
  } catch (err) {
    // Razorpay SDK throws a plain object, not an Error instance
    const rzpErr = err as { error?: { description?: string; code?: string }; message?: string }
    const message = rzpErr?.error?.description || rzpErr?.message || (err instanceof Error ? err.message : 'Failed to create subscription')
    console.error('[razorpay/create-subscription]', JSON.stringify(err))
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

