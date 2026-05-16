/**
 * Content similarity analysis to detect repetitive posting patterns.
 * Uses token-based Jaccard similarity across content, hooks, CTAs, and structure.
 */

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3),
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const intersection = [...a].filter(x => b.has(x)).length
  const union = new Set([...a, ...b]).size
  return intersection / union
}

function extractHook(content: string): string {
  return content.split('\n').find(l => l.trim().length > 0)?.toLowerCase().trim() ?? ''
}

function extractCTA(content: string): string {
  const lines = content.split('\n').filter(l => l.trim().length > 0)
  return lines[lines.length - 1]?.toLowerCase().trim() ?? ''
}

type StructureFingerprint = { lineCount: number; avgLineLength: number; blankRatio: number }

function getStructureFingerprint(content: string): StructureFingerprint {
  const lines = content.split('\n')
  const nonBlank = lines.filter(l => l.trim().length > 0)
  const blank = lines.filter(l => l.trim().length === 0)
  return {
    lineCount: nonBlank.length,
    avgLineLength: nonBlank.length > 0
      ? nonBlank.reduce((sum, l) => sum + l.length, 0) / nonBlank.length
      : 0,
    blankRatio: lines.length > 0 ? blank.length / lines.length : 0,
  }
}

function structureSimilarity(a: StructureFingerprint, b: StructureFingerprint): number {
  const lineCountDiff = Math.abs(a.lineCount - b.lineCount) / Math.max(a.lineCount, b.lineCount, 1)
  const lineLenDiff = Math.abs(a.avgLineLength - b.avgLineLength) / Math.max(a.avgLineLength, b.avgLineLength, 1)
  const blankDiff = Math.abs(a.blankRatio - b.blankRatio)
  return Math.max(0, 1 - (lineCountDiff * 0.5 + lineLenDiff * 0.3 + blankDiff * 0.2))
}

/**
 * Returns 0–100: how similar `newPost` is to the most similar post in `recentPosts`.
 * Weights: content 50%, hook 30%, CTA 10%, structure 10%.
 */
export function calculateSimilarityScore(newPost: string, recentPosts: string[]): number {
  if (recentPosts.length === 0) return 0

  const newTokens = tokenize(newPost)
  const newHook = extractHook(newPost)
  const newCTA = extractCTA(newPost)
  const newStructure = getStructureFingerprint(newPost)

  let maxSimilarity = 0

  for (const recent of recentPosts.slice(0, 30)) {
    if (!recent?.trim()) continue

    const contentSim = jaccardSimilarity(newTokens, tokenize(recent)) * 50
    const hookSim = jaccardSimilarity(tokenize(newHook), tokenize(extractHook(recent))) * 30
    const ctaSim = jaccardSimilarity(tokenize(newCTA), tokenize(extractCTA(recent))) * 10
    const structSim = structureSimilarity(newStructure, getStructureFingerprint(recent)) * 10

    const total = contentSim + hookSim + ctaSim + structSim
    if (total > maxSimilarity) maxSimilarity = total
  }

  return Math.round(Math.min(maxSimilarity, 100))
}

export function isTooSimilar(newPost: string, recentPosts: string[], threshold = 65): boolean {
  return calculateSimilarityScore(newPost, recentPosts) >= threshold
}
