import { anthropic } from './anthropic'

export type ModerationResult = {
  approved: boolean
  reason: string
  severity: 'none' | 'low' | 'medium' | 'high'
}

const SYSTEM_PROMPT = `You are a content safety reviewer for a professional LinkedIn writing assistant.

Review the post for these issues ONLY if they are clearly present:
1. Deliberate misinformation or provably false claims
2. Impersonation of real people or companies
3. Ragebait — content designed primarily to provoke anger, not add value
4. Hate speech or discrimination
5. Fake achievements clearly designed to deceive (e.g., "I made $1M in 30 days" with no context)
6. Manipulative psychological pressure tactics ("You MUST do this or fail")
7. Spam — pure engagement bait with no real content value

Be PERMISSIVE. Normal LinkedIn content — inspiration, self-promotion, opinions, business advice, personal stories — should be approved.
Only flag content that is genuinely harmful, deceptive, or abusive.

Respond ONLY with a JSON object:
{"approved": true/false, "reason": "brief reason or 'clean'", "severity": "none"|"low"|"medium"|"high"}`

export async function moderateContent(content: string): Promise<ModerationResult> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: content.slice(0, 2000) }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { approved: true, reason: 'parse_error', severity: 'none' }

    const parsed = JSON.parse(match[0])
    return {
      approved: parsed.approved !== false,
      reason: String(parsed.reason || 'unknown'),
      severity: (['none', 'low', 'medium', 'high'].includes(parsed.severity)
        ? parsed.severity
        : 'none') as ModerationResult['severity'],
    }
  } catch {
    // Fail open — moderation failure must never block publishing
    return { approved: true, reason: 'moderation_unavailable', severity: 'none' }
  }
}
