/**
 * Provider abstraction types for Ralph multi-CLI support
 *
 * Defines discriminated union types for all supported AI coding agent providers,
 * normalized result interfaces, and invocation contracts.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
 */

// =============================================================================
// Provider & Invocation Types
// =============================================================================

/** Normalized result from any provider invocation */
interface AgentResult {
  /** Total cost in US dollars */
  costUsd: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** The response text from the agent */
  result: string;
  /** Provider session identifier */
  sessionId: string;
  /** Token usage breakdown (not all providers expose this) */
  tokenUsage?: TokenUsage;
}

/** Base configuration shared by all providers */
interface BaseProviderConfig {
  /** Timeout in milliseconds for the provider session */
  timeoutMs?: number;
  /** Working directory for the provider session */
  workingDirectory?: string;
}

// =============================================================================
// Agent Result
// =============================================================================

/** Claude Code CLI configuration */
interface ClaudeConfig extends BaseProviderConfig {
  provider: "claude";
}

/** OpenAI Codex CLI configuration */
interface CodexConfig extends BaseProviderConfig {
  model?: string;
  provider: "codex";
}

// =============================================================================
// Provider Configs (Discriminated Union)
// =============================================================================

/** Cursor agent CLI configuration */
interface CursorConfig extends BaseProviderConfig {
  model?: string;
  provider: "cursor";
}

/** Google Gemini CLI configuration */
interface GeminiConfig extends BaseProviderConfig {
  model?: string;
  provider: "gemini";
}

/** How a provider session is invoked */
type InvocationMode = "headless-async" | "headless-sync" | "supervised";

/** Options passed to a provider invocation */
interface InvocationOptions {
  /** Provider-specific configuration */
  config: ProviderConfig;
  /** How the session should be invoked */
  mode: InvocationMode;
  /** The prompt to send to the provider */
  prompt: string;
}

/** Function signature for invoking a provider */
type InvokerFunction = (options: InvocationOptions) => Promise<AgentResult>;

/** OpenCode CLI configuration */
interface OpencodeConfig extends BaseProviderConfig {
  /** Model in provider/model format, e.g., "anthropic/claude-sonnet-4-20250514" */
  model?: string;
  provider: "opencode";
}

/** Pi Mono CLI configuration */
interface PiConfig extends BaseProviderConfig {
  model?: string;
  provider: "pi";
}

// =============================================================================
// Invocation Types
// =============================================================================

/** Capabilities exposed by a provider implementation */
interface ProviderCapabilities {
  /** Whether the provider binary is available */
  available: boolean;
  /** Function to invoke the provider */
  invoke: InvokerFunction;
  /** Invocation modes this provider supports */
  supportedModes: Array<InvocationMode>;
  /** Whether provider supports headless invocation in Ralph runtime */
  supportsHeadless: boolean;
  /** Whether provider supports true interactive supervised mode */
  supportsInteractiveSupervised: boolean;
  /** Whether provider can discover models dynamically */
  supportsModelDiscovery: boolean;
  /** Whether provider supports session export/discovery for telemetry */
  supportsSessionExport: boolean;
}

/** Union of all provider-specific configurations */
type ProviderConfig =
  | ClaudeConfig
  | CodexConfig
  | CursorConfig
  | GeminiConfig
  | OpencodeConfig
  | PiConfig;

/** Supported AI coding agent providers */
type ProviderType =
  | "claude"
  | "codex"
  | "cursor"
  | "gemini"
  | "opencode"
  | "pi";

/** Token usage breakdown from a provider session */
interface TokenUsage {
  /** Cache read tokens (provider-specific, may not be available) */
  cacheRead?: number;
  /** Cache write tokens (provider-specific, may not be available) */
  cacheWrite?: number;
  /** Input tokens consumed */
  input: number;
  /** Output tokens generated */
  output: number;
  /** Reasoning tokens (provider-specific, may not be available) */
  reasoning?: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Maps each provider to its CLI binary name */
const PROVIDER_BINARIES: Record<ProviderType, string> = {
  claude: "claude",
  codex: "codex",
  cursor: "agent",
  gemini: "gemini",
  opencode: "opencode",
  pi: "pi",
} as const;

// =============================================================================
// Exports
// =============================================================================

export {
  type AgentResult,
  type BaseProviderConfig,
  type ClaudeConfig,
  type CodexConfig,
  type CursorConfig,
  type GeminiConfig,
  type InvocationMode,
  type InvocationOptions,
  type InvokerFunction,
  type OpencodeConfig,
  type PiConfig,
  PROVIDER_BINARIES,
  type ProviderCapabilities,
  type ProviderConfig,
  type ProviderType,
  type TokenUsage,
};
