import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CURRENCY_TO_INR } from '@/lib/currency'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

// INR prices for Razorpay subscribers
const PLAN_PRICE_INR: Record<string, number> = { starter: 999, standard: 2499, pro: 4999 }

// Dodo plan prices per currency
const DODO_PLAN_PRICE: Record<string, Record<string, number>> = {
  starter:  { USD: 12, GBP: 10, SGD: 16, AED: 45, EUR: 11 },
  standard: { USD: 30, GBP: 25, SGD: 40, AED: 110, EUR: 28 },
  pro:      { USD: 60, GBP: 50, SGD: 80, AED: 220, EUR: 55 },
}

function buildPlanIdMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const ids: Record<string, string | undefined> = {
    starter: process.env.RAZORPAY_PLAN_ID_STARTER,
    standard: process.env.RAZORPAY_PLAN_ID_STANDARD,
    pro: process.env.RAZORPAY_PLAN_ID_PRO,
  }
  for (const [planName, planId] of Object.entries(ids)) {
    if (planId) map[planId] = planName
  }
  return map
}

export async function GET(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [usersRes, profilesRes, postsRes, subscriptionsRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, linkedin_id, linkedin_name, email, subscription_status, subscription_count, created_at, updated_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('user_profiles')
      .select('user_id, name, plan, posts_used_this_month, posts_limit'),
    supabaseAdmin.from('posts').select('user_id'),
    supabaseAdmin
      .from('subscriptions')
      .select('user_id, status, plan_id, razorpay_subscription_id, dodo_subscription_id, payment_processor, currency, created_at')
      .in('status', ['active', 'trial', 'trialing', 'access_code', 'created', 'halted', 'cancelled', 'expired', 'completed']),
  ])

  const users = usersRes.data || []
  const profiles = profilesRes.data || []
  const posts = postsRes.data || []
  const subscriptions = subscriptionsRes.data || []

  const profileMap = new Map(profiles.map(p => [p.user_id, p]))
  const subscriptionMap = new Map(subscriptions.map(s => [s.user_id, s]))
  const planIdToName = buildPlanIdMap()

  const postCountMap: Record<string, number> = {}
  for (const p of posts) {
    postCountMap[p.user_id] = (postCountMap[p.user_id] || 0) + 1
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const rows = users.map(u => {
    const profile = profileMap.get(u.id)
    const sub = subscriptionMap.get(u.id)

    let plan = profile?.plan ?? null
    if (!plan || plan === 'starter') {
      if (sub?.plan_id && planIdToName[sub.plan_id]) plan = planIdToName[sub.plan_id]
    }
    if (!sub && !profile?.plan) plan = 'free'
    plan = plan ?? 'starter'

    const subStatus = sub?.status ?? u.subscription_status ?? 'inactive'
    const processor = sub?.payment_processor ?? 'razorpay'
    const currency = sub?.currency ?? 'INR'

    return {
      id: u.id,
      name: profile?.name ?? u.linkedin_name ?? '—',
      email: u.email ?? '—',
      linkedin_id: u.linkedin_id,
      plan,
      subscription_status: subStatus,
      sub_status: subStatus,
      subscription_count: u.subscription_count ?? 0,
      razorpay_subscription_id: sub?.razorpay_subscription_id ?? null,
      dodo_subscription_id: sub?.dodo_subscription_id ?? null,
      payment_processor: processor,
      currency,
      joined: u.created_at,
      last_active: u.updated_at,
      posts_total: postCountMap[u.id] ?? 0,
      posts_this_month: profile?.posts_used_this_month ?? 0,
    }
  })

  // MRR: convert all currencies to INR equivalent using fixed rates
  const activeRows = rows.filter(r => ['active', 'trial', 'trialing', 'access_code'].includes(r.subscription_status))
  const mrr = activeRows
    .filter(r => r.subscription_status === 'active')
    .reduce((sum, r) => {
      if (r.payment_processor === 'dodo') {
        const localPrice = DODO_PLAN_PRICE[r.plan]?.[r.currency] ?? 0
        const rate = CURRENCY_TO_INR[r.currency] ?? 84
        return sum + Math.round(localPrice * rate)
      }
      return sum + (PLAN_PRICE_INR[r.plan] || 0)
    }, 0)

  const mrrByCurrency: Record<string, number> = {}
  for (const r of activeRows.filter(r => r.subscription_status === 'active')) {
    if (r.payment_processor === 'dodo') {
      const localPrice = DODO_PLAN_PRICE[r.plan]?.[r.currency] ?? 0
      mrrByCurrency[r.currency] = (mrrByCurrency[r.currency] ?? 0) + localPrice
    } else {
      mrrByCurrency['INR'] = (mrrByCurrency['INR'] ?? 0) + (PLAN_PRICE_INR[r.plan] || 0)
    }
  }

  const planBreakdown = { starter: 0, standard: 0, pro: 0, free: 0 }
  for (const r of activeRows) {
    const key = r.plan as keyof typeof planBreakdown
    if (key in planBreakdown) planBreakdown[key]++
  }

  const newSubsThisMonth = rows.filter(r =>
    ['active', 'trial', 'trialing', 'access_code'].includes(r.subscription_status) &&
    String(r.joined) >= startOfMonth
  )
  const churnedThisMonth = rows.filter(r =>
    ['cancelled', 'expired'].includes(r.sub_status) &&
    String(r.last_active) >= startOfMonth
  )

  return NextResponse.json(
    {
      users: rows,
      revenue: {
        total_active: activeRows.length,
        mrr,
        mrr_by_currency: mrrByCurrency,
        plan_breakdown: planBreakdown,
        new_subs_this_month: newSubsThisMonth.length,
        churned_this_month: churnedThisMonth.length,
      },
    },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
  )
}
