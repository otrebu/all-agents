import type { ProviderType } from "./types";

import { invokeClaudeHaiku } from "./claude";
import { invokeOpencodeHeadless } from "./opencode";

interface ProviderSummaryOptions {
  configuredModel?: string;
  prompt: string;
  provider: ProviderType;
  timeoutMs?: number;
}

const DEFAULT_LIGHTWEIGHT_MODELS: Partial<Record<ProviderType, string>> = {
  claude: "claude-3-5-haiku-latest",
  opencode: "anthropic/claude-3-5-haiku-latest",
};

async function invokeProviderSummary(
  options: ProviderSummaryOptions,
): Promise<null | string> {
  const { configuredModel, prompt, provider, timeoutMs = 30_000 } = options;
  const model = resolveLightweightModelForProvider(provider, configuredModel);

  try {
    switch (provider) {
      case "claude": {
        return await invokeClaudeHaiku({ model, prompt, timeout: timeoutMs });
      }
      case "opencode": {
        const result = await invokeOpencodeHeadless({
          config: { model, provider: "opencode", timeoutMs },
          mode: "headless-async",
          prompt,
        });
        const text = result.result.trim();
        return text === "" ? null : text;
      }
      default: {
        return null;
      }
    }
  } catch {
    return null;
  }
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
  resolveLightweightModelForProvider,
};
export type { ProviderSummaryOptions };
