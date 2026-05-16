// AI cliché phrases that are heavily overused on LinkedIn
const AI_CLICHE_PHRASES = [
  "i failed. then i learned",
  "nobody talks about this",
  "this changed everything",
  "here's the thing",
  "let me be honest",
  "real talk",
  "unpopular opinion",
  "hot take",
  "i'll be honest",
  "plot twist",
  "game changer",
  "paradigm shift",
  "move the needle",
  "at the end of the day",
  "when all is said and done",
  "think outside the box",
  "low-hanging fruit",
  "circle back",
  "deep dive",
  "synergy",
  "leverage",
  "disrupt",
  "hustle harder",
  "grind never stops",
  "built different",
  "doing the work",
  "show up every day",
  "consistency is key",
  "trust the process",
  "embrace the journey",
  "level up",
  "own your story",
  "be the change",
  "success leaves clues",
  "winners never quit",
]

// Synthetic authenticity / fake vulnerability / guru arcs
const SYNTHETIC_AUTHENTICITY_PATTERNS = [
  /i (failed|struggled|lost|quit).{0,60}(then|but|until|and then).{0,60}(learned|realized|discovered|found)/i,
  /from \$?\d[\d,k]+ to \$?\d[\d,k]+/i,
  /\d+ years? ago.{0,120}today/i,
  /everybody (told|said|thought) (me|i).{0,60}(wrong|couldn't|wouldn't)/i,
  /best decision (i ever made|of my life|i've ever made)/i,
  /nobody (talks|tells) (about|you)/i,
  /i used to (think|believe|be).{0,60}(until|then|but)/i,
  /went from.{0,40}to.{0,40}(in \d|within \d)/i,
]

// Over-optimised repetitive hooks (first-line openers)
const REPETITIVE_HOOKS = [
  "nobody talks about",
  "unpopular opinion",
  "here's what i learned",
  "3 lessons",
  "5 things",
  "this changed my life",
  "wake up call",
  "read this carefully",
  "let that sink in",
  "hard truth",
  "brutal truth",
  "stop doing",
  "you need to",
  "most people don't know",
  "the secret to",
  "what nobody tells you",
  "i wish i knew",
  "i used to think",
  "the real reason",
  "here's why",
  "this is your sign",
  "reminder:",
  "psa:",
  "not enough people talk about",
  "controversial opinion",
  "friendly reminder",
]

// Engagement bait patterns
const ENGAGEMENT_BAIT = [
  "agree?",
  "am i right?",
  "drop a",
  "type yes",
  "type 1",
  "comment below",
  "share if you agree",
  "tag someone who",
  "tag a friend",
  "repost this",
  "save this post",
  "follow me for",
  "follow for more",
  "hit the bell",
  "turn on notifications",
  "dm me for",
  "link in bio",
  "link in comments",
]

// Overused CTA patterns
const OVERUSED_CTA_PATTERNS = [
  "follow me",
  "follow for daily",
  "follow for more",
  "connect with me",
  "let's connect",
]

export type ContentScores = {
  spam_score: number
  humanity_score: number
  hook_similarity_score: number
  originality_score: number
  requires_manual_review: boolean
  flags: string[]
}

function penaliseExcessiveWhitespace(content: string): number {
  const lines = content.split('\n')
  let consecutiveBlank = 0
  let maxConsecutive = 0
  let totalBlank = 0

  for (const line of lines) {
    if (line.trim() === '') {
      consecutiveBlank++
      totalBlank++
      maxConsecutive = Math.max(maxConsecutive, consecutiveBlank)
    } else {
      consecutiveBlank = 0
    }
  }

  const blankRatio = totalBlank / Math.max(lines.length, 1)
  let penalty = 0
  if (maxConsecutive >= 3) penalty += 8
  if (blankRatio > 0.45) penalty += 8
  return penalty
}

export function calculateSpamScore(content: string): number {
  const lower = content.toLowerCase()
  let score = 0

  // Repetitive hook openers — 25 pts max
  let hookHits = 0
  for (const hook of REPETITIVE_HOOKS) {
    if (lower.includes(hook)) hookHits++
  }
  score += Math.min(hookHits * 10, 25)

  // AI cliché phrases — 20 pts max
  let clicheHits = 0
  for (const phrase of AI_CLICHE_PHRASES) {
    if (lower.includes(phrase)) clicheHits++
  }
  score += Math.min(clicheHits * 7, 20)

  // Synthetic authenticity / fake vulnerability arcs — 20 pts max
  let arcHits = 0
  for (const pattern of SYNTHETIC_AUTHENTICITY_PATTERNS) {
    if (pattern.test(content)) arcHits++
  }
  score += Math.min(arcHits * 10, 20)

  // Engagement bait — 15 pts max
  let baitHits = 0
  for (const bait of ENGAGEMENT_BAIT) {
    if (lower.includes(bait)) baitHits++
  }
  score += Math.min(baitHits * 8, 15)

  // Overused CTAs — 10 pts max
  let ctaHits = 0
  for (const cta of OVERUSED_CTA_PATTERNS) {
    if (lower.includes(cta)) ctaHits++
  }
  score += Math.min(ctaHits * 8, 10)

  // Excessive emojis — 8 pts max
  const emojiCount = (content.match(/\p{Emoji}/gu) || []).length
  if (emojiCount > 8) score += 4
  if (emojiCount > 15) score += 4

  // Excessive whitespace formatting tricks — 16 pts max
  score += penaliseExcessiveWhitespace(content)

  // Very short posts — 8 pts
  if (content.trim().length < 120) score += 8

  return Math.min(score, 100)
}

export function calculateHumanityScore(content: string): number {
  let score = 100
  const lower = content.toLowerCase()

  // Rocket/fire/100 emoji overuse
  if (lower.includes('🚀')) score -= 5
  if (lower.includes('🔥')) score -= 5
  if (lower.includes('💯')) score -= 5

  // Guru / hustle language
  if (lower.includes('game changer')) score -= 10
  if (lower.includes('viral')) score -= 8
  if (lower.includes('crushing it')) score -= 8
  if (lower.includes('killing it')) score -= 8
  if (lower.includes('10x')) score -= 5
  if (lower.includes('mindset')) score -= 3
  if (lower.includes('grind')) score -= 3

  // AI formatting tells: heavy bullet/numbered lists
  const bulletLines = content.split('\n').filter(l => l.trim().match(/^[•\-\*]\s/))
  if (bulletLines.length > 5) score -= 10

  const numberedLines = content.split('\n').filter(l => l.trim().match(/^\d+\./))
  if (numberedLines.length > 4) score -= 8

  // Suspiciously uniform sentence lengths (AI tell)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().split(' ').length > 4)
  if (sentences.length > 5) {
    const lengths = sentences.map(s => s.trim().split(' ').length)
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length
    if (variance < 4) score -= 12
  }

  return Math.max(score, 0)
}

export function calculateHookSimilarityScore(content: string): number {
  const firstLine = content.split('\n').find(l => l.trim().length > 0)?.toLowerCase().trim() || ''
  let score = 0

  for (const hook of REPETITIVE_HOOKS) {
    if (firstLine.includes(hook)) score += 30
  }

  // Listicle opener — "5 things", "3 ways", etc.
  if (/^\d+\s+(things?|ways?|tips?|lessons?|reasons?|mistakes?|habits?|steps?)/i.test(firstLine)) {
    score += 25
  }

  // Forced question targeting reader
  if (/^(are you|do you|have you|can you|did you|what if)/i.test(firstLine)) {
    score += 10
  }

  // Starting with "I" — banned in LinkedIn best practice
  if (firstLine.startsWith('i ') || firstLine.startsWith("i'")) {
    score += 15
  }

  return Math.min(score, 100)
}

export function calculateOriginalityScore(content: string): number {
  let score = 100
  const lower = content.toLowerCase()

  for (const phrase of AI_CLICHE_PHRASES) {
    if (lower.includes(phrase)) score -= 7
  }

  for (const pattern of SYNTHETIC_AUTHENTICITY_PATTERNS) {
    if (pattern.test(content)) score -= 15
  }

  // Predictable listicle structure
  const numberedLines = content.split('\n').filter(l => l.trim().match(/^\d+\./))
  if (numberedLines.length > 3) score -= 10

  // Every paragraph same length = low originality
  const paras = content.split('\n\n').filter(p => p.trim().length > 30)
  if (paras.length > 3) {
    const lengths = paras.map(p => p.trim().length)
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length
    if (variance < 200 && paras.length > 4) score -= 8
  }

  return Math.max(score, 0)
}

export function analyzeContent(content: string): ContentScores {
  const spam_score = calculateSpamScore(content)
  const humanity_score = calculateHumanityScore(content)
  const hook_similarity_score = calculateHookSimilarityScore(content)
  const originality_score = calculateOriginalityScore(content)
  const requires_manual_review = requiresManualReview(spam_score, humanity_score, hook_similarity_score)

  const flags: string[] = []
  if (spam_score >= 40) flags.push('high_spam')
  if (humanity_score <= 50) flags.push('low_humanity')
  if (hook_similarity_score >= 50) flags.push('hook_overused')
  if (originality_score <= 40) flags.push('low_originality')

  return { spam_score, humanity_score, hook_similarity_score, originality_score, requires_manual_review, flags }
}

export function requiresManualReview(
  spamScore: number,
  humanityScore: number,
  hookSimilarityScore = 0,
): boolean {
  return spamScore >= 40 || humanityScore <= 50 || hookSimilarityScore >= 60
}
