---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/MILESTONE.md
  - @context/foundations/quality/gate-standards.md
---

## Story: Provider Foundation Architecture

### Narrative
As a ralph developer, I want a unified provider abstraction layer so that I can add support for new AI coding agents without duplicating code or breaking existing functionality.

### Persona
**The Ralph Developer** - Someone extending ralph's capabilities to support multiple AI CLI providers. They care about:
- Clean, maintainable code that follows project conventions
- Type safety and clear interfaces
- Easy extensibility for future providers
- Zero breaking changes to existing workflows

### Context
Ralph currently has tight coupling to Claude Code CLI. As the AI coding agent ecosystem grows (OpenCode, Codex, Gemini CLI, Pi Mono), we need to abstract the provider layer to support multiple CLIs while maintaining a unified interface. This foundation story creates the core types, registry pattern, and utilities that all providers will use.

### Acceptance Criteria
- [ ] Provider types use discriminated unions (no classes)
- [ ] Registry pattern supports lazy availability checking
- [ ] Shared utilities extracted from existing claude.ts (stall detection, timeouts)
- [ ] Provider selection follows priority: CLI flag > env var > config > auto-detect
- [ ] Clear error messages when provider binary not found
- [ ] All code follows gate-standards (linting, formatting, type safety)

### Tasks
- [TASK-036-provider-types](./tasks/TASK-036-provider-types.md) - Provider types with discriminated unions
- [TASK-037-provider-registry](./tasks/TASK-037-provider-registry.md) - Provider registry with selection and lazy availability
- [TASK-038-shared-utilities](./tasks/TASK-038-shared-utilities.md) - Extract shared utilities (stall detection, timeouts)
- *Additional tasks to be created for provider implementations*

### Notes
**Architecture Decisions:**
- Use discriminated unions over classes per coding standards
- Functions over methods, decisions at edges
- Provider selection priority: CLI flag > env var > config > auto-detect
- Lazy availability checking with helpful error messages

**Type Design (No Classes):**

**Provider Types:**
```typescript
// providers/types.ts

export type ProviderType = 'claude' | 'opencode' | 'codex' | 'gemini' | 'pi' | 'cursor';

export type InvocationMode = 'supervised' | 'headless-sync' | 'headless-async';

// Common result interface normalized from all providers
export interface AgentResult {
  result: string;
  costUsd: number;
  durationMs: number;
  sessionId: string;
  tokenUsage?: {
    input: number;
    output: number;
    reasoning?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
}

// Base configuration shared by all providers
export interface BaseProviderConfig {
  timeoutMs?: number;
  workingDirectory?: string;
}

// Discriminated unions for provider-specific configs
export interface ClaudeConfig extends BaseProviderConfig {
  provider: 'claude';
  // Claude uses native model names
}

export interface OpencodeConfig extends BaseProviderConfig {
  provider: 'opencode';
  model?: string;  // provider/model format, e.g., "anthropic/claude-sonnet-4-20250514"
}

export interface CodexConfig extends BaseProviderConfig {
  provider: 'codex';
  model?: string;
}

export interface GeminiConfig extends BaseProviderConfig {
  provider: 'gemini';
  model?: string;
}

export interface PiConfig extends BaseProviderConfig {
  provider: 'pi';
  model?: string;
}

export interface CursorConfig extends BaseProviderConfig {
  provider: 'cursor';
  model?: string;
}

export type ProviderConfig = 
  | ClaudeConfig 
  | OpencodeConfig 
  | CodexConfig 
  | GeminiConfig 
  | PiConfig 
  | CursorConfig;

// Invocation options passed to all providers
export interface InvocationOptions {
  mode: InvocationMode;
  prompt: string;
  config: ProviderConfig;
}
```

**Provider Capabilities:**
```typescript
// providers/types.ts

export type InvokerFn = (options: InvocationOptions) => Promise<AgentResult>;

export interface ProviderCapabilities {
  available: boolean;
  invoke: InvokerFn;
  supportedModes: InvocationMode[];
}

// Binary names for each provider
export const PROVIDER_BINARIES: Record<ProviderType, string> = {
  claude: 'claude',
  opencode: 'opencode',
  codex: 'codex',
  gemini: 'gemini',
  pi: 'pi',
  cursor: 'agent',
};
```

**Registry Pattern:**
```typescript
// providers/registry.ts

import { 
  ProviderType, 
  ProviderCapabilities, 
  ProviderConfig,
  InvocationOptions,
  AgentResult,
  PROVIDER_BINARIES 
} from './types';

// Registry of all providers - implementations added in later stories
export const REGISTRY: Record<ProviderType, ProviderCapabilities> = {
  claude: { 
    available: false, // Will be set to true when implemented
    invoke: null as any, // Will be imported from './claude'
    supportedModes: ['supervised', 'headless-sync', 'headless-async'] 
  },
  opencode: { 
    available: false, 
    invoke: null as any, 
    supportedModes: ['supervised', 'headless-sync', 'headless-async'] 
  },
  codex: { 
    available: false, 
    invoke: null as any, 
    supportedModes: [] 
  },
  gemini: { 
    available: false, 
    invoke: null as any, 
    supportedModes: [] 
  },
  pi: { 
    available: false, 
    invoke: null as any, 
    supportedModes: [] 
  },
  cursor: { 
    available: false, 
    invoke: null as any, 
    supportedModes: [] 
  },
};

// Check if binary is available in PATH
export const isBinaryAvailable = async (binary: string): Promise<boolean> => {
  try {
    await execAsync(`which ${binary}`);
    return true;
  } catch {
    return false;
  }
};

// Get installation instructions for each provider
export const getInstallInstructions = (provider: ProviderType): string => {
  const instructions: Record<ProviderType, string> = {
    claude: 'npm install -g @anthropic-ai/claude-code',
    opencode: 'npm install -g opencode',
    codex: 'npm install -g @openai/codex',
    gemini: 'npm install -g @google/gemini-cli',
    pi: 'npm install -g @pi-mono/pi',
    cursor: 'Download from cursor.com and install cursor-agent',
  };
  return instructions[provider];
};

// Provider error class for consistent error handling
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderType,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// Lazy availability check with helpful error
export const invokeWithProvider = async (
  provider: ProviderType, 
  options: InvocationOptions
): Promise<AgentResult> => {
  const binary = PROVIDER_BINARIES[provider];
  
  if (!(await isBinaryAvailable(binary))) {
    throw new ProviderError(
      `Provider '${provider}' is not available. Binary '${binary}' not found in PATH.\n` +
      `Install: ${getInstallInstructions(provider)}`,
      provider
    );
  }
  
  const capabilities = REGISTRY[provider];
  
  if (!capabilities.available || !capabilities.invoke) {
    throw new ProviderError(
      `Provider '${provider}' is not yet implemented.`,
      provider
    );
  }
  
  return capabilities.invoke(options);
};
```

**Provider Selection:**
```typescript
// providers/registry.ts

export interface ProviderSelectionContext {
  cliFlag?: ProviderType;
  envVar?: ProviderType;
  configFile?: ProviderType;
}

// Provider selection priority: CLI flag > env var > config > auto-detect
export const selectProvider = (context: ProviderSelectionContext): ProviderType => {
  // Priority 1: CLI flag (highest)
  if (context.cliFlag) {
    return validateProvider(context.cliFlag);
  }
  
  // Priority 2: Environment variable
  if (context.envVar) {
    return validateProvider(context.envVar);
  }
  
  // Priority 3: Config file
  if (context.configFile) {
    return validateProvider(context.configFile);
  }
  
  // Priority 4: Auto-detect (default to claude)
  return 'claude';
};

const validateProvider = (provider: string): ProviderType => {
  const validProviders: ProviderType[] = ['claude', 'opencode', 'codex', 'gemini', 'pi', 'cursor'];
  
  if (!validProviders.includes(provider as ProviderType)) {
    throw new ProviderError(
      `Unknown provider: ${provider}. Valid providers: ${validProviders.join(', ')}`,
      provider as ProviderType
    );
  }
  
  return provider as ProviderType;
};

// Auto-detect available providers in priority order
export const autoDetectProvider = async (): Promise<ProviderType> => {
  const priority: ProviderType[] = ['claude', 'opencode', 'codex', 'gemini', 'pi'];
  
  for (const provider of priority) {
    if (await isBinaryAvailable(PROVIDER_BINARIES[provider])) {
      return provider;
    }
  }
  
  // Default to claude even if not available (will error later)
  return 'claude';
};
```

**Shared Utilities:**
```typescript
// providers/utils.ts

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);

// Stall detection configuration
export interface StallDetectionConfig {
  stallTimeoutMs: number;        // Time without output before considering stalled
  hardTimeoutMs: number;         // Absolute maximum time before force kill
  checkIntervalMs?: number;      // How often to check for activity
}

// Process execution with stall detection and timeout
export interface ProcessExecutionOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stallDetection: StallDetectionConfig;
  onOutput?: (data: string) => void;
  onError?: (data: string) => void;
}

export interface ProcessExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  terminationSignal?: string;
}

// Execute process with stall detection and hard timeout
export const executeWithTimeout = async (
  options: ProcessExecutionOptions
): Promise<ProcessExecutionResult> => {
  const startTime = Date.now();
  let lastActivity = Date.now();
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let terminationSignal: string | undefined;
  
  return new Promise((resolve, reject) => {
    const process = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: options.env,
    });
    
    // Activity tracking
    const updateActivity = () => {
      lastActivity = Date.now();
    };
    
    process.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      updateActivity();
      options.onOutput?.(chunk);
    });
    
    process.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      updateActivity();
      options.onError?.(chunk);
    });
    
    // Stall detection
    const stallCheckInterval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      
      if (inactiveTime > options.stallDetection.stallTimeoutMs) {
        console.error(`Stall detected: No output for ${inactiveTime}ms`);
        process.kill('SIGTERM');
      }
    }, options.stallDetection.checkIntervalMs || 5000);
    
    // Hard timeout (absolute maximum)
    const hardTimeoutId = setTimeout(() => {
      timedOut = true;
      console.error(`Hard timeout reached: ${options.stallDetection.hardTimeoutMs}ms`);
      process.kill('SIGKILL'); // Force kill
    }, options.stallDetection.hardTimeoutMs);
    
    process.on('exit', (code, signal) => {
      clearInterval(stallCheckInterval);
      clearTimeout(hardTimeoutId);
      
      if (signal) {
        terminationSignal = signal;
      }
      
      resolve({
        stdout,
        stderr,
        exitCode: code,
        durationMs: Date.now() - startTime,
        timedOut,
        terminationSignal,
      });
    });
    
    process.on('error', (error) => {
      clearInterval(stallCheckInterval);
      clearTimeout(hardTimeoutId);
      reject(error);
    });
  });
};

// Parse JSON safely with error handling
export const safeJsonParse = <T>(json: string, defaultValue?: T): T | undefined => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
};

// Parse JSONL (newline-delimited JSON)
export const parseJsonl = <T>(jsonl: string): T[] => {
  return jsonl
    .split('\n')
    .filter(line => line.trim())
    .map(line => safeJsonParse<T>(line))
    .filter((item): item is T => item !== undefined);
};
```

**Provider Binary Mapping:**
| Provider | Binary | Install Command |
|----------|--------|-----------------|
| claude | `claude` | `npm install -g @anthropic-ai/claude-code` |
| opencode | `opencode` | `npm install -g opencode` |
| codex | `codex` | `npm install -g @openai/codex` |
| gemini | `gemini` | `npm install -g @google/gemini-cli` |
| pi | `pi` | `npm install -g @pi-mono/pi` |
| cursor | `agent` | Download from cursor.com |

**Provider Selection Priority:**
1. **CLI flag**: `--provider opencode` (highest priority)
2. **Environment variable**: `RALPH_PROVIDER=opencode`
3. **Config file**: `aaa.config.json` → `ralph.provider`
4. **Auto-detect**: Check available CLIs in priority order (claude, opencode, codex, gemini, pi)

**Configuration:**
```json
{
  "ralph": {
    "provider": "claude",
    "model": "claude-sonnet-4",
    "lightweightModel": "claude-3-5-haiku-latest",
    "timeouts": {
      "stallMinutes": 10,
      "hardMinutes": 60
    }
  }
}
```

**Lightweight Model:**
The `lightweightModel` config specifies a cheaper/faster model for summary tasks (like the former "haiku" mode). This is not a separate invocation mode—it's a model selection that providers can use for lightweight operations.

**Environment Variable Override:**
```bash
# Override config file setting
RALPH_PROVIDER=opencode aaa ralph build
```

**CLI Flag Override:**
```bash
# Highest priority override
aaa ralph build --provider opencode --model gpt-4o
```

**Files to Create:**
- `tools/src/commands/ralph/providers/types.ts` - Discriminated union types
- `tools/src/commands/ralph/providers/utils.ts` - Shared utilities
- `tools/src/commands/ralph/providers/registry.ts` - Provider selection & registry

**Testing Requirements:**

**Unit Tests (Deterministic, Fast):**
- Provider selection logic with pure functions
- Binary availability checking (mocked)
- Provider validation (valid/invalid providers)
- Auto-detection priority order
- Error message generation

**Integration Tests:**
- Registry pattern with mock providers
- Timeout and stall detection with mock processes
- JSON/JSONL parsing edge cases

**Manual Testing Checklist:**
- [ ] Provider selection follows priority order
- [ ] Clear error when provider binary not found
- [ ] Helpful install instructions in error messages
- [ ] Auto-detect finds available providers
- [ ] Invalid provider shows helpful error with valid options

**Implementation Details:**

**Directory Structure:**
```
tools/src/commands/ralph/
├── providers/
│   ├── types.ts              # Discriminated union types
│   ├── registry.ts           # Provider selection & registry
│   ├── utils.ts              # Shared utilities (stall detection)
│   ├── models-static.ts      # Static baseline models (Story 4)
│   ├── models-dynamic.ts     # Discovered models (Story 4)
│   ├── models.ts             # Model registry merger (Story 4)
│   ├── claude.ts             # Claude implementation (Story 2)
│   ├── opencode.ts           # OpenCode implementation (Story 3)
│   ├── codex.ts              # (future)
│   ├── gemini.ts             # (future)
│   └── pi.ts                 # (future)
├── build.ts                  # Updated to use abstraction
├── review/
│   └── index.ts              # Updated to use abstraction
└── [DELETE claude.ts]        # Remove after migration
```

**Design Principles:**
1. **Discriminated unions** - No classes, use type guards
2. **Functions over methods** - Pure functions where possible
3. **Decisions at edges** - Validate at boundaries
4. **Lazy checking** - Don't check availability until needed
5. **Clear errors** - Helpful messages with install instructions

**Risks:**
- JSON format changes in CLI tools - Mitigation: Normalize in provider, isolate parsing logic
- Performance regression from abstraction - Mitigation: Benchmark before/after
- Team confusion about provider selection - Mitigation: Clear logging of selected provider

**Success Criteria:**
- New provider can be added with <100 lines of code
- Zero breaking changes to existing ralph usage
- Type-safe provider selection at compile time
- Clear runtime errors for missing providers
