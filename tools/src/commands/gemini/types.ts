/**
 * Raw JSON response structure from Gemini CLI
 */
export interface GeminiResponse {
  // Code mode fields
  code_snippets?: Array<{
    code: string;
    description: string;
    language: string;
    source_url: string;
  }>;
  consensus?: Array<string>;
  // Deep mode fields
  contradictions?: Array<string>;
  gaps?: Array<string>;
  gotchas?: Array<{ issue: string; solution: string }>;
  key_points: Array<string>;
  libraries?: Array<string>;
  patterns?: Array<string>;
  queries_used: Array<string>;
  quotes: Array<{ source_url: string; text: string }>;
  sources: Array<{ title: string; url: string }>;
  summary: string;
}

/**
 * Configuration for Gemini Research
 */
export interface ResearchOptions {
  mode?: "code" | "deep" | "quick";
  query: string;
}
