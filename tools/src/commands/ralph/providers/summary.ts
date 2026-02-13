import type { ProviderType } from "./types";

import { invokeClaudeHaiku } from "./claude";
import { invokeCursorHeadless } from "./cursor";
import { invokeCodexHeadless } from "./codex";
import { invokeOpencodeHeadless } from "./opencode";

interface ProviderSummaryOptions {
  configuredModel?: string;
  prompt: string;
  provider: ProviderType;
  timeoutMs?: number;
}

interface SummaryInvokers {
  invokeClaude: typeof invokeClaudeHaiku;
  invokeCodex: typeof invokeCodexHeadless;
  invokeCursor: typeof invokeCursorHeadless;
  invokeOpencode: typeof invokeOpencodeHeadless;
}

const DEFAULT_LIGHTWEIGHT_MODELS: Partial<Record<ProviderType, string>> = {
  claude: "claude-3-5-haiku-latest",
  cursor: "auto",
  codex: "openai/gpt-5.1-codex-mini",
  opencode: "anthropic/claude-3-5-haiku-latest",
};

async function invokeProviderSummary(
  options: ProviderSummaryOptions,
  invokers: Partial<SummaryInvokers> = {},
): Promise<null | string> {
  const { configuredModel, prompt, provider, timeoutMs = 30_000 } = options;
  const model = resolveLightweightModelForProvider(provider, configuredModel);
  const invokeClaude = invokers.invokeClaude ?? invokeClaudeHaiku;
  const invokeCodex = invokers.invokeCodex ?? invokeCodexHeadless;
  const invokeCursor = invokers.invokeCursor ?? invokeCursorHeadless;
  const invokeOpencode = invokers.invokeOpencode ?? invokeOpencodeHeadless;

  try {
    switch (provider) {
      case "claude": {
        const result = await invokeClaude({
          model,
          prompt,
          timeout: timeoutMs,
        });
        return normalizeSummaryResultText(result);
      }
      case "cursor": {
        const result = await invokeCursor({
          config: {
            model,
            persistSession: false,
            provider: "cursor",
            timeoutMs,
          },
          mode: "headless-async",
          prompt,
        });
        return normalizeSummaryResultText(result.result);
      }
      case "codex": {
        const result = await invokeCodex({
          config: { model, provider: "codex", timeoutMs },
          mode: "headless-async",
          prompt,
        });
        const text = result.result.trim();
        return text === "" ? null : text;
      }
      case "opencode": {
        const result = await invokeOpencode({
          config: { model, provider: "opencode", timeoutMs },
          mode: "headless-async",
          prompt,
        });
        return normalizeSummaryResultText(result.result);
      }
      default: {
        return null;
      }
    }
  } catch {
    return null;
  }
}

function normalizeSummaryResultText(text: null | string): null | string {
  if (text === null) {
    return null;
  }

  const normalized = text.trim();
  return normalized === "" ? null : normalized;
}

function resolveLightweightModelForProvider(
  provider: ProviderType,
  configuredModel?: string,
): string | undefined {
  if (configuredModel !== undefined && configuredModel !== "") {
    return configuredModel;
  }

  return DEFAULT_LIGHTWEIGHT_MODELS[provider];
}

export {
  DEFAULT_LIGHTWEIGHT_MODELS,
  invokeProviderSummary,
  normalizeSummaryResultText,
  resolveLightweightModelForProvider,
};
export type { ProviderSummaryOptions, SummaryInvokers };
