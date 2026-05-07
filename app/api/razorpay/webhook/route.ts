import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Razorpay sends webhooks as JSON with x-razorpay-signature header
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Razorpay webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; payload: Record<string, { entity: Record<string, unknown> }> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subEntity = event.payload?.subscription?.entity as {
    id?: string
    status?: string
    current_start?: number
    current_end?: number
    notes?: { user_id?: string }
  } | undefined

  if (!subEntity?.id) {
    // Non-subscription event — acknowledge and ignore
    return NextResponse.json({ received: true })
  }

  const razorpaySubId = subEntity.id
  const userId = subEntity.notes?.user_id

  const nextBillingDate = subEntity.current_end
    ? new Date(subEntity.current_end * 1000).toISOString()
    : null
  const startDate = subEntity.current_start
    ? new Date(subEntity.current_start * 1000).toISOString()
    : null

  // Map Razorpay status to our internal status
  const statusMap: Record<string, string> = {
    'subscription.activated': 'active',
    'subscription.charged': 'active',
    'subscription.pending': 'pending',
    'subscription.halted': 'halted',
    'subscription.cancelled': 'cancelled',
    'subscription.completed': 'completed',
    'subscription.expired': 'expired',
  }
  const newStatus = statusMap[event.event]
  if (!newStatus) return NextResponse.json({ received: true })

  const now = new Date().toISOString()

  // Update subscriptions table by razorpay_subscription_id
  const updatePayload: Record<string, string | null> = {
    status: newStatus,
    updated_at: now,
  }
  if (startDate) updatePayload.start_date = startDate
  if (nextBillingDate) updatePayload.next_billing_date = nextBillingDate
  // First charge after trial — clear trial_ends_at
  if (newStatus === 'active') updatePayload.trial_ends_at = null

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .update(updatePayload)
    .eq('razorpay_subscription_id', razorpaySubId)
    .select('user_id')
    .single()

  // Also update denormalized status on users table
  const resolvedUserId = sub?.user_id ?? userId
  if (resolvedUserId) {
    const userSubStatus = ['active', 'charged'].includes(newStatus) ? 'active' : newStatus
    await supabaseAdmin
      .from('users')
      .update({ subscription_status: userSubStatus, updated_at: now })
      .eq('id', resolvedUserId)

    const planFromNotes = (subEntity.notes as Record<string, string> | undefined)?.plan || 'standard'
    const planLimits: Record<string, number> = { starter: 12, standard: 20, pro: 30 }

    // Update user_profiles with plan and post limit derived from Razorpay notes
    if (newStatus === 'active') {
      await supabaseAdmin
        .from('user_profiles')
        .update({
          plan: planFromNotes,
          posts_limit: planLimits[planFromNotes] || 20,
          updated_at: now,
        })
        .eq('user_id', resolvedUserId)
    }

    // Increment resubscription count on first activation
    if (newStatus === 'active') {
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('subscription_count')
        .eq('id', resolvedUserId)
        .single()
      await supabaseAdmin
        .from('users')
        .update({ subscription_count: (currentUser?.subscription_count ?? 0) + 1 })
        .eq('id', resolvedUserId)
    }

    // Trial payment failed — downgrade to read-only (0 posts limit)
    if (newStatus === 'halted') {
      await supabaseAdmin
        .from('user_profiles')
        .update({ plan: planFromNotes, posts_limit: 0, updated_at: now })
        .eq('user_id', resolvedUserId)
    }
  }

  console.log(`Razorpay webhook: ${event.event} → sub ${razorpaySubId} → ${newStatus}`)
  return NextResponse.json({ received: true })
}
