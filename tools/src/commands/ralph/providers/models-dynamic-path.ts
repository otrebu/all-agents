import { getContextRoot } from "@tools/utils/paths";
import { homedir } from "node:os";
import path from "node:path";

const AAA_RALPH_DYNAMIC_MODELS_PATH = "AAA_RALPH_DYNAMIC_MODELS_PATH";

const DYNAMIC_MODELS_RELATIVE_PATH = path.join(
  "tools",
  "src",
  "commands",
  "ralph",
  "providers",
  "models-dynamic.json",
);
const DYNAMIC_MODELS_USER_CONFIG_PATH = path.join(
  "aaa",
  "ralph",
  "models-dynamic.json",
);

function normalizeCandidatePath(
  candidate: string | undefined,
): string | undefined {
  if (candidate === undefined) {
    return undefined;
  }

  const trimmed = candidate.trim();
  if (trimmed === "") {
    return undefined;
  }

  return path.resolve(trimmed);
}

function resolveContextDynamicModelsPath(): string | undefined {
  try {
    const contextRoot = getContextRoot();
    return path.join(contextRoot, DYNAMIC_MODELS_RELATIVE_PATH);
  } catch {
    return undefined;
  }
}

function resolveDynamicModelsReadPath(): Array<string> {
  const envOverride = normalizeCandidatePath(
    process.env[AAA_RALPH_DYNAMIC_MODELS_PATH],
  );
  const contextPath = resolveContextDynamicModelsPath();
  const userConfigPath = resolveUserConfigDynamicModelsPath();
  const legacyCoLocatedPath = path.join(
    import.meta.dirname,
    "models-dynamic.json",
  );

  return uniquePaths([
    envOverride,
    contextPath,
    userConfigPath,
    legacyCoLocatedPath,
  ]);
}

function resolveDynamicModelsWritePath(): string {
  const envOverride = normalizeCandidatePath(
    process.env[AAA_RALPH_DYNAMIC_MODELS_PATH],
  );
  if (envOverride !== undefined) {
    return envOverride;
  }

  const contextPath = resolveContextDynamicModelsPath();
  if (contextPath !== undefined) {
    return contextPath;
  }

  return resolveUserConfigDynamicModelsPath();
}

function resolveUserConfigDynamicModelsPath(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  const configRoot =
    xdgConfigHome !== undefined && xdgConfigHome !== ""
      ? xdgConfigHome
      : path.join(homedir(), ".config");
  return path.join(configRoot, DYNAMIC_MODELS_USER_CONFIG_PATH);
}

function uniquePaths(candidates: Array<string | undefined>): Array<string> {
  const seen = new Set<string>();
  const unique: Array<string> = [];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== "" && !seen.has(candidate)) {
      seen.add(candidate);
      unique.push(candidate);
    }
  }

  return unique;
}

export {
  AAA_RALPH_DYNAMIC_MODELS_PATH,
  resolveDynamicModelsReadPath,
  resolveDynamicModelsWritePath,
};
