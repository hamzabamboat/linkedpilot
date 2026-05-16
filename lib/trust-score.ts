import { supabaseAdmin } from './supabase-admin'

export type TrustScoreResult = {
  trust_score: number      // 0–100, higher = more trustworthy
  risk_score: number       // 0–100, higher = more risky
  autopilot_eligible: boolean
  reasons: string[]
}

type PostRow = { status: string; spam_score: number | null; humanity_score: number | null; requires_manual_review: boolean; created_at: string }
type EventRow = { event_type: string; severity: string; created_at: string }

// Thresholds
const AUTOPILOT_TRUST_THRESHOLD = 60
const AUTOPILOT_RISK_CEILING = 35
const MIN_PUBLISHED_FOR_AUTOPILOT = 3

async function fetchComplianceEvents(userId: string): Promise<EventRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('compliance_events')
      .select('event_type, severity, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    return (data ?? []) as EventRow[]
  } catch {
    return []
  }
}

export async function computeTrustScore(userId: string): Promise<TrustScoreResult> {
  const [profileRes, postsRes, events] = await Promise.all([
    supabaseAdmin
      .from('user_profiles')
      .select('created_at, control_preference, autopilot_eligible')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('posts')
      .select('status, spam_score, humanity_score, requires_manual_review, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    fetchComplianceEvents(userId),
  ])

  const profile = profileRes.data
  const posts = (postsRes.data ?? []) as PostRow[]

  let trust = 50  // neutral start
  let risk = 0
  const reasons: string[] = []

  // Account age — older accounts earn more trust
  if (profile?.created_at) {
    const ageDays = (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
    if (ageDays > 30) trust += 8
    if (ageDays > 90) trust += 8
  }

  // Published posts — evidence of legitimate use
  const published = posts.filter(p => p.status === 'published')
  if (published.length >= MIN_PUBLISHED_FOR_AUTOPILOT) trust += 10
  if (published.length >= 10) trust += 8
  if (published.length >= 20) trust += 7

  // Average spam score
  const withSpam = posts.filter(p => p.spam_score != null)
  if (withSpam.length > 0) {
    const avgSpam = withSpam.reduce((s, p) => s + (p.spam_score ?? 0), 0) / withSpam.length
    if (avgSpam >= 50) {
      trust -= 20
      risk += 25
      reasons.push(`Avg spam score ${avgSpam.toFixed(0)} — content quality is low`)
    } else if (avgSpam < 20) {
      trust += 8
    }
  }

  // Manual review flag rate
  if (posts.length > 0) {
    const flagged = posts.filter(p => p.requires_manual_review).length
    const flagRate = flagged / posts.length
    if (flagRate > 0.5) {
      trust -= 15
      risk += 20
      reasons.push(`${Math.round(flagRate * 100)}% of posts flagged for manual review`)
    } else if (flagRate > 0.3) {
      trust -= 8
      risk += 10
      reasons.push(`${Math.round(flagRate * 100)}% of posts flagged for manual review`)
    }
  }

  // Rejected posts
  const rejected = posts.filter(p => p.status === 'rejected').length
  if (rejected > 0) {
    trust -= rejected * 5
    risk += rejected * 8
    reasons.push(`${rejected} posts rejected`)
  }

  // Compliance events — recent high/medium severity events raise risk
  const high = events.filter(e => e.severity === 'high').length
  const medium = events.filter(e => e.severity === 'medium').length
  if (high > 0) {
    trust -= high * 10
    risk += high * 15
    reasons.push(`${high} high-severity compliance event${high > 1 ? 's' : ''}`)
  }
  if (medium > 2) {
    trust -= 8
    risk += 10
    reasons.push(`${medium} medium-severity compliance events`)
  }

  // Repeated autopilot blocks suggest user keeps bypassing warnings
  const autopilotBlocks = events.filter(e => e.event_type === 'autopilot_blocked').length
  if (autopilotBlocks > 3) {
    risk += 10
    reasons.push(`${autopilotBlocks} autopilot blocks recorded`)
  }

  trust = Math.max(0, Math.min(100, trust))
  risk = Math.max(0, Math.min(100, risk))

  const autopilot_eligible =
    published.length >= MIN_PUBLISHED_FOR_AUTOPILOT &&
    trust >= AUTOPILOT_TRUST_THRESHOLD &&
    risk < AUTOPILOT_RISK_CEILING

  return { trust_score: trust, risk_score: risk, autopilot_eligible, reasons }
}

export async function updateTrustScore(userId: string): Promise<TrustScoreResult> {
  const result = await computeTrustScore(userId)

  await supabaseAdmin
    .from('user_profiles')
    .update({
      trust_score: result.trust_score,
      risk_score: result.risk_score,
      autopilot_eligible: result.autopilot_eligible,
    })
    .eq('user_id', userId)

  return result
}
