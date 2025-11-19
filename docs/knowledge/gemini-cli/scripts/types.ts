/**
 * Configuration for Gemini Research
 */
export interface ResearchOptions {
  query: string
  mode?: 'quick' | 'deep' | 'code'
}

/**
 * Raw JSON response structure from Gemini CLI
 */
export interface GeminiResponse {
  queries_used: string[]
  sources: {
    title: string
    url: string
  }[]
  key_points: string[]
  quotes: {
    text: string
    source_url: string
  }[]
  summary: string
  // Deep mode fields
  contradictions?: string[]
  consensus?: string[]
  gaps?: string[]
  // Code mode fields
  code_snippets?: {
    language: string
    code: string
    source_url: string
    description: string
  }[]
  patterns?: string[]
  libraries?: string[]
  gotchas?: {
    issue: string
    solution: string
  }[]
}

