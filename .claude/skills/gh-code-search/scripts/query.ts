import type { SearchOptions } from './types.js'

interface QueryIntent {
  query: string
  options: SearchOptions
}

// Common patterns for query enhancement
const PATTERNS: Record<string, Partial<SearchOptions>> = {
  'react hook': { language: 'typescript', extension: 'tsx' },
  'react component': { language: 'typescript', extension: 'tsx' },
  'express middleware': { language: 'javascript' },
  'eslint config': { filename: '.eslintrc' },
  'typescript config': { filename: 'tsconfig.json' },
  'dockerfile': { filename: 'Dockerfile' },
  'github actions': { path: '.github/workflows', extension: 'yml' },
  'claude code skill': { filename: 'SKILL.md' },
}

export function buildQueryIntent(userQuery: string): QueryIntent {
  const lowerQuery = userQuery.toLowerCase()
  let options: SearchOptions = { limit: 100 }
  let query = userQuery

  // Check for pattern matches
  for (const [pattern, opts] of Object.entries(PATTERNS)) {
    if (lowerQuery.includes(pattern)) {
      options = { ...options, ...opts }
      break
    }
  }

  // Extract repo constraint (e.g., "in repo:user/repo")
  const repoMatch = userQuery.match(/(?:in|from|repo:?)\s+([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/i)
  if (repoMatch) {
    options.repo = repoMatch[1]
    query = query.replace(repoMatch[0], '').trim()
  }

  return { query, options }
}
