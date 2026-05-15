import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { User, Agency } from './supabase'
import { supabaseAdmin } from './supabase-admin'

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('session_user_id')?.value
  if (!userId) return null

  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const userId = request.cookies.get('session_user_id')?.value
  if (!userId) return null

  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

export function hasActiveSubscription(user: User): boolean {
  return user.subscription_status === 'active' || user.subscription_status === 'trialing'
}

export function canGeneratePost(user: User): boolean {
  if (hasActiveSubscription(user)) return true
  return user.trial_posts_used < 3
}

export async function getAgency(): Promise<Agency | null> {
  const cookieStore = await cookies()
  const agencyId = cookieStore.get('session_agency_id')?.value
  if (!agencyId) return null

  const { data } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single()

  return data
}

export async function getAgencyFromRequest(request: NextRequest): Promise<Agency | null> {
  const agencyId = request.cookies.get('session_agency_id')?.value
  if (!agencyId) return null

  const { data } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single()

  return data
}
