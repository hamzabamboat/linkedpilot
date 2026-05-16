import { supabaseAdmin } from './supabase-admin'

export type ComplianceEventType =
  | 'post_blocked_spam'
  | 'post_blocked_moderation'
  | 'post_flagged_review'
  | 'autopilot_blocked'
  | 'trust_score_reduced'
  | 'high_spam_generation'
  | 'similarity_blocked'
  | 'moderation_failed'

export async function logComplianceEvent(
  userId: string,
  eventType: ComplianceEventType,
  severity: 'low' | 'medium' | 'high',
  details?: Record<string, unknown>,
  postId?: string,
): Promise<void> {
  try {
    await supabaseAdmin.from('compliance_events').insert({
      user_id: userId,
      post_id: postId ?? null,
      event_type: eventType,
      severity,
      details: details ?? {},
    })
  } catch {
    // Never let event logging block the main request
  }
}
