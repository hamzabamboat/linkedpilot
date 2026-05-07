import Anthropic from '@anthropic-ai/sdk'
import { UserProfile } from './supabase'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type GeneratePostOptions = {
  profile: UserProfile
  topic?: string
  transcript?: string
  storyText?: string
  additionalContext?: string
  trendingContext?: string
  recentTopics?: string[]
}

function pickContentPillar(profile: UserProfile): string {
  const pillars = profile.content_pillars || profile.topics || ['Professional Insights']
  // Rotate evenly — pick random for now; in production track last used
  return pillars[Math.floor(Math.random() * pillars.length)]
}

function buildVoiceContext(profile: UserProfile): string {
  const parts: string[] = []

  if (profile.voice_fingerprint) {
    parts.push(`Voice fingerprint (match this style exactly):\n${profile.voice_fingerprint}`)
  }

  if (profile.mcq_answers) {
    const q = profile.mcq_answers
    if (q.voice_style) parts.push(`Professional voice: ${q.voice_style}`)
    if (q.main_goal) parts.push(`LinkedIn goal: ${q.main_goal}`)
    if (q.personal_stories) parts.push(`Personal stories comfort: ${q.personal_stories}`)
    if (q.content_type) parts.push(`Content they enjoy: ${q.content_type}`)
    if (q.known_as) parts.push(`Wants to be known as: ${q.known_as}`)
  }

  if (profile.writing_sample) {
    parts.push(`Writing sample:\n${profile.writing_sample}`)
  }

  return parts.join('\n\n')
}

export async function generateLinkedInPosts(options: GeneratePostOptions): Promise<string[]> {
  const { profile, topic, transcript, storyText, additionalContext, trendingContext, recentTopics } = options

  const pillar = pickContentPillar(profile)
  const voiceContext = buildVoiceContext(profile)

  const sourceContext = storyText
    ? `Transform this personal story/experience into a LinkedIn post:\n"${storyText}"`
    : transcript
    ? `The user recorded a voice note. Transcript:\n"${transcript}"\n\nTransform these raw ideas into a polished post.`
    : topic
    ? `Topic: "${topic}"`
    : `Generate a post about: ${pillar}`

  const avoidTopics = recentTopics?.length
    ? `\nDo NOT repeat or closely overlap with these recent topics: ${recentTopics.join(', ')}`
    : ''

  const systemPrompt = `You are an expert LinkedIn ghostwriter who writes posts that sound 100% human, get high engagement, and match the author's exact voice.

Author profile:
- Name: ${profile.name || profile.job_title || 'a professional'}${profile.company ? ` at ${profile.company}` : ''}
- Role: ${profile.role || profile.job_title || 'professional'}
- Industry: ${profile.industry || 'business'}
- Content pillar for this post: ${pillar}

${voiceContext}

LinkedIn post rules:
1. First line must be a scroll-stopper hook — no "I" to open, no generic starters
2. Short paragraphs (1-3 lines) with blank lines between
3. End with a question, strong CTA, or powerful closing
4. HASHTAGS (MANDATORY): Always add 5-8 hashtags on a new line after the post. Mix: 2 large (1M+ followers, e.g. #Leadership #Entrepreneurship), 3 medium (100k-1M, e.g. #StartupIndia #ProductManagement), 2-3 niche (under 100k, specific to their industry/topic). Never use #instagood, #love, #follow. Base hashtags on industry, content pillar, and post topic.
5. 150-300 words for most posts (up to 500 for deep insights)
6. Sound like a human, not a press release
7. Match the author's exact sentence length, vocabulary, and rhythm from their writing sample${avoidTopics}`

  const userPrompt = `${sourceContext}
${additionalContext ? `\nAdditional instructions: ${additionalContext}` : ''}
${trendingContext ? `\nTrending context to weave in naturally: ${trendingContext}` : ''}

Write 3 different LinkedIn post options with different angles/hooks. Format:

---POST 1---
[post content]

---POST 2---
[post content]

---POST 3---
[post content]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  const posts = responseText
    .split(/---POST \d+---/)
    .map(s => s.trim())
    .filter(Boolean)

  return posts.length > 0 ? posts : [responseText.trim()]
}

export async function analyzeVoiceFingerprint(writingSample: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Analyse this writing sample and create a voice fingerprint for LinkedIn ghostwriting. Describe:
1. Sentence length and rhythm (short punchy vs long flowing)
2. Vocabulary level (simple vs sophisticated)
3. Tone (formal vs casual)
4. Use of personal pronouns and storytelling
5. Punctuation and formatting style
6. 3 distinctive phrases or patterns to replicate

Writing sample:
"${writingSample}"

Write the fingerprint in 150 words max. Be specific and actionable for a ghostwriter.`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

export async function generateImageBriefPrompts(profile: UserProfile): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Generate 5 specific, actionable photo prompts for a LinkedIn personal brand content calendar.

Person: ${profile.name || profile.role} in ${profile.industry} industry
Content pillars: ${(profile.content_pillars || profile.topics || []).join(', ')}

Each prompt should describe exactly what photo to take (setting, action, props, mood). Make them realistic and achievable. Format as a JSON array of 5 strings.`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function repurposePost(postContent: string, profile: UserProfile): Promise<string[]> {
  const voiceContext = buildVoiceContext(profile)

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Repurpose this LinkedIn post into 3 completely different angles. Each should feel fresh but match the author's voice.

Original post:
"${postContent}"

${voiceContext}

Angles to try:
1. A contrarian/challenge take
2. A practical how-to version
3. A personal story angle

Format:
---ANGLE 1---
[content]
---ANGLE 2---
[content]
---ANGLE 3---
[content]`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return text.split(/---ANGLE \d+---/).map(s => s.trim()).filter(Boolean)
}

export async function analyzeLinkedInProfile(profileData: {
  name?: string
  headline?: string
  about?: string
  industry?: string
  role?: string
  writingSample?: string
}): Promise<{ score: number; breakdown: Record<string, { score: number; max: number; tip: string }>; improvements: string[] }> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Analyse this LinkedIn profile and score it out of 100. Give scores for each category and specific improvement tips.

Profile data:
- Name: ${profileData.name || 'Not provided'}
- Headline/Role: ${profileData.headline || profileData.role || 'Not provided'}
- About/Bio: ${profileData.about || 'Not provided'}
- Industry: ${profileData.industry || 'Not provided'}
- Writing sample: ${profileData.writingSample ? profileData.writingSample.slice(0, 300) : 'Not provided'}

Score these 5 categories (20 pts each):
1. Headline (20pts): Is it specific, value-driven, and keyword-rich?
2. About section (20pts): Does it tell a compelling story with a clear CTA?
3. Profile completeness (20pts): Are all key sections filled?
4. Content consistency (20pts): Does the writing show a clear voice and expertise?
5. Engagement potential (20pts): Would this profile attract the right connections?

Respond ONLY with a valid JSON object exactly like this:
{
  "score": <total 0-100>,
  "breakdown": {
    "headline": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "about": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "completeness": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "consistency": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "engagement": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" }
  },
  "improvements": ["<tip 1>", "<tip 2>", "<tip 3>"]
}`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { score: 50, breakdown: {}, improvements: [] }
  } catch {
    return { score: 50, breakdown: {}, improvements: [] }
  }
}

export async function generateImageSuggestions(postContent: string, industry: string): Promise<Array<{ icon: string; suggestion: string; why: string }>> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Based on this LinkedIn post, suggest 3-4 image types that would maximise reach and engagement.

Post: "${postContent.slice(0, 400)}"
Industry: ${industry}

For each suggestion provide: a relevant emoji icon, a specific image description, and a one-line reason why it works.

Respond ONLY with a JSON array:
[
  { "icon": "📸", "suggestion": "<specific image description>", "why": "<one line why it works>" },
  ...
]`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function generateSuggestionsForUser(
  profile: UserProfile,
  trendingNews: string[],
  recentPosts: string[],
): Promise<Array<{ suggestion_text: string; angle: string; hashtags: string[]; why_it_works: string; source: string }>> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Generate 5 LinkedIn post ideas for this person.

Profile: ${profile.name || profile.role} in ${profile.industry}
Content pillars: ${(profile.content_pillars || profile.topics || []).join(', ')}
${trendingNews.length ? `Trending news: ${trendingNews.join('; ')}` : ''}
${recentPosts.length ? `Recent posts (don't repeat): ${recentPosts.join('; ')}` : ''}

For each idea output a JSON object with: suggestion_text, angle, hashtags (array of 3), why_it_works, source (news|trends|history)

Output a JSON array of 5 objects.`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
