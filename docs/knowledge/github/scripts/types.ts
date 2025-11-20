// ===== DATA INTERFACES =====

export interface CodeFile {
  content: string
  language: string
  lines: number
  path: string
  rank: number
  repository: string
  stars: number
  url: string
}

export interface RankedResult extends SearchResult {
  qualityScore: number
  rank: number
}

export interface RawSearchResult {
  html_url: string
  path: string
  repository: {
    description?: string
    full_name: string
    html_url: string
    pushed_at: string
    stargazers_count: number
  }
  score: number
  sha: string
  text_matches?: Array<TextMatch>
}

export interface SearchOptions {
  extension?: string
  filename?: string
  language?: string
  limit?: number
  owner?: string
  path?: string
  repo?: string
}

export interface SearchResult {
  lastPushed: string
  path: string
  repository: string
  score: number
  stars: number
  textMatches: Array<TextMatch>
  url: string
}

export interface TextMatch {
  fragment: string
  matches?: Array<{ indices: Array<number>; text: string; }>
  property: string
}

// ===== ERROR CLASSES =====

export class AuthError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'AuthError'
  }
}

export class FetchError extends Error {
  public cause?: Error;
  public path: string;
  public repository: string;

  constructor(
    message: string,
    options: { cause?: Error; path: string; repository: string }
  ) {
    super(message)
    this.name = 'FetchError'
    this.cause = options.cause
    this.path = options.path
    this.repository = options.repository
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetAt: Date,
    public remaining: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class SearchError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'SearchError'
  }
}
