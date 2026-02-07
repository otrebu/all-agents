/**
 * Provider registry for Ralph multi-CLI support
 *
 * Central hub for provider selection and invocation. Wraps provider-specific
 * functions behind a unified interface so build.ts and review/index.ts can
 * work with any supported provider.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md
 */

import { existsSync, readFileSync } from "node:fs";

import type {
  AgentResult,
  InvocationMode,
  InvokerFunction,
  ProviderCapabilities,
  ProviderConfig,
  ProviderFailureOutcome,
  ProviderFailureReason,
  ProviderInvocationOutcome,
  ProviderType,
} from "./types";

import { loadRalphConfig } from "../config";
import {
  createClaudeFailureOutcome,
  createClaudeNullOutcome,
  invokeClaudeChat,
  invokeClaudeHeadlessAsync,
} from "./claude";
import { invokeOpencode, mapOpencodeInvocationError } from "./opencode";
import { PROVIDER_BINARIES } from "./types";

// =============================================================================
// Types
// =============================================================================

/** Options for headless provider invocation */
interface HeadlessProviderOptions {
  /** Grace period in ms before SIGKILL after SIGTERM */
  gracePeriodMs?: number;
  mode: "headless";
  /** Model to use for invocation (provider-specific format) */
  model?: string;
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

/** Runtime invocation modes exposed by Ralph CLI entry points */
type RuntimeInvocationMode = "headless" | "supervised";

/** Options for supervised provider invocation */
interface SupervisedProviderOptions {
  /** Extra context to prepend to prompt */
  context?: string;
  mode: "supervised";
  /** Model to use for invocation (provider-specific format) */
  model?: string;
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

const GENERIC_FAILURE_REASON_RULES: Array<{
  patterns: Array<string>;
  reason: ProviderFailureReason;
}> = [
  {
    patterns: ["interrupted", "sigint", "sigterm", "cancelled", "canceled"],
    reason: "interrupted",
  },
  { patterns: ["timed out", "timeout", "stall"], reason: "timeout" },
  {
    patterns: ["api key", "unauthorized", "authentication", "forbidden"],
    reason: "auth",
  },
  {
    patterns: [
      "unknown model",
      "invalid model",
      "model not found",
      "unsupported model",
    ],
    reason: "model",
  },
  { patterns: ["malformed", "parse", "json"], reason: "malformed_output" },
  {
    patterns: [
      "rate limit",
      "temporarily unavailable",
      "overloaded",
      "connection",
      "network",
      "transport",
    ],
    reason: "transport",
  },
  {
    patterns: [
      "config",
      "configuration",
      "not found in path",
      "install:",
      "not enabled",
      "does not support",
    ],
    reason: "configuration",
  },
];

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
 * Create a normalized failure outcome from a provider invocation error.
 */
function createProviderInvocationFailure(
  provider: ProviderType,
  error: unknown,
): ProviderFailureOutcome {
  if (provider === "claude") {
    return createClaudeFailureOutcome(error);
  }

  if (provider === "opencode") {
    return mapOpencodeInvocationError(error);
  }

  const message =
    error instanceof Error && error.message !== ""
      ? error.message
      : String(error);
  const reason = getGenericFailureReason(message.toLowerCase());
  const status =
    reason === "timeout" || reason === "transport" ? "retryable" : "fatal";

  return { message, provider, reason, status };
}

/**
 * Render a provider-neutral failure line for CLI output.
 */
function formatProviderFailureOutcome(outcome: ProviderFailureOutcome): string {
  return `${outcome.provider} ${outcome.status} (${outcome.reason}): ${outcome.message}`;
}

/**
 * Derive a generic failure reason from an error message.
 */
function getGenericFailureReason(
  normalizedMessage: string,
): ProviderFailureReason {
  for (const rule of GENERIC_FAILURE_REASON_RULES) {
    if (rule.patterns.some((pattern) => normalizedMessage.includes(pattern))) {
      return rule.reason;
    }
  }

  return "unknown";
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
    pi: "npm install -g @pi-mono/pi",
  };
  return instructions[provider];
}

/**
 * List providers that are currently enabled and support a runtime mode.
 */
function getProvidersWithRuntimeMode(
  mode: RuntimeInvocationMode,
): Array<ProviderType> {
  const providers = (
    Object.entries(REGISTRY) as Array<[ProviderType, ProviderCapabilities]>
  )
    .filter(([, capabilities]) =>
      mode === "headless"
        ? isProviderModeSupported(capabilities, "headless")
        : isProviderModeSupported(capabilities, "supervised"),
    )
    .map(([provider]) => provider);

  providers.sort();
  return providers;
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
    model: options.model,
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

  const chatResult = invokeClaudeChat(options.promptPath, options.sessionName, {
    extraContext: options.context,
    model: options.model,
  });

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
  await validateProviderInvocationPreflight(provider, options.mode);

  // Claude uses direct invocation (legacy path) while it's being migrated
  // to the REGISTRY pattern. Other providers go through REGISTRY.
  if (provider === "claude") {
    if (options.mode === "headless") {
      return invokeClaudeHeadless(options);
    }
    return invokeClaudeSupervised(options);
  }

  const capabilities = REGISTRY[provider];

  const invokeConfig = makeProviderConfig(provider, options.model);
  const prompt =
    options.mode === "headless"
      ? options.prompt
      : makeSupervisedPrompt(provider, options);

  return capabilities.invoke({
    config: invokeConfig,
    mode: options.mode === "headless" ? "headless-async" : "supervised",
    prompt,
  });
}

/**
 * Invoke a provider and normalize success/retryable/fatal outcomes.
 */
async function invokeWithProviderOutcome(
  provider: ProviderType,
  options: ProviderInvokeOptions,
): Promise<ProviderInvocationOutcome> {
  try {
    const result = await invokeWithProvider(provider, options);

    if (result !== null) {
      return { provider, result, status: "success" };
    }

    if (provider === "claude") {
      return createClaudeNullOutcome(options.mode);
    }

    return {
      message: `${provider} invocation returned no result payload.`,
      provider,
      reason: "transport",
      status: "retryable",
    };
  } catch (error) {
    return createProviderInvocationFailure(provider, error);
  }
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
 * Check whether a provider capability entry supports a runtime mode.
 */
function isProviderModeSupported(
  capabilities: ProviderCapabilities,
  mode: RuntimeInvocationMode,
): boolean {
  if (!capabilities.available) {
    return false;
  }

  if (mode === "headless") {
    return (
      capabilities.supportsHeadless &&
      (capabilities.supportedModes.includes("headless-async") ||
        capabilities.supportedModes.includes("headless-sync"))
    );
  }

  return (
    capabilities.supportsInteractiveSupervised &&
    capabilities.supportedModes.includes("supervised")
  );
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

/** Build provider config for registry invocation */
function makeProviderConfig(
  provider: ProviderType,
  model: string | undefined,
): ProviderConfig {
  if (provider === "claude") {
    return { provider };
  }

  return { model, provider };
}

/** Build supervised prompt from prompt file and optional context */
function makeSupervisedPrompt(
  provider: ProviderType,
  options: SupervisedProviderOptions,
): string {
  if (!existsSync(options.promptPath)) {
    throw new ProviderError(
      provider,
      `Prompt not found for supervised mode: ${options.promptPath}`,
    );
  }

  const promptContent = readFileSync(options.promptPath, "utf8");
  if (options.context !== undefined && options.context !== "") {
    return `${options.context}\n\n${promptContent}`;
  }

  return promptContent;
}

/**
 * Resolve provider selection using priority:
 * CLI flag > env var > config file > auto-detect
 *
 * If `envVariable` or `configFile` are omitted in context, they are loaded
 * from process environment / config file automatically.
 */
async function resolveProvider(
  context: ProviderSelectionContext = {},
): Promise<ProviderType> {
  const {
    cliFlag,
    configFile: contextConfigFile,
    envVariable: contextEnvVariable,
  } = context;
  const envVariable = contextEnvVariable ?? process.env.RALPH_PROVIDER;
  const configFile = contextConfigFile ?? loadConfigProvider();

  // Priority 1: CLI flag (highest)
  if (cliFlag !== undefined && cliFlag !== "") {
    return validateProvider(cliFlag);
  }

  // Priority 2: Environment variable
  if (envVariable !== undefined && envVariable !== "") {
    return validateProvider(envVariable);
  }

  // Priority 3: Config file
  if (configFile !== undefined && configFile !== "") {
    return validateProvider(configFile);
  }

  // Priority 4: Auto-detect
  return autoDetectProvider();
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

/**
 * Run provider preflight checks before any process spawn.
 *
 * Validates:
 * 1) Provider is enabled in this Ralph runtime
 * 2) Requested runtime mode is supported by declared capabilities
 * 3) Provider binary exists in PATH
 */
async function validateProviderInvocationPreflight(
  provider: ProviderType,
  mode: RuntimeInvocationMode,
): Promise<void> {
  const capabilities = REGISTRY[provider];

  if (!capabilities.available) {
    const enabledProviders = (
      Object.entries(REGISTRY) as Array<[ProviderType, ProviderCapabilities]>
    )
      .filter(([, value]) => value.available)
      .map(([name]) => name)
      .sort()
      .join(", ");

    throw new ProviderError(
      provider,
      `Provider '${provider}' is not enabled in this Ralph runtime. ` +
        `Try one of: ${enabledProviders}.`,
    );
  }

  if (!isProviderModeSupported(capabilities, mode)) {
    if (mode === "supervised") {
      const supervisedProviders =
        getProvidersWithRuntimeMode("supervised").join(", ");
      throw new ProviderError(
        provider,
        `Provider '${provider}' does not support interactive supervised mode in Ralph yet. ` +
          `Use '--headless' for this provider, or choose a supervised-capable provider: ` +
          `${supervisedProviders}.`,
      );
    }

    const headlessProviders =
      getProvidersWithRuntimeMode("headless").join(", ");
    throw new ProviderError(
      provider,
      `Provider '${provider}' does not support headless mode in Ralph. ` +
        `Choose a headless-capable provider: ${headlessProviders}.`,
    );
  }

  const binary = PROVIDER_BINARIES[provider];
  if (!(await isBinaryAvailable(binary))) {
    throw new ProviderError(
      provider,
      `Provider '${provider}' is not available. Binary '${binary}' not found in PATH.\n` +
        `Install: ${getInstallInstructions(provider)}`,
    );
  }
}

// =============================================================================
// Registry Constant (depends on createNotImplementedInvoker)
// =============================================================================

/**
 * Registry of all supported providers and their capabilities.
 *
 * Each provider declares whether it is currently enabled in Ralph runtime,
 * plus mode/session/model capability metadata for preflight checks.
 */
const REGISTRY: Record<ProviderType, ProviderCapabilities> = {
  claude: {
    available: true,
    invoke: createNotImplementedInvoker("claude"),
    supportedModes: [
      "supervised",
      "headless-sync",
      "headless-async",
    ] satisfies Array<InvocationMode>,
    supportsHeadless: true,
    supportsInteractiveSupervised: true,
    supportsModelDiscovery: false,
    supportsSessionExport: true,
  },
  codex: {
    available: false,
    invoke: createNotImplementedInvoker("codex"),
    supportedModes: [] satisfies Array<InvocationMode>,
    supportsHeadless: false,
    supportsInteractiveSupervised: false,
    supportsModelDiscovery: false,
    supportsSessionExport: false,
  },
  cursor: {
    available: false,
    invoke: createNotImplementedInvoker("cursor"),
    supportedModes: [] satisfies Array<InvocationMode>,
    supportsHeadless: false,
    supportsInteractiveSupervised: false,
    supportsModelDiscovery: false,
    supportsSessionExport: false,
  },
  gemini: {
    available: false,
    invoke: createNotImplementedInvoker("gemini"),
    supportedModes: [] satisfies Array<InvocationMode>,
    supportsHeadless: false,
    supportsInteractiveSupervised: false,
    supportsModelDiscovery: false,
    supportsSessionExport: false,
  },
  opencode: {
    available: true,
    invoke: invokeOpencode,
    supportedModes: [
      "supervised",
      "headless-sync",
      "headless-async",
    ] satisfies Array<InvocationMode>,
    supportsHeadless: true,
    supportsInteractiveSupervised: true,
    supportsModelDiscovery: true,
    supportsSessionExport: true,
  },
  pi: {
    available: false,
    invoke: createNotImplementedInvoker("pi"),
    supportedModes: [] satisfies Array<InvocationMode>,
    supportsHeadless: false,
    supportsInteractiveSupervised: false,
    supportsModelDiscovery: false,
    supportsSessionExport: false,
  },
};

// =============================================================================
// Exports
// =============================================================================

export {
  autoDetectProvider,
  createProviderInvocationFailure,
  formatProviderFailureOutcome,
  getInstallInstructions,
  type HeadlessProviderOptions,
  invokeWithProvider,
  invokeWithProviderOutcome,
  isBinaryAvailable,
  ProviderError,
  type ProviderInvokeOptions,
  type ProviderSelectionContext,
  REGISTRY,
  resolveProvider,
  type RuntimeInvocationMode,
  selectProvider,
  selectProviderFromEnv,
  type SupervisedProviderOptions,
  validateProvider,
  validateProviderInvocationPreflight,
};
