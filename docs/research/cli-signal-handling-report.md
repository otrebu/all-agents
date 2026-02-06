# Multi-Provider CLI Signal Handling Strategy

## Executive Summary

This report analyzes how five major CLI providers (Claude Code, OpenCode, Codex, Gemini CLI, and Pi Mono) handle process signals, and provides concrete recommendations for building a unified signal handling abstraction layer using Bun.

## Provider Analysis

### 1. Claude Code (Anthropic)

**Implementation Details:**
- Built on Node.js/Bun runtime
- Uses standard process spawning with signal handlers
- Recent issues show signal handling challenges:
  - Issue #7718: SIGABRT crashes during MCP server termination
  - Issue #588: Job control signals (SIGTSTP) not well-behaved
  - Issue #9970: Self-termination when killing Node.js processes
  - Issue #18880: Ctrl+C unresponsive during tool execution

**Signal Behavior:**
- SIGINT (130): User interrupt via Ctrl+C - attempts graceful shutdown
- SIGTERM (143): Standard termination signal
- SIGABRT: Crash during cleanup (indicates cleanup handler issues)
- **Problem**: Signal handlers can conflict with child process signals

**Cleanup Strategy:**
- MCP server integration requires explicit cleanup
- Session persistence requires cleanup before exit
- Uses internal signal handlers that may conflict with parent processes

---

### 2. OpenCode

**Implementation Details:**
- TypeScript/Bun-based
- **Critical Issue** #11225: Zombie process accumulation with `opencode attach`
- Issue #11704: Spawned processes not cleaned up on PR command errors
- Issue #3057: Need for "stop all running scripts" functionality

**Signal Behavior:**
- Server mode (`--port`) creates persistent processes
- `opencode attach` spawns child processes that may not terminate
- tmux integration causes orphaned processes on pane closure

**Cleanup Challenges:**
```typescript
// Problematic pattern found in codebase
const opencodeProcess = spawn("opencode", opencodeArgs, {
  cwd: workingDir,
  env: {...},
  stdio: ["inherit", "inherit", "inherit"],
})
// No explicit cleanup on error
```

**Key Finding:** OpenCode has known issues with child process cleanup, especially in server/attach mode.

---

### 3. Codex (OpenAI)

**Implementation Details:**
- React/TypeScript-based CLI
- Uses Ink for TUI rendering
- Container-based sandboxing available

**Signal Behavior:**
- Issue #9448: Ctrl+C exits via SIGINT (status 130), TUI skips session summary
- Session persistence with resume capability
- Runs in isolated environment (container or sandbox)

**Cleanup Characteristics:**
- Container mode provides natural process boundary
- Sandboxed execution limits signal propagation
- Session state saved before exit (when graceful)

**Key Finding:** Container/sandbox modes naturally isolate signals, but non-container mode needs explicit handling.

---

### 4. Gemini CLI (Google)

**Implementation Details:**
- Node.js/TypeScript-based
- Uses Google's ADK (Agent Development Kit)

**Signal Behavior:**
- Issue #15874: Orphaned gemini-cli process consumes 100% CPU after terminal closure (47+ days)
- Issue #15369: Termination with EIO error on TTY read

**Cleanup Challenges:**
- Similar to OpenCode - orphaned processes on abrupt termination
- Session management may leave processes running
- No graceful shutdown on terminal closure

**Key Finding:** Gemini CLI has documented zombie/orphaned process issues requiring external cleanup.

---

### 5. Pi Mono

**Implementation Details:**
- Monorepo structure with multiple packages
- Uses `@mariozechner/pi-agent-core` for agent loop
- TUI library for interface

**Signal Behavior:**
- Agent loop with state management
- Process spawning for tool execution
- Streaming and event-based architecture

**Key Characteristics:**
- Tree-based selection interface
- Multi-step agent execution
- Requires cleanup of agent state and spawned tools

---

## Cross-Provider Comparison Matrix

| Provider | SIGINT (130) | SIGTERM (143) | SIGKILL (137) | Zombie Risk | Graceful Cleanup |
|----------|--------------|---------------|---------------|-------------|------------------|
| Claude Code | ✓ Handles | ✓ Handles | ✗ Crash | Medium | Partial |
| OpenCode | ⚠ Issues | ⚠ Issues | ✗ Force | **High** | Poor |
| Codex | ✓ Handles | ✓ Handles | ✗ Force | Low | Good (container) |
| Gemini CLI | ⚠ Issues | ⚠ Issues | ✗ Force | **High** | Poor |
| Pi Mono | Unknown | Unknown | ✗ Force | Unknown | Unknown |

**Legend:** ✓ Good, ⚠ Known Issues, ✗ Not Applicable/Force kill

---

## Bun Subprocess Signal Handling Deep Dive

### Current Bun Capabilities

```typescript
// Basic spawn with exit handling
const proc = Bun.spawn(["claude", "code"], {
  onExit(proc, exitCode, signalCode, error) {
    // exitCode: 128 + signal for signals
    // 130 = SIGINT (128 + 2)
    // 143 = SIGTERM (128 + 15)
    // 137 = SIGKILL (128 + 9)
  }
});

// Kill with specific signal
proc.kill();           // SIGTERM (default)
proc.kill(15);         // SIGTERM by number
proc.kill("SIGTERM");  // SIGTERM by name

// Timeout with kill signal
const proc = Bun.spawn({
  cmd: ["claude", "code"],
  timeout: 30000,        // 30 seconds
  killSignal: "SIGKILL"  // Force kill after timeout
});

// AbortSignal integration
const controller = new AbortController();
const proc = Bun.spawn({
  cmd: ["claude", "code"],
  signal: controller.signal,
  killSignal: "SIGTERM"
});
// Later: controller.abort() sends killSignal
```

### Known Bun Limitations

1. **Issue #7440**: Spawned processes not killed on `--watch` reload
   - Bun doesn't automatically clean up spawned processes
   - Workaround: Manual cleanup in watch handler

2. **Issue #15791**: `process.kill()` doesn't accept negative PID
   - Cannot kill entire process group with negative PID
   - Affects process tree cleanup
   - **Status**: Closed (fixed in newer versions)

3. **Process Group Limitations**:
   - Bun's `posix_spawn` may not create new process groups
   - Signal propagation to grandchildren is unreliable

---

## Recommended Abstraction Architecture

### Core Design Principles

1. **Provider-Agnostic Interface**: Normalize all providers to common behavior
2. **Graceful-First**: Always attempt graceful shutdown before force kill
3. **Process Tree Awareness**: Track and clean up entire process hierarchies
4. **Timeout Boundaries**: Prevent indefinite hanging with configurable timeouts
5. **Signal Normalization**: Map provider-specific behaviors to standard exit codes

### Abstraction Layer Implementation

```typescript
// types.ts
interface ProviderProcess {
  pid: number;
  provider: string;
  subprocess: Subprocess;
  startTime: number;
  state: 'running' | 'stopping' | 'stopped';
}

interface SignalHandlerConfig {
  gracefulTimeoutMs: number;
  forceKillTimeoutMs: number;
  cleanupIntervalMs: number;
  maxGracefulAttempts: number;
}

interface ProcessExitInfo {
  exitCode: number | null;
  signalCode: string | null;
  normalizedExitCode: number;
  wasGraceful: boolean;
  cleanupDurationMs: number;
}
```

```typescript
// provider-process-manager.ts
export class ProviderProcessManager {
  private processes = new Map<number, ProviderProcess>();
  private config: SignalHandlerConfig;
  private cleanupTimer: Timer | null = null;

  constructor(config: Partial<SignalHandlerConfig> = {}) {
    this.config = {
      gracefulTimeoutMs: 5000,
      forceKillTimeoutMs: 3000,
      cleanupIntervalMs: 1000,
      maxGracefulAttempts: 2,
      ...config
    };
  }

  async spawnProvider(
    provider: string,
    args: string[],
    options: SpawnOptions = {}
  ): Promise<ProviderProcess> {
    // Provider-specific spawn configuration
    const spawnConfig = this.getProviderSpawnConfig(provider, args, options);
    
    const subprocess = Bun.spawn({
      ...spawnConfig,
      onExit: (proc, exitCode, signalCode, error) => {
        this.handleProcessExit(proc.pid, exitCode, signalCode, error);
      }
    });

    const processInfo: ProviderProcess = {
      pid: subprocess.pid,
      provider,
      subprocess,
      startTime: Date.now(),
      state: 'running'
    };

    this.processes.set(subprocess.pid, processInfo);
    this.startCleanupMonitoring();
    
    return processInfo;
  }

  private getProviderSpawnConfig(
    provider: string,
    args: string[],
    options: SpawnOptions
  ): SpawnOptions {
    const configs: Record<string, SpawnOptions> = {
      'claude-code': {
        // Claude Code: Standard spawn, may need stdin for interactive mode
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Prevent Claude from installing its own signal handlers
          CLAUDE_CODE_SKIP_SIGNAL_HANDLERS: '1'
        }
      },
      'opencode': {
        // OpenCode: High risk of zombies, use detached mode with explicit cleanup
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Force cleanup on exit
          OPENCODE_CLEANUP_ON_EXIT: '1'
        }
      },
      'codex': {
        // Codex: Prefer container mode if available
        stdio: ['pipe', 'pipe', 'pipe'],
        // Codex has good container isolation
      },
      'gemini': {
        // Gemini: Similar to OpenCode, zombie risk
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GEMINI_CLEANUP_PROCESSES: '1'
        }
      },
      'pi-mono': {
        // Pi Mono: Standard spawn
        stdio: ['pipe', 'pipe', 'pipe']
      }
    };

    return {
      cmd: [provider, ...args],
      ...configs[provider],
      ...options
    };
  }
}
```

```typescript
// graceful-terminator.ts
export class GracefulTerminator {
  private config: SignalHandlerConfig;

  constructor(config: SignalHandlerConfig) {
    this.config = config;
  }

  async terminate(processInfo: ProviderProcess): Promise<ProcessExitInfo> {
    const startTime = Date.now();
    const { subprocess, provider } = processInfo;
    
    // Mark as stopping
    processInfo.state = 'stopping';

    // Phase 1: Graceful termination (SIGTERM)
    const gracefulResult = await this.attemptGracefulTermination(subprocess);
    
    if (gracefulResult.success) {
      return {
        exitCode: gracefulResult.exitCode,
        signalCode: gracefulResult.signalCode,
        normalizedExitCode: this.normalizeExitCode(gracefulResult.exitCode, gracefulResult.signalCode),
        wasGraceful: true,
        cleanupDurationMs: Date.now() - startTime
      };
    }

    // Phase 2: Force kill (SIGKILL)
    const forceResult = await this.attemptForceKill(subprocess);
    
    processInfo.state = 'stopped';
    
    return {
      exitCode: forceResult.exitCode,
      signalCode: forceResult.signalCode,
      normalizedExitCode: this.normalizeExitCode(forceResult.exitCode, forceResult.signalCode),
      wasGraceful: false,
      cleanupDurationMs: Date.now() - startTime
    };
  }

  private async attemptGracefulTermination(
    subprocess: Subprocess
  ): Promise<{ success: boolean; exitCode: number | null; signalCode: string | null }> {
    return new Promise((resolve) => {
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, exitCode: null, signalCode: null });
        }
      }, this.config.gracefulTimeoutMs);

      // Set up exit handler
      const checkExit = async () => {
        try {
          await subprocess.exited;
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              success: true,
              exitCode: subprocess.exitCode,
              signalCode: subprocess.signalCode
            });
          }
        } catch (error) {
          // Process may already be gone
        }
      };

      checkExit();

      // Send SIGTERM
      try {
        subprocess.kill("SIGTERM");
      } catch (error) {
        // Process may already be terminated
      }
    });
  }

  private async attemptForceKill(
    subprocess: Subprocess
  ): Promise<{ exitCode: number | null; signalCode: string | null }> {
    return new Promise((resolve) => {
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Even SIGKILL didn't work - zombie process?
          resolve({ exitCode: null, signalCode: 'SIGKILL_FAILED' });
        }
      }, this.config.forceKillTimeoutMs);

      subprocess.exited.then(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            exitCode: subprocess.exitCode,
            signalCode: subprocess.signalCode
          });
        }
      });

      // Send SIGKILL
      try {
        subprocess.kill("SIGKILL");
      } catch (error) {
        // Process may already be gone
      }
    });
  }

  private normalizeExitCode(
    exitCode: number | null,
    signalCode: string | null
  ): number {
    // Standard exit code normalization
    // 0: Success
    // 130: SIGINT (128 + 2)
    // 143: SIGTERM (128 + 15)
    // 137: SIGKILL (128 + 9)
    
    if (exitCode !== null) {
      return exitCode;
    }
    
    if (signalCode) {
      const signalMap: Record<string, number> = {
        'SIGINT': 130,
        'SIGTERM': 143,
        'SIGKILL': 137,
        'SIGABRT': 134,
        'SIGSEGV': 139
      };
      return signalMap[signalCode] || 1;
    }
    
    return 1; // Unknown error
  }
}
```

```typescript
// process-tree-cleaner.ts
export class ProcessTreeCleaner {
  /**
   * Attempts to clean up an entire process tree
   * Important for providers that spawn child processes (OpenCode, Gemini)
   */
  async cleanupProcessTree(rootPid: number): Promise<void> {
    // Get all child processes
    const children = await this.getChildProcesses(rootPid);
    
    // Terminate children first (bottom-up)
    for (const childPid of children.reverse()) {
      await this.terminateProcess(childPid);
    }
    
    // Terminate root process
    await this.terminateProcess(rootPid);
  }

  private async getChildProcesses(parentPid: number): Promise<number[]> {
    try {
      // Use pgrep to find child processes (Linux/macOS)
      const proc = Bun.spawn([
        'pgrep',
        '-P',
        parentPid.toString()
      ]);
      
      const output = await proc.stdout.text();
      const pids = output.trim().split('\n').filter(Boolean).map(Number);
      
      // Recursively get grandchildren
      const allChildren: number[] = [];
      for (const pid of pids) {
        allChildren.push(pid);
        const grandchildren = await this.getChildProcesses(pid);
        allChildren.push(...grandchildren);
      }
      
      return allChildren;
    } catch (error) {
      return [];
    }
  }

  private async terminateProcess(pid: number): Promise<void> {
    try {
      // Try graceful first
      process.kill(pid, 'SIGTERM');
      await Bun.sleep(1000);
      
      // Check if still alive
      try {
        process.kill(pid, 0); // Signal 0 checks if process exists
        // Still alive, force kill
        process.kill(pid, 'SIGKILL');
      } catch {
        // Process already gone
      }
    } catch (error) {
      // Process may not exist
    }
  }
}
```

```typescript
// zombie-process-monitor.ts
export class ZombieProcessMonitor {
  private checkInterval: Timer | null = null;
  private knownZombies = new Set<number>();

  startMonitoring(intervalMs: number = 5000): void {
    this.checkInterval = setInterval(() => {
      this.checkForZombies();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkForZombies(): Promise<void> {
    try {
      // Find zombie processes related to our providers
      const proc = Bun.spawn([
        'ps',
        'aux'
      ]);
      
      const output = await proc.stdout.text();
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.includes('<defunct>')) {
          const match = line.match(/^\S+\s+(\d+).+claude|opencode|codex|gemini|pi-mono/);
          if (match) {
            const zombiePid = parseInt(match[1]);
            if (!this.knownZombies.has(zombiePid)) {
              this.knownZombies.add(zombiePid);
              await this.handleZombie(zombiePid, line);
            }
          }
        }
      }
    } catch (error) {
      // Monitoring failed, not critical
    }
  }

  private async handleZombie(zombiePid: number, psLine: string): Promise<void> {
    // Extract parent PID
    const ppidMatch = psLine.match(/^(?:\S+\s+){2}(\d+)/);
    if (ppidMatch) {
      const parentPid = parseInt(ppidMatch[1]);
      
      // Try to signal parent to reap child
      try {
        process.kill(parentPid, 'SIGCHLD');
      } catch {
        // Parent may be gone
      }
    }
  }
}
```

---

## Provider-Specific Recommendations

### Claude Code

**Risk Level**: Medium
**Primary Issues**: Signal handler conflicts, MCP cleanup

```typescript
const claudeCodeConfig = {
  // Prevent Claude from handling signals itself
  env: {
    CLAUDE_CODE_NON_INTERACTIVE: '1',
    CLAUDE_CODE_SKIP_SIGNAL_HANDLERS: '1'
  },
  // Monitor for MCP server processes
  mcpCleanup: true,
  // Handle session persistence
  sessionCleanup: async (pid: number) => {
    // Ensure session is saved before kill
    try {
      await fetch('http://localhost:CLAUDE_PORT/save-session', {
        method: 'POST',
        timeout: 2000
      });
    } catch {
      // Session may not be available
    }
  }
};
```

### OpenCode

**Risk Level**: **HIGH** (Known zombie issues)
**Primary Issues**: Orphaned processes, server mode cleanup

```typescript
const openCodeConfig = {
  // Avoid server/attach mode if possible
  avoidServerMode: true,
  
  // Force cleanup flags
  env: {
    OPENCODE_CLEANUP_ON_EXIT: '1',
    OPENCODE_DISABLE_PERSISTENCE: '1'
  },
  
  // Aggressive process tree cleanup
  processTreeCleanup: true,
  
  // Monitor for orphaned processes
  orphanCheck: true,
  
  // Custom cleanup for attach processes
  preKillHook: async (pid: number) => {
    // Find and kill all opencode attach processes
    try {
      const proc = Bun.spawn([
        'pkill',
        '-f',
        `opencode attach.*${pid}`
      ]);
      await proc.exited;
    } catch {
      // Cleanup failed, proceed with kill
    }
  }
};
```

### Codex

**Risk Level**: Low (when using containers)
**Primary Issues**: TUI state on SIGINT

```typescript
const codexConfig = {
  // Prefer container mode for isolation
  preferContainer: true,
  
  // Handle TUI cleanup
  env: {
    CODEX_TUI_CLEANUP_ON_EXIT: '1'
  },
  
  // Session persistence is handled well
  sessionCleanup: false,
  
  // Standard graceful termination works
  forceKillDelay: 5000
};
```

### Gemini CLI

**Risk Level**: **HIGH** (Similar to OpenCode)
**Primary Issues**: Orphaned processes, CPU spinning

```typescript
const geminiConfig = {
  // Similar to OpenCode - aggressive cleanup needed
  processTreeCleanup: true,
  
  env: {
    GEMINI_CLEANUP_PROCESSES: '1',
    GEMINI_DISABLE_SESSION_PERSISTENCE: '1'
  },
  
  // Monitor for spinning processes
  postKillVerification: async (pid: number) => {
    await Bun.sleep(1000);
    try {
      process.kill(pid, 0);
      // Still alive - zombie!
      return false;
    } catch {
      return true;
    }
  },
  
  // Kill orphaned gemini processes
  cleanupOrphans: true
};
```

### Pi Mono

**Risk Level**: Unknown (insufficient data)
**Recommended Approach**: Conservative with full cleanup

```typescript
const piMonoConfig = {
  // Conservative approach until behavior is known
  gracefulTimeout: 10000,
  
  // Agent state cleanup
  env: {
    PI_AGENT_CLEANUP_ON_EXIT: '1'
  },
  
  // Kill any spawned tool processes
  processTreeCleanup: true
};
```

---

## Exit Code Normalization

### Standard Exit Code Mapping

| Exit Code | Meaning | Source |
|-----------|---------|--------|
| 0 | Success | Normal exit |
| 1 | General error | Catch-all |
| 2 | Misuse of shell command | Bash builtin |
| 126 | Command invoked cannot execute | Permission issue |
| 127 | Command not found | PATH issue |
| 128+N | Fatal signal N | Signal termination |
| 130 | SIGINT (Ctrl+C) | 128 + 2 |
| 134 | SIGABRT (Abort) | 128 + 6 |
| 137 | SIGKILL (Force kill) | 128 + 9 |
| 139 | SIGSEGV (Segfault) | 128 + 11 |
| 143 | SIGTERM (Termination) | 128 + 15 |

### Abstraction Layer Normalization

```typescript
function normalizeExitCode(
  provider: string,
  exitCode: number | null,
  signalCode: string | null,
  wasGraceful: boolean
): { code: number; category: 'success' | 'interrupted' | 'error' | 'killed' } {
  // Provider-specific adjustments
  const providerAdjustments: Record<string, Record<number, number>> = {
    'opencode': {
      // OpenCode may return custom codes
      42: 130, // Remap custom interrupt to standard SIGINT
    },
    'gemini': {
      // Gemini may return EIO as code
      255: 1,  // Remap EIO to general error
    }
  };

  let normalizedCode = exitCode ?? 1;
  
  // Apply provider-specific adjustments
  if (providerAdjustments[provider]?.[normalizedCode]) {
    normalizedCode = providerAdjustments[provider][normalizedCode];
  }

  // Categorize
  let category: 'success' | 'interrupted' | 'error' | 'killed';
  if (normalizedCode === 0) {
    category = 'success';
  } else if ([130, 143].includes(normalizedCode)) {
    category = 'interrupted';
  } else if (normalizedCode === 137) {
    category = 'killed';
  } else {
    category = 'error';
  }

  return { code: normalizedCode, category };
}
```

---

## Edge Cases & Mitigation

### 1. Hanging Processes

**Symptom**: Process ignores SIGTERM, requires SIGKILL
**Mitigation**:
- Always have force kill timeout
- Monitor process after SIGTERM
- Log hanging behavior for debugging

### 2. Zombie Processes

**Symptom**: Process shows as `<defunct>` in ps
**Mitigation**:
- Signal parent with SIGCHLD
- Kill parent if safe
- Use `waitpid(-1, WNOHANG)` pattern in subprocesses

### 3. Orphaned Processes

**Symptom**: Child outlives parent, adopted by init
**Mitigation**:
- Use process groups where possible
- Track process tree explicitly
- Cleanup on parent exit via `process.on('exit')`

### 4. Signal Propagation Issues

**Symptom**: Ctrl+C doesn't reach child
**Mitigation**:
- Don't use `stdio: 'inherit'` for critical processes
- Forward signals manually
- Use IPC for explicit shutdown coordination

### 5. Windows Incompatibility

**Symptom**: Signals work differently on Windows
**Mitigation**:
- Use `taskkill /F /IM` on Windows
- Send `CTRL_BREAK_EVENT` instead of SIGTERM
- Platform detection and separate handling

```typescript
async function killProcessCrossPlatform(pid: number, force: boolean = false): Promise<void> {
  if (process.platform === 'win32') {
    const args = force ? ['/F', '/IM'] : ['/IM'];
    const proc = Bun.spawn(['taskkill', ...args, pid.toString()]);
    await proc.exited;
  } else {
    const signal = force ? 'SIGKILL' : 'SIGTERM';
    try {
      process.kill(pid, signal);
    } catch {
      // Process already gone
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// test/signal-handling.test.ts
describe('ProviderProcessManager', () => {
  it('should gracefully terminate Claude Code', async () => {
    const manager = new ProviderProcessManager({
      gracefulTimeoutMs: 1000
    });
    
    const proc = await manager.spawnProvider('claude-code', ['--version']);
    
    const result = await manager.terminate(proc.pid);
    
    expect(result.wasGraceful).toBe(true);
    expect(result.normalizedExitCode).toBe(0);
  });

  it('should force kill unresponsive OpenCode', async () => {
    const manager = new ProviderProcessManager({
      gracefulTimeoutMs: 100,
      forceKillTimeoutMs: 100
    });
    
    // Spawn a process that ignores SIGTERM
    const proc = await manager.spawnProvider('opencode', ['--hang']);
    
    const result = await manager.terminate(proc.pid);
    
    expect(result.wasGraceful).toBe(false);
    expect(result.normalizedExitCode).toBe(137);
  });
});
```

### Integration Tests

```typescript
// test/zombie-prevention.test.ts
describe('Zombie Process Prevention', () => {
  it('should not leave zombie processes after OpenCode termination', async () => {
    const manager = new ProviderProcessManager();
    
    const proc = await manager.spawnProvider('opencode', ['--server']);
    await Bun.sleep(1000); // Let it spawn children
    
    await manager.terminate(proc.pid);
    await Bun.sleep(500); // Let cleanup occur
    
    // Check for zombies
    const checkProc = Bun.spawn(['ps', 'aux']);
    const output = await checkProc.stdout.text();
    
    const zombies = output
      .split('\n')
      .filter(line => line.includes('<defunct>') && line.includes('opencode'));
    
    expect(zombies).toHaveLength(0);
  });
});
```

---

## Summary of Recommendations

### Immediate Actions

1. **Implement Graceful-First Termination**
   - SIGTERM → wait → SIGKILL pattern
   - Configurable timeouts per provider

2. **Add Process Tree Cleanup**
   - Track child processes
   - Bottom-up termination
   - Handle orphaned processes

3. **Normalize Exit Codes**
   - Map all providers to standard codes
   - Categorize exits (success/interrupted/error/killed)

4. **Provider-Specific Hardening**
   - OpenCode: Aggressive cleanup (known issues)
   - Gemini: Similar to OpenCode
   - Claude: Handle MCP cleanup
   - Codex: Leverage container mode
   - Pi Mono: Conservative approach

### Long-Term Improvements

1. **Zombie Process Monitor**
   - Background monitoring
   - Automatic reaping attempts
   - Metrics and alerting

2. **Cross-Platform Support**
   - Windows signal handling
   - Platform-specific cleanup

3. **Observability**
   - Exit reason tracking
   - Cleanup duration metrics
   - Provider reliability scoring

4. **Health Checks**
   - Pre-flight provider validation
   - Runtime health monitoring
   - Automatic fallback on hang

---

## Appendix: Quick Reference

### Signal Number Reference

| Signal | Number | Default Action | Catchable |
|--------|--------|----------------|-----------|
| SIGHUP | 1 | Terminate | Yes |
| SIGINT | 2 | Terminate | Yes |
| SIGQUIT | 3 | Core dump | Yes |
| SIGABRT | 6 | Core dump | Yes |
| SIGKILL | 9 | Terminate | **No** |
| SIGTERM | 15 | Terminate | Yes |
| SIGCHLD | 17 | Ignore | Yes |
| SIGSTOP | 19 | Stop | **No** |

### Exit Code Formula

```
Exit Code = 128 + Signal Number

Examples:
SIGINT (2)  → 130
SIGTERM (15) → 143
SIGKILL (9) → 137
```

### Bun.spawn Options for Signal Handling

```typescript
Bun.spawn({
  cmd: [...],
  
  // Exit handling
  onExit(proc, exitCode, signalCode, error) {
    // Handle process exit
  },
  
  // Timeout with signal
  timeout: 5000,
  killSignal: "SIGTERM",
  
  // Abort integration
  signal: abortController.signal,
  
  // Detach from parent
  // Use with caution - prevents automatic cleanup
  // detached: true
});
```

---

*Report generated for multi-provider CLI abstraction layer signal handling strategy.*
