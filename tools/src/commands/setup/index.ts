import * as p from "@clack/prompts";
import log from "@lib/log";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

import { syncContext } from "../sync-context";
import {
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
} from "./utils";

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

async function handleShellCompletion(): Promise<void> {
  const shell = getShellType();
  const configPath = getShellConfigFilePath();

  if (isCompletionInstalled()) {
    log.success("Shell completion already installed");
    return;
  }

  const shouldInstall = await p.confirm({
    initialValue: true,
    message: `Install tab completion for ${shell}?`,
  });

  if (p.isCancel(shouldInstall) || !shouldInstall) {
    log.info("Skipped shell completion");
    p.note(
      `To enable later, add to ${configPath}:\n\n  ${getCompletionLine(shell)}`,
      "Shell completion",
    );
    return;
  }

  installCompletion();
  log.success(`Shell completion added to ${configPath}`);
  log.info(`Restart your shell or run: source ${configPath}`);
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
  p.intro("aaa setup --project");

  const cwd = process.cwd();
  const root = getAllAgentsRoot();

  // Check if running from all-agents itself
  if (resolve(cwd) === resolve(root)) {
    log.error("Cannot setup project in all-agents repo itself");
    process.exit(1);
  }

  // Step 1: Check user setup
  if (!isCliInstalled()) {
    log.warn(
      "CLI not installed. Run: aaa setup --user (or bun run dev setup --user)",
    );
  }

  // Step 2: CLAUDE_CONFIG_DIR
  await handleClaudeConfigDirectory();

  // Step 3: Setup context/
  const contextTarget = resolve(root, "context");
  const contextLink = resolve(cwd, "context");

  // Check existing state
  const existingSymlinkTarget = getSymlinkTarget(contextLink);
  const isExistingSymlink = existingSymlinkTarget === contextTarget;
  const isExistingDirectory =
    existsSync(contextLink) &&
    existingSymlinkTarget === null &&
    lstatSync(contextLink).isDirectory();

  // Determine default based on existing state (sync if already has synced copy)
  let defaultMethod: "symlink" | "sync" = "symlink";
  if (isExistingDirectory) {
    defaultMethod = "sync";
  }

  const contextMethod = await p.select({
    initialValue: defaultMethod,
    message: "How do you want to link context/?",
    options: [
      {
        hint: "Real-time updates, may not work with Claude Code/Cursor",
        label: "Symlink",
        value: "symlink",
      },
      {
        hint: "Manual updates via aaa sync-context",
        label: "Sync copy (recommended)",
        value: "sync",
      },
    ],
  });

  if (p.isCancel(contextMethod)) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  if (contextMethod === "symlink") {
    // Handle switch from sync to symlink
    if (isExistingDirectory) {
      const shouldSwitch = await p.confirm({
        initialValue: false,
        message: "context/ exists as directory. Remove and create symlink?",
      });
      if (p.isCancel(shouldSwitch) || !shouldSwitch) {
        log.info("Keeping existing context/ directory");
      } else {
        execSync(`rm -rf "${contextLink}"`);
        symlinkSync(contextTarget, contextLink);
        log.success(`Symlink: context/ -> ${contextTarget}`);
      }
    } else if (isExistingSymlink) {
      log.info("context/ symlink already exists");
    } else {
      symlinkSync(contextTarget, contextLink);
      log.success(`Symlink: context/ -> ${contextTarget}`);
    }

    // Always warn about symlink compatibility
    log.warn("Symlinks may not work correctly with Claude Code or Cursor.");
    log.info("If you have issues, re-run setup and choose 'Sync copy'.");
  } else {
    // Sync mode
    // Handle switch from symlink to sync
    if (isExistingSymlink) {
      unlinkSync(contextLink);
      log.info("Removed existing symlink");
    }

    // Run first sync
    await syncContext(cwd);
    log.success("Synced context/");

    // Show guidance
    p.note(
      `To keep context/ updated:\n  aaa sync-context          # one-time sync\n  aaa sync-context --watch  # auto-sync while editing all-agents`,
      "Sync usage",
    );
  }

  // Step 4: Copy docs templates
  const DIRS_ONLY = ["planning", "research"];
  const docsSource = resolve(root, "docs");
  const docsDestination = resolve(cwd, "docs");

  const subdirs = readdirSync(docsSource, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const subdir of subdirs) {
    const destinationDirectory = resolve(docsDestination, subdir);
    if (existsSync(destinationDirectory)) {
      log.info(`docs/${subdir}/ already exists`);
    } else if (DIRS_ONLY.includes(subdir)) {
      mkdirSync(destinationDirectory, { recursive: true });
      log.success(`Created docs/${subdir}/`);
    } else {
      cpSync(resolve(docsSource, subdir), destinationDirectory, {
        recursive: true,
      });
      log.success(`Copied docs/${subdir}/`);
    }
  }

  p.outro("Project setup complete");
}

async function setupUser(): Promise<void> {
  p.intro("aaa setup --user");

  const root = getAllAgentsRoot();
  const binPath = resolve(root, "bin/aaa");
  const toolsDir = resolve(root, "tools");

  // Step 1: Build
  const s = p.spinner();
  s.start("Building CLI...");
  try {
    execSync("bun run build", { cwd: toolsDir, stdio: "pipe" });
    s.stop("CLI built");
  } catch (error) {
    s.stop("Build failed");
    log.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }

  if (!existsSync(binPath)) {
    log.error(`Binary not found at ${binPath}`);
    process.exit(1);
  }

  // Step 2: Create ~/.local/bin
  if (!existsSync(LOCAL_BIN)) {
    mkdirSync(LOCAL_BIN, { recursive: true });
    log.info(`Created ${LOCAL_BIN}`);
  }

  // Step 3: Symlink
  const existingSymlinkTarget = getSymlinkTarget(AAA_SYMLINK);
  if (existingSymlinkTarget === binPath) {
    log.info("Symlink already exists");
  } else {
    if (existsSync(AAA_SYMLINK)) {
      execSync(`rm "${AAA_SYMLINK}"`);
    }
    symlinkSync(binPath, AAA_SYMLINK);
    log.success(`Symlink: ${AAA_SYMLINK} -> ${binPath}`);
  }

  // Step 4: Check PATH
  if (!isInPath(LOCAL_BIN)) {
    log.warn(`${LOCAL_BIN} not in PATH`);
    p.note(
      `Add to ${getShellConfigPath()}:\n\n  ${getExportLine("PATH", "$HOME/.local/bin:$PATH")}`,
      "PATH setup",
    );
  }

  // Step 5: Shell completion
  await handleShellCompletion();

  // Step 6: CLAUDE_CONFIG_DIR
  await handleClaudeConfigDirectory();

  // Step 7: Setup statusline
  const userClaudeDirectory = resolve(homedir(), ".claude");
  const statuslineSource = resolve(root, ".claude/scripts/statusline.sh");
  const statuslineDestination = resolve(userClaudeDirectory, "statusline.sh");

  if (!existsSync(userClaudeDirectory)) {
    mkdirSync(userClaudeDirectory, { recursive: true });
    log.info("Created ~/.claude");
  }

  cpSync(statuslineSource, statuslineDestination);
  execSync(`chmod +x "${statuslineDestination}"`);
  log.success("Copied statusline.sh to ~/.claude/");

  // Step 8: Setup ~/.agents/skills symlink (universal agent skills)
  const agentsSkillsDirectory = resolve(homedir(), ".agents/skills");
  const skillsSource = resolve(root, ".claude/skills");

  if (!existsSync(resolve(homedir(), ".agents"))) {
    mkdirSync(resolve(homedir(), ".agents"), { recursive: true });
    log.info("Created ~/.agents");
  }

  const existingSkillsTarget = getSymlinkTarget(agentsSkillsDirectory);
  if (existingSkillsTarget === skillsSource) {
    log.info("~/.agents/skills symlink already exists");
  } else if (existsSync(agentsSkillsDirectory)) {
    log.warn("~/.agents/skills already exists (not a symlink to this repo)");
    log.info("To fix: rm -rf ~/.agents/skills && aaa setup --user");
  } else {
    symlinkSync(skillsSource, agentsSkillsDirectory);
    log.success(`Symlink: ~/.agents/skills -> ${skillsSource}`);
  }

  p.outro("User setup complete");
}

export default setupCommand;
