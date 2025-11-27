import type { SearchOptions } from './types.js'

interface QueryIntent {
  options: SearchOptions
  query: string
}

// Common patterns for query enhancement
const PATTERNS: Record<string, Partial<SearchOptions>> = {
  'claude code skill': { filename: 'SKILL.md' },
  'dockerfile': { filename: 'Dockerfile' },
  'eslint config': { filename: '.eslintrc' },
  'express middleware': { language: 'javascript' },
  'github actions': { extension: 'yml', path: '.github/workflows' },
  'react component': { extension: 'tsx', language: 'typescript' },
  'react hook': { extension: 'tsx', language: 'typescript' },
  'typescript config': { filename: 'tsconfig.json' },
}

function buildQueryIntent(userQuery: string): QueryIntent {
  const lowerQuery = userQuery.toLowerCase()
  let options: SearchOptions = { limit: 100 }
  let query = userQuery

  // Check for pattern matches
  for (const [pattern, patternOptions] of Object.entries(PATTERNS)) {
    if (lowerQuery.includes(pattern)) {
      options = { ...options, ...patternOptions }
      break
    }
  }

  // Extract repo constraint (e.g., "in repo:user/repo")
  const repoMatch = /(?:in|from|repo:?)\s+(?<repoName>[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/i.exec(userQuery)
  const repoName = repoMatch?.groups?.repoName
  if (repoMatch && repoName !== undefined && repoName !== '') {
    options.repo = repoName
    query = query.replace(repoMatch[0], '').trim()
  }

  return { options, query }
}

export default buildQueryIntent;
