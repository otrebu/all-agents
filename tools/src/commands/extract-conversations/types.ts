/**
 * Types for conversation extraction and analysis
 */

export interface ConversationExchange {
  assistant: string;
  timestamp: string;
  user: string;
}

export interface ConversationMessage {
  gitBranch?: string;
  message?: { content: string; role: string };
  parentUuid?: null | string;
  sessionId?: string;
  summary?: string;
  timestamp?: string;
  type: "assistant" | "file-history-snapshot" | "summary" | "user";
  uuid?: string;
}

export interface ConversationSession {
  branch?: string;
  filePath: string;
  id: string;
  messages: Array<ConversationMessage>;
  startTime: string;
  summary: Array<string>;
}

export interface ExtractedConversation {
  branch?: string;
  exchanges: Array<ConversationExchange>;
  sessionId: string;
  startTime: string;
  summary: string;
}

export interface ExtractionOptions {
  format: "json" | "markdown";
  limit: number;
  projectPath?: string;
  skip?: number;
}
