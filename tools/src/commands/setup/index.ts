/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-shadow */

import * as p from "@clack/prompts";
import log from "@lib/log";
import { FileSystem, FileSystemLive } from "@tools/lib/effect";
import { Effect } from "effect";
import { execSync } from "node:child_process";
import {
  cpSync,
  lstatSync,
  readdirSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

import { syncContext } from "../sync-context";
import {
  AAA_SYMLINK,
  buildCliEffect,
  createSymlinkEffect,
  getAllAgentsRoot,
  getClaudeConfigStatus,
  getCompletionLine,
  getExportLine,
  getShellConfigFilePath,
  getShellConfigPath,
  getShellType,
  getSymlinkTarget,
  installCompletionEffect,
  isCliInstalled,
  isCompletionInstalledEffect,
  isInPath,
  LOCAL_BIN,
} from "./effect-setup";

interface SetupOptions {
  project?: boolean;
  user?: boolean;
}

async function handleClaudeConfigDirectory(): Promise<void> {
  const { current, expected, status } = getClaudeConfigStatus();
  const shellConfig = getShellConfigPath();

  if (status === "correct") {
    log.success("CLAUDE_CONFIG_DIR already set correctly");
    return;
  }

  if (status === "different") {
    log.warn(`CLAUDE_CONFIG_DIR points to: ${current}`);
    p.note(
      `To use all-agents globally, update ${shellConfig}:\n\n  ${getExportLine("CLAUDE_CONFIG_DIR", expected)}`,
      "CLAUDE_CONFIG_DIR",
    );
    return;
  }

  // status === 'unset'
  const shouldSet = await p.confirm({
    initialValue: true,
    message: "Set CLAUDE_CONFIG_DIR to use this repo globally?",
  });

  if (p.isCancel(shouldSet) || !shouldSet) {
    log.info("Skipped CLAUDE_CONFIG_DIR setup");
    return;
  }

  p.note(
    `Add to ${shellConfig}:\n\n  ${getExportLine("CLAUDE_CONFIG_DIR", expected)}\n\nThen run: source ${shellConfig}`,
    "CLAUDE_CONFIG_DIR",
  );
}

/**
 * Handle shell completion setup (Effect version)
 */
function handleShellCompletionEffect(): Effect.Effect<void, never, FileSystem> {
  return Effect.gen(function* handleShellCompletion() {
    const shell = getShellType();
    const configPath = getShellConfigFilePath();

    const alreadyInstalled = yield* isCompletionInstalledEffect();
    if (alreadyInstalled) {
      yield* Effect.sync(() => {
        log.success("Shell completion already installed");
      });
      return;
    }

    const shouldInstall = yield* Effect.promise(async () => {
      const result = await p.confirm({
        initialValue: true,
        message: `Install tab completion for ${shell}?`,
      });
      return result;
    });

    if (p.isCancel(shouldInstall) || !shouldInstall) {
      yield* Effect.sync(() => {
        log.info("Skipped shell completion");
        p.note(
          `To enable later, add to ${configPath}:\n\n  ${getCompletionLine(shell)}`,
          "Shell completion",
        );
      });
      return;
    }

    yield* installCompletionEffect();
    yield* Effect.sync(() => {
      log.success(`Shell completion added to ${configPath}`);
      log.info(`Restart your shell or run: source ${configPath}`);
    });
  });
}

async function setup(options: SetupOptions): Promise<void> {
  if (options.user !== true && options.project !== true) {
    return;
  }

  if (options.user === true) {
    await setupUser();
  }

  if (options.project === true) {
    await setupProject();
  }
}

async function setupCommand(options: SetupOptions): Promise<void> {
  if (options.user !== true && options.project !== true) {
    log.error("Specify --user or --project");
    process.exit(1);
  }

  await setup(options);
}

async function setupProject(): Promise<void> {
  const program = setupProjectEffect().pipe(Effect.provide(FileSystemLive));

  await Effect.runPromise(program);
}

/**
 * Setup project using Effect for file operations
 */
function setupProjectEffect(): Effect.Effect<void, never, FileSystem> {
  return Effect.gen(function* setupProjectEffectGen() {
    const fs = yield* FileSystem;
    const cwd = process.cwd();
    const root = getAllAgentsRoot();

    yield* Effect.sync(() => {
      p.intro("aaa setup --project");
    });

    // Check if running from all-agents itself
    if (resolve(cwd) === resolve(root)) {
      yield* Effect.sync(() => {
        log.error("Cannot setup project in all-agents repo itself");
        process.exit(1);
      });
      return;
    }

    // Step 1: Check user setup
    if (!isCliInstalled()) {
      yield* Effect.sync(() => {
        log.warn(
          "CLI not installed. Run: aaa setup --user (or bun run dev setup --user)",
        );
      });
    }

    // Step 2: CLAUDE_CONFIG_DIR
    yield* Effect.promise(async () => handleClaudeConfigDirectory());

    // Step 3: Setup context/
    const contextTarget = resolve(root, "context");
    const contextLink = resolve(cwd, "context");

    const existingSymlinkTarget = getSymlinkTarget(contextLink);
    const isExistingSymlink = existingSymlinkTarget === contextTarget;
    const contextExists = yield* fs.exists(contextLink);
    const isExistingDirectory =
      contextExists &&
      existingSymlinkTarget === null &&
      lstatSync(contextLink).isDirectory();

    let defaultMethod: "symlink" | "sync" = "symlink";
    if (isExistingDirectory) {
      defaultMethod = "sync";
    }

    const contextMethod = yield* Effect.promise(async () => {
      const result = await p.select({
        initialValue: defaultMethod,
        message: "How do you want to link context/?",
        options: [
          {
            hint: "Real-time updates, may not work with Claude Code/Cursor",
            label: "Symlink",
            value: "symlink" as const,
          },
          {
            hint: "Manual updates via aaa sync-context",
            label: "Sync copy (recommended)",
            value: "sync" as const,
          },
        ],
      });
      return result;
    });

    if (p.isCancel(contextMethod)) {
      yield* Effect.sync(() => {
        p.cancel("Setup cancelled");
        process.exit(0);
      });
      return;
    }

    if (contextMethod === "symlink") {
      if (isExistingDirectory) {
        const shouldSwitch = yield* Effect.promise(async () => {
          const result = await p.confirm({
            initialValue: false,
            message: "context/ exists as directory. Remove and create symlink?",
          });
          return result;
        });
        if (p.isCancel(shouldSwitch) || !shouldSwitch) {
          yield* Effect.sync(() => {
            log.info("Keeping existing context/ directory");
          });
        } else {
          yield* Effect.sync(() => execSync(`rm -rf "${contextLink}"`));
          yield* createSymlinkEffect(contextTarget, contextLink).pipe(
            Effect.catchAll(() => Effect.void),
          );
          yield* Effect.sync(() => {
            log.success(`Symlink: context/ -> ${contextTarget}`);
          });
        }
      } else if (isExistingSymlink) {
        yield* Effect.sync(() => {
          log.info("context/ symlink already exists");
        });
      } else {
        yield* createSymlinkEffect(contextTarget, contextLink).pipe(
          Effect.catchAll(() => Effect.void),
        );
        yield* Effect.sync(() => {
          log.success(`Symlink: context/ -> ${contextTarget}`);
        });
      }

      yield* Effect.sync(() => {
        log.warn("Symlinks may not work correctly with Claude Code or Cursor.");
        log.info("If you have issues, re-run setup and choose 'Sync copy'.");
      });
    } else {
      // Sync mode
      if (isExistingSymlink) {
        yield* Effect.sync(() => {
          unlinkSync(contextLink);
          log.info("Removed existing symlink");
        });
      }

      yield* Effect.promise(async () => syncContext(cwd));
      yield* Effect.sync(() => {
        log.success("Synced context/");
        p.note(
          `To keep context/ updated:\n  aaa sync-context          # one-time sync\n  aaa sync-context --watch  # auto-sync while editing all-agents`,
          "Sync usage",
        );
      });
    }

    // Step 4: Copy docs templates
    const DIRS_ONLY = ["planning", "research"];
    const docsSource = resolve(root, "docs");
    const docsDestination = resolve(cwd, "docs");

    const subdirs = yield* Effect.sync(() =>
      readdirSync(docsSource, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name),
    );

    for (const subdir of subdirs) {
      const destinationDirectory = resolve(docsDestination, subdir);
      const dirExists = yield* fs.exists(destinationDirectory);

      if (dirExists) {
        yield* Effect.sync(() => {
          log.info(`docs/${subdir}/ already exists`);
        });
      } else if (DIRS_ONLY.includes(subdir)) {
        yield* Effect.catchAll(
          fs.mkdirp(destinationDirectory),
          () => Effect.void,
        );
        yield* Effect.sync(() => {
          log.success(`Created docs/${subdir}/`);
        });
      } else {
        yield* Effect.sync(() => {
          cpSync(resolve(docsSource, subdir), destinationDirectory, {
            recursive: true,
          });
          log.success(`Copied docs/${subdir}/`);
        });
      }
    }

    yield* Effect.sync(() => {
      p.outro("Project setup complete");
    });
  });
}

async function setupUser(): Promise<void> {
  const program = setupUserEffect().pipe(Effect.provide(FileSystemLive));

  await Effect.runPromise(program);
}

/**
 * Setup user using Effect for file and build operations
 */
function setupUserEffect(): Effect.Effect<void, never, FileSystem> {
  return Effect.gen(function* setupUserEffectGen() {
    const fs = yield* FileSystem;
    const root = getAllAgentsRoot();
    const binPath = resolve(root, "bin/aaa");
    const toolsDir = resolve(root, "tools");

    yield* Effect.sync(() => {
      p.intro("aaa setup --user");
    });

    // Step 1: Build
    const s = p.spinner();
    yield* Effect.sync(() => {
      s.start("Building CLI...");
    });

    const buildResult = yield* Effect.either(buildCliEffect(toolsDir));
    if (buildResult._tag === "Left") {
      yield* Effect.sync(() => {
        s.stop("Build failed");
        log.error(buildResult.left.message);
        process.exit(1);
      });
      return;
    }
    yield* Effect.sync(() => {
      s.stop("CLI built");
    });

    const binExists = yield* fs.exists(binPath);
    if (!binExists) {
      yield* Effect.sync(() => {
        log.error(`Binary not found at ${binPath}`);
        process.exit(1);
      });
      return;
    }

    // Step 2: Create ~/.local/bin
    const localBinExists = yield* fs.exists(LOCAL_BIN);
    if (!localBinExists) {
      yield* Effect.catchAll(fs.mkdirp(LOCAL_BIN), () => Effect.void);
      yield* Effect.sync(() => {
        log.info(`Created ${LOCAL_BIN}`);
      });
    }

    // Step 3: Symlink
    const existingSymlinkTarget = getSymlinkTarget(AAA_SYMLINK);
    if (existingSymlinkTarget === binPath) {
      yield* Effect.sync(() => {
        log.info("Symlink already exists");
      });
    } else {
      const symlinkExists = yield* fs.exists(AAA_SYMLINK);
      if (symlinkExists) {
        yield* Effect.sync(() => execSync(`rm "${AAA_SYMLINK}"`));
      }
      yield* Effect.sync(() => {
        symlinkSync(binPath, AAA_SYMLINK);
      });
      yield* Effect.sync(() => {
        log.success(`Symlink: ${AAA_SYMLINK} -> ${binPath}`);
      });
    }

    // Step 4: Check PATH
    if (!isInPath(LOCAL_BIN)) {
      yield* Effect.sync(() => {
        log.warn(`${LOCAL_BIN} not in PATH`);
        p.note(
          `Add to ${getShellConfigPath()}:\n\n  ${getExportLine("PATH", "$HOME/.local/bin:$PATH")}`,
          "PATH setup",
        );
      });
    }

    // Step 5: Shell completion
    yield* handleShellCompletionEffect();

    // Step 6: CLAUDE_CONFIG_DIR
    yield* Effect.promise(async () => handleClaudeConfigDirectory());

    // Step 7: Setup statusline
    const userClaudeDirectory = resolve(homedir(), ".claude");
    const statuslineSource = resolve(root, ".claude/scripts/statusline.sh");
    const statuslineDestination = resolve(userClaudeDirectory, "statusline.sh");

    const userClaudeExists = yield* fs.exists(userClaudeDirectory);
    if (!userClaudeExists) {
      yield* Effect.catchAll(fs.mkdirp(userClaudeDirectory), () => Effect.void);
      yield* Effect.sync(() => {
        log.info("Created ~/.claude");
      });
    }

    yield* Effect.sync(() => {
      cpSync(statuslineSource, statuslineDestination);
      execSync(`chmod +x "${statuslineDestination}"`);
      log.success("Copied statusline.sh to ~/.claude/");
    });

    yield* Effect.sync(() => {
      p.outro("User setup complete");
    });
  });
}

// Re-export utilities for use by other modules
export {
  AAA_SYMLINK,
  getAllAgentsRoot,
  getClaudeConfigStatus,
  getCompletionLine,
  getExportLine,
  getShellConfigFilePath,
  getShellConfigPath,
  getShellType,
  getSymlinkTarget,
  installCompletion,
  isCliInstalled,
  isCompletionInstalled,
  isInPath,
  LOCAL_BIN,
} from "./effect-setup";

export default setupCommand;
