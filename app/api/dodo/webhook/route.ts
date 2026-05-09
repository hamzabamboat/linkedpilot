import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

function verifyDodoWebhook(rawBody: string, headers: Headers): boolean {
  const webhookId = headers.get('webhook-id') ?? ''
  const webhookTimestamp = headers.get('webhook-timestamp') ?? ''
  const webhookSignature = headers.get('webhook-signature') ?? ''

  if (!webhookId || !webhookTimestamp || !webhookSignature) return false

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const secret = process.env.DODO_WEBHOOK_SECRET ?? ''
  // Dodo uses base64-encoded secret prefixed with "whsec_"
  const secretBytes = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const computed = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  // Signature header may contain multiple space-separated "v1,<sig>" values
  return webhookSignature
    .split(' ')
    .map(s => s.replace('v1,', ''))
    .some(sig => sig === computed)
}

const PLAN_LIMITS: Record<string, number> = { starter: 12, standard: 20, pro: 30 }

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifyDodoWebhook(rawBody, request.headers)) {
    console.error('Dodo webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = event.data as Record<string, unknown>
  const subscriptionId = ((data.subscription_id ?? data.id) as string | undefined)
  const metadata = (data.metadata ?? {}) as Record<string, string>
  const userId = metadata.user_id
  const plan = metadata.plan || 'standard'
  const currency = metadata.currency || 'USD'
  const amount = (data.amount as number | undefined) ?? 0
  const now = new Date().toISOString()

  async function activateSubscription() {
    if (subscriptionId) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'active', payment_processor: 'dodo', currency, amount, updated_at: now })
        .eq('dodo_subscription_id', subscriptionId)
    }
    if (userId) {
      await Promise.all([
        supabaseAdmin
          .from('users')
          .update({ subscription_status: 'active', updated_at: now })
          .eq('id', userId),
        supabaseAdmin
          .from('user_profiles')
          .update({ plan, posts_limit: PLAN_LIMITS[plan] ?? 20, updated_at: now })
          .eq('user_id', userId),
      ])
    }
  }

  switch (event.type) {
    case 'payment.succeeded':
    case 'subscription.active':
      await activateSubscription()
      break

    case 'subscription.cancelled':
      if (subscriptionId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: now })
          .eq('dodo_subscription_id', subscriptionId)
      }
      break

    case 'subscription.failed':
      if (subscriptionId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: now })
          .eq('dodo_subscription_id', subscriptionId)
      }
      if (userId) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ posts_limit: 0, updated_at: now })
          .eq('user_id', userId)
      }
      break
  }

  console.log(`Dodo webhook: ${event.type} → sub ${subscriptionId}`)
  return NextResponse.json({ received: true })
}
