import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVoiceFingerprint } from '@/lib/anthropic'
import { PLAN_LIMITS } from '@/lib/supabase'

const PLAN_LIMITS_MAP: Record<string, number> = { starter: 12, standard: 20, pro: 30 }

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    code,
    name, role, industry, company, years_experience, linkedin_url,
    mcq_answers, writing_sample, content_pillars, control_preference,
  } = body

  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  // Atomically validate and claim the code
  const { data: codeRow } = await supabaseAdmin
    .from('access_codes')
    .select('id, plan, max_uses, uses_count, expires_at, is_active')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!codeRow || !codeRow.is_active || codeRow.uses_count >= codeRow.max_uses) {
    return NextResponse.json({ error: 'Invalid or fully used code' }, { status: 400 })
  }
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code has expired' }, { status: 400 })
  }

  const plan: string = codeRow.plan

  // Generate voice fingerprint
  let voice_fingerprint = ''
  if (writing_sample) {
    try { voice_fingerprint = await analyzeVoiceFingerprint(writing_sample) } catch {}
  }

  const planData = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
  const now = new Date().toISOString()

  await Promise.all([
    // Increment code uses
    supabaseAdmin
      .from('access_codes')
      .update({ uses_count: codeRow.uses_count + 1 })
      .eq('id', codeRow.id),

    // Save profile
    supabaseAdmin.from('user_profiles').upsert({
      user_id: user.id,
      name, role, industry, company,
      years_experience: years_experience ? parseInt(years_experience) : null,
      linkedin_url,
      job_title: role,
      topics: content_pillars,
      writing_style: 'conversational',
      tone: 'friendly',
      voice_fingerprint,
      mcq_answers,
      writing_sample,
      content_pillars,
      control_preference,
      plan,
      posts_limit: planData.posts,
      posts_used_this_month: 0,
      onboarding_completed_at: now,
      preferred_days: ['Monday', 'Wednesday', 'Friday'],
      preferred_post_hour: 9,
      timezone: 'Asia/Kolkata',
      updated_at: now,
    }, { onConflict: 'user_id' }),

    // Mark user as access_code subscriber
    supabaseAdmin
      .from('users')
      .update({ subscription_status: 'access_code', updated_at: now })
      .eq('id', user.id),
  ])

  const response = NextResponse.json({ success: true, plan })
  response.cookies.set('sub_status', 'access_code', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
