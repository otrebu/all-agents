import type { TokenUsage } from "../types";
import type { ProviderType } from "./types";

import {
  CLAUDE_SESSION_ADAPTER,
  type DiscoveredSession,
} from "./session-claude";
import { CODEX_SESSION_ADAPTER } from "./session-codex";
import { OPENCODE_SESSION_ADAPTER } from "./session-opencode";

interface ProviderSession {
  path: null | string;
  payload: string;
  sessionId: string;
}

interface ProviderSessionAdapter {
  discoverRecentSession: (
    afterTimestamp: number,
    repoRoot: string,
  ) => DiscoveredSession | null;
  extractDurationMs: (session: ProviderSession) => number;
  extractFilesChanged: (
    session: ProviderSession,
    repoRoot: string,
  ) => Array<string>;
  extractTokenUsage: (session: ProviderSession) => TokenUsage | undefined;
  extractToolCalls: (session: ProviderSession) => number;
  resolveSession: (
    sessionId: string,
    repoRoot: string,
  ) => null | ProviderSession;
}

interface ProviderSessionMetrics {
  durationMs: number;
  filesChanged: Array<string>;
  tokenUsage?: TokenUsage;
  toolCalls: number;
}

const EMPTY_SESSION_METRICS: ProviderSessionMetrics = {
  durationMs: 0,
  filesChanged: [],
  toolCalls: 0,
};

const NOOP_SESSION_ADAPTER: ProviderSessionAdapter = {
  discoverRecentSession: () => null,
  extractDurationMs: () => 0,
  extractFilesChanged: () => [],
  extractTokenUsage: () => void 0,
  extractToolCalls: () => 0,
  resolveSession: () => null,
};

const SESSION_ADAPTERS: Record<ProviderType, ProviderSessionAdapter> = {
  claude: CLAUDE_SESSION_ADAPTER,
  codex: CODEX_SESSION_ADAPTER,
  cursor: NOOP_SESSION_ADAPTER,
  gemini: NOOP_SESSION_ADAPTER,
  opencode: OPENCODE_SESSION_ADAPTER,
  pi: NOOP_SESSION_ADAPTER,
};

function discoverRecentSessionForProvider(
  provider: ProviderType,
  afterTimestamp: number,
  repoRoot: string,
): DiscoveredSession | null {
  try {
    return getProviderSessionAdapter(provider).discoverRecentSession(
      afterTimestamp,
      repoRoot,
    );
  } catch {
    return null;
  }
}

function extractSessionMetricsForProvider(
  provider: ProviderType,
  session: ProviderSession,
  repoRoot: string,
): ProviderSessionMetrics {
  const adapter = getProviderSessionAdapter(provider);

  try {
    return {
      durationMs: adapter.extractDurationMs(session),
      filesChanged: adapter.extractFilesChanged(session, repoRoot),
      tokenUsage: adapter.extractTokenUsage(session),
      toolCalls: adapter.extractToolCalls(session),
    };
  } catch {
    return EMPTY_SESSION_METRICS;
  }
}

function getProviderSessionAdapter(
  provider: ProviderType,
): ProviderSessionAdapter {
  return SESSION_ADAPTERS[provider];
}

function resolveSessionForProvider(
  provider: ProviderType,
  sessionId: string,
  repoRoot: string,
): null | ProviderSession {
  try {
    return getProviderSessionAdapter(provider).resolveSession(
      sessionId,
      repoRoot,
    );
  } catch {
    return null;
  }
}

export {
  discoverRecentSessionForProvider,
  EMPTY_SESSION_METRICS,
  extractSessionMetricsForProvider,
  getProviderSessionAdapter,
  NOOP_SESSION_ADAPTER,
  resolveSessionForProvider,
  SESSION_ADAPTERS,
};
export type { ProviderSession, ProviderSessionAdapter, ProviderSessionMetrics };
