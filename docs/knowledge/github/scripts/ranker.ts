import type { RankedResult, SearchResult } from './types.js'

// Configuration: Adaptive filtering thresholds
// Only filter low-star if 70% of results are high-star
const MIN_STARS_THRESHOLD = 10
const HIGH_STAR_RATIO = 0.7

// WHY: Path structure hints at code quality (src/ good, node_modules/ bad)
function calculateCodeQualityScore(result: SearchResult): number {
  let score = 0.5
  const pathLowercase = result.path.toLowerCase()

  // Positive indicators
  if (pathLowercase.includes('/src/') || pathLowercase.includes('/lib/')) score += 0.2
  if (pathLowercase.endsWith('.ts') || pathLowercase.endsWith('.tsx')) score += 0.1
  if (pathLowercase.includes('/components/') || pathLowercase.includes('/hooks/')) score += 0.1

  // Negative indicators
  if (pathLowercase.includes('node_modules')) score -= 0.5
  if (pathLowercase.includes('/dist/') || pathLowercase.includes('/build/')) score -= 0.3
  // Shallow paths often config
  if (pathLowercase.split('/').length < 3) score -= 0.2

  return Math.max(0, Math.min(1, score))
}

// WHY: Weighted scoring balances popularity (stars) with recency and structure
function calculateQualityScore(result: SearchResult): number {
  const starsScore = calculateStarsScore(result.stars)
  const relevanceScore = normalizeScore(result.score, 0, 100)
  const recencyScore = calculateRecencyScore(result.lastPushed)
  const codeQualityScore = calculateCodeQualityScore(result)

  // Weights: Increased star weight to prioritize battle-tested repos
  // Increased from 0.4, decreased from 0.3, unchanged, decreased from 0.1
  return (
    starsScore * 0.5 +
    relevanceScore * 0.25 +
    recencyScore * 0.2 +
    codeQualityScore * 0.05
  )
}

// WHY: Recent activity signals maintained code; decay curve favors <30 days
function calculateRecencyScore(lastPushedISO: string): number {
  const nowMs = Date.now()
  const pushedAtMs = new Date(lastPushedISO).getTime()
  const msPerDay = 1000 * 60 * 60 * 24
  const ageInDays = (nowMs - pushedAtMs) / msPerDay

  if (ageInDays < 7) return 1
  if (ageInDays < 30) return 0.9
  if (ageInDays < 90) return 0.7
  if (ageInDays < 180) return 0.5
  if (ageInDays < 365) return 0.3
  return 0.2
}

// WHY: Log scale prevents 100k-star repos from dominating over 1k-star repos
function calculateStarsScore(stars: number): number {
  // Fixed: 0 stars should score lowest, not better than 1 star
  if (stars === 0) return 0
  const logStars = Math.log10(stars + 1)
  // ~100k stars = score of 1.0
  const maxLogScore = 5
  return Math.min(logStars / maxLogScore, 1)
}

function normalizeScore(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

// WHY: Returns top N results, filtering low-star repos when sufficient high-star alternatives exist
function rankResults(
  results: Array<SearchResult>,
  topN = 10
): Array<RankedResult> {
  const ranked = results
    .map(result => ({
      ...result,
      qualityScore: calculateQualityScore(result),
      rank: 0
    }))
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, topN)

  // Adaptive filtering: only show low-star repos if they're genuinely the best available
  const highStarCount = ranked.filter(r => r.stars >= MIN_STARS_THRESHOLD).length
  const hasEnoughHighStarResults = highStarCount >= topN * HIGH_STAR_RATIO

  const filtered = hasEnoughHighStarResults
    ? ranked.filter(r => r.stars >= MIN_STARS_THRESHOLD).slice(0, topN)
    : ranked

  return filtered.map((result, index) => ({
    ...result,
    rank: index + 1
  }))
}

export { rankResults };
