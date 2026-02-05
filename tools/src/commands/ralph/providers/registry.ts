/**
 * Provider registry for Ralph multi-CLI support
 *
 * Central hub for provider selection and invocation. Wraps provider-specific
 * functions behind a unified interface so build.ts and review/index.ts can
 * work with any supported provider.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md
 */

import type {
  AgentResult,
  InvocationMode,
  InvokerFunction,
  ProviderCapabilities,
  ProviderType,
} from "./types";

import { loadRalphConfig } from "../config";
import { invokeClaudeChat, invokeClaudeHeadlessAsync } from "./claude";
import { invokeOpencode } from "./opencode";
import { PROVIDER_BINARIES } from "./types";

// =============================================================================
// Types
// =============================================================================

/** Options for headless provider invocation */
interface HeadlessProviderOptions {
  /** Grace period in ms before SIGKILL after SIGTERM */
  gracePeriodMs?: number;
  mode: "headless";
  /** Callback invoked on stderr activity */
  onStderrActivity?: () => void;
  /** The prompt to send */
  prompt: string;
  /** Stall timeout in ms (0 = disabled) */
  stallTimeoutMs?: number;
  /** Hard timeout in ms (0 = disabled) */
  timeout?: number;
}

/** Union of provider invocation options, discriminated by mode */
type ProviderInvokeOptions =
  | HeadlessProviderOptions
  | SupervisedProviderOptions;

/** Context for pure provider selection (no side effects) */
interface ProviderSelectionContext {
  /** Explicit provider from CLI flag (highest priority) */
  cliFlag?: string;
  /** Provider from config file */
  configFile?: string;
  /** Provider from RALPH_PROVIDER environment variable */
  envVariable?: string;
}

/** Options for supervised provider invocation */
interface SupervisedProviderOptions {
  /** Extra context to prepend to prompt */
  context?: string;
  mode: "supervised";
  /** Path to prompt file */
  promptPath: string;
  /** Session name for display */
  sessionName: string;
}

/** Error thrown when a provider operation fails */
class ProviderError extends Error {
  override readonly cause?: Error;
  readonly provider: string;

  constructor(provider: string, message: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = "ProviderError";
    this.provider = provider;
    this.cause = cause;
  }
}

// =============================================================================
// Constants
// =============================================================================

const VALID_PROVIDERS = new Set<string>([
  "claude",
  "codex",
  "cursor",
  "gemini",
  "opencode",
  "pi",
]);

// =============================================================================
// Functions (alphabetical order per perfectionist/sort-modules)
// =============================================================================

/**
 * Auto-detect the best available provider by checking binaries in priority order.
 *
 * Checks: claude, opencode, codex, gemini, pi (cursor excluded from auto-detect).
 * Defaults to "claude" if none found.
 *
 * @returns The first available provider, or "claude" as default
 */
async function autoDetectProvider(): Promise<ProviderType> {
  const priority: Array<ProviderType> = [
    "claude",
    "opencode",
    "codex",
    "gemini",
    "pi",
  ];

  // Check all binaries in parallel, then pick the first available in priority order
  const checks = await Promise.all(
    priority.map(async (provider) => ({
      isAvailable: await isBinaryAvailable(PROVIDER_BINARIES[provider]),
      provider,
    })),
  );

  const found = checks.find((check) => check.isAvailable);
  return found?.provider ?? "claude";
}

/** Stub invoker for providers not yet implemented */
function createNotImplementedInvoker(provider: string): InvokerFunction {
  return () => {
    throw new ProviderError(
      provider,
      `Provider '${provider}' is not yet implemented.`,
    );
  };
}

/**
 * Get installation instructions for a provider.
 *
 * @param provider - Provider to get instructions for
 * @returns Install command string
 */
function getInstallInstructions(provider: ProviderType): string {
  const instructions: Record<ProviderType, string> = {
    claude: "npm install -g @anthropic-ai/claude-code",
    codex: "npm install -g @openai/codex",
    cursor: "Download from cursor.com and install cursor-agent",
    gemini: "npm install -g @google/gemini-cli",
    opencode: "npm install -g opencode",
    pi: "npm install -g @anthropic-ai/claude-code",
  };
  return instructions[provider];
}

/**
 * Invoke Claude in headless mode and return AgentResult directly.
 *
 * invokeClaudeHeadlessAsync already returns AgentResult after the
 * normalizeClaudeResult refactor, so no field mapping is needed.
 */
async function invokeClaudeHeadless(
  options: HeadlessProviderOptions,
): Promise<AgentResult | null> {
  return invokeClaudeHeadlessAsync({
    gracePeriodMs: options.gracePeriodMs,
    onStderrActivity: options.onStderrActivity,
    prompt: options.prompt,
    stallTimeoutMs: options.stallTimeoutMs,
    timeout: options.timeout,
  });
}

/**
 * Invoke Claude in supervised mode and normalize result to AgentResult
 *
 * Note: Supervised mode runs interactively (stdio: inherit), so the
 * result text is empty and cost is not captured. Signal interruption
 * is handled internally by invokeClaudeChat (process.exit).
 */
function invokeClaudeSupervised(
  options: SupervisedProviderOptions,
): AgentResult | null {
  const startTime = Date.now();

  const chatResult = invokeClaudeChat(
    options.promptPath,
    options.sessionName,
    options.context,
  );

  const durationMs = Date.now() - startTime;

  // invokeClaudeChat handles signal interruption internally (process.exit)
  // If it returns, interrupted is always false
  if (!chatResult.success) {
    return null;
  }

  return { costUsd: 0, durationMs, result: "", sessionId: "" };
}

/**
 * Invoke a provider with the given options.
 *
 * Validates that the provider binary is available and that the provider
 * is implemented before invoking. Currently only "claude" is implemented
 * via direct function calls; other providers will use the REGISTRY pattern
 * once their implementations are added.
 *
 * @param provider - Which provider to use
 * @param options - Invocation options (discriminated by mode)
 * @returns AgentResult on success, null on failure
 * @throws ProviderError when binary not found or provider not implemented
 */
async function invokeWithProvider(
  provider: ProviderType,
  options: ProviderInvokeOptions,
): Promise<AgentResult | null> {
  // Claude uses direct invocation (legacy path) while it's being migrated
  // to the REGISTRY pattern. Other providers go through REGISTRY.
  if (provider === "claude") {
    if (options.mode === "headless") {
      return invokeClaudeHeadless(options);
    }
    return invokeClaudeSupervised(options);
  }

  const binary = PROVIDER_BINARIES[provider];

  // For non-Claude providers: check binary availability lazily
  if (!(await isBinaryAvailable(binary))) {
    throw new ProviderError(
      provider,
      `Provider '${provider}' is not available. Binary '${binary}' not found in PATH.\n` +
        `Install: ${getInstallInstructions(provider)}`,
    );
  }

  // Check if provider is implemented in the registry
  const capabilities = REGISTRY[provider];
  if (!capabilities.available) {
    throw new ProviderError(
      provider,
      `Provider '${provider}' is not yet implemented.`,
    );
  }

  const invokeConfig: { provider: ProviderType } = { provider };
  return capabilities.invoke({
    config: invokeConfig,
    mode: options.mode === "headless" ? "headless-async" : "supervised",
    prompt: options.mode === "headless" ? options.prompt : "",
  });
}

/**
 * Check if a binary is available in PATH using the `which` command.
 *
 * @param binary - Binary name to check (e.g., "claude", "opencode")
 * @returns true if the binary is found in PATH
 */
async function isBinaryAvailable(binary: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", binary], {
      stderr: "pipe",
      stdout: "pipe",
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Load provider from config file (best effort).
 * Returns undefined if config loading fails.
 */
function loadConfigProvider(): string | undefined {
  try {
    const config = loadRalphConfig();
    return config.provider;
  } catch {
    return undefined;
  }
}

/**
 * Select the provider to use based on priority:
 * CLI flag > env var > config > auto-detect (defaults to "claude")
 *
 * This is a pure function with no side effects. Use selectProviderFromEnv()
 * to read from process.argv and process.env automatically.
 *
 * @param context - Provider selection context with explicit sources
 * @returns Validated ProviderType
 */
function selectProvider(context: ProviderSelectionContext): ProviderType {
  // Priority 1: CLI flag (highest)
  if (context.cliFlag !== undefined && context.cliFlag !== "") {
    return validateProvider(context.cliFlag);
  }

  // Priority 2: Environment variable
  if (context.envVariable !== undefined && context.envVariable !== "") {
    return validateProvider(context.envVariable);
  }

  // Priority 3: Config file
  if (context.configFile !== undefined && context.configFile !== "") {
    return validateProvider(context.configFile);
  }

  // Priority 4: Auto-detect (default to claude)
  return "claude";
}

/**
 * Read provider selection from environment sources and select.
 *
 * Reads process.argv for --provider flag, process.env.RALPH_PROVIDER,
 * and attempts to load config file for provider preference.
 *
 * @returns Validated ProviderType
 */
function selectProviderFromEnv(): ProviderType {
  // Read --provider flag from process.argv
  const providerFlagIndex = process.argv.indexOf("--provider");
  const cliFlag =
    providerFlagIndex !== -1 && providerFlagIndex + 1 < process.argv.length
      ? process.argv[providerFlagIndex + 1]
      : undefined;

  // Read RALPH_PROVIDER env var
  const envVariable = process.env.RALPH_PROVIDER;

  // Read config file (best effort)
  const configFile = loadConfigProvider();

  return selectProvider({ cliFlag, configFile, envVariable });
}

/**
 * Validate that a string is a valid ProviderType.
 *
 * @param provider - String to validate
 * @returns Valid ProviderType
 * @throws ProviderError if invalid, with list of valid options
 */
function validateProvider(provider: string): ProviderType {
  if (!VALID_PROVIDERS.has(provider)) {
    const valid = [...VALID_PROVIDERS].sort().join(", ");
    throw new ProviderError(
      provider,
      `Unknown provider: ${provider}. Valid providers: ${valid}`,
    );
  }
  return provider as ProviderType;
}

// =============================================================================
// Registry Constant (depends on createNotImplementedInvoker)
// =============================================================================

/**
 * Registry of all supported providers and their capabilities.
 *
 * All providers start with available: false. Provider implementations
 * set available: true and replace the invoke function when ready.
 */
const REGISTRY: Record<ProviderType, ProviderCapabilities> = {
  claude: {
    available: false,
    invoke: createNotImplementedInvoker("claude"),
    supportedModes: [
      "supervised",
      "headless-sync",
      "headless-async",
    ] satisfies Array<InvocationMode>,
  },
  codex: {
    available: false,
    invoke: createNotImplementedInvoker("codex"),
    supportedModes: [] satisfies Array<InvocationMode>,
  },
  cursor: {
    available: false,
    invoke: createNotImplementedInvoker("cursor"),
    supportedModes: [] satisfies Array<InvocationMode>,
  },
  gemini: {
    available: false,
    invoke: createNotImplementedInvoker("gemini"),
    supportedModes: [] satisfies Array<InvocationMode>,
  },
  opencode: {
    available: true,
    invoke: invokeOpencode,
    supportedModes: [
      "supervised",
      "headless-sync",
      "headless-async",
    ] satisfies Array<InvocationMode>,
  },
  pi: {
    available: false,
    invoke: createNotImplementedInvoker("pi"),
    supportedModes: [] satisfies Array<InvocationMode>,
  },
};

// =============================================================================
// Exports
// =============================================================================

export {
  autoDetectProvider,
  getInstallInstructions,
  type HeadlessProviderOptions,
  invokeWithProvider,
  isBinaryAvailable,
  ProviderError,
  type ProviderInvokeOptions,
  type ProviderSelectionContext,
  REGISTRY,
  selectProvider,
  selectProviderFromEnv,
  type SupervisedProviderOptions,
  validateProvider,
};
