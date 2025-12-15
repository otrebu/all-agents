import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  symlinkSync,
} from "node:fs";
import { resolve } from "node:path";

import {
  AAA_SYMLINK,
  getAllAgentsRoot,
  getClaudeConfigStatus,
  getExportLine,
  getShellConfigPath,
  getSymlinkTarget,
  isCliInstalled,
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
    p.log.success("CLAUDE_CONFIG_DIR already set correctly");
    return;
  }

  if (status === "different") {
    p.log.warn(`CLAUDE_CONFIG_DIR points to: ${current}`);
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
    p.log.info("Skipped CLAUDE_CONFIG_DIR setup");
    return;
  }

  p.note(
    `Add to ${shellConfig}:\n\n  ${getExportLine("CLAUDE_CONFIG_DIR", expected)}\n\nThen run: source ${shellConfig}`,
    "CLAUDE_CONFIG_DIR",
  );
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
    p.log.error("Specify --user or --project");
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
    p.log.error("Cannot setup project in all-agents repo itself");
    process.exit(1);
  }

  // Step 1: Check user setup
  if (!isCliInstalled()) {
    p.log.warn(
      "CLI not installed. Run: aaa setup --user (or bun run dev setup --user)",
    );
  }

  // Step 2: CLAUDE_CONFIG_DIR
  await handleClaudeConfigDirectory();

  // Step 3: Symlink context/
  const contextTarget = resolve(root, "context");
  const contextLink = resolve(cwd, "context");

  const existingTarget = getSymlinkTarget(contextLink);
  if (existingTarget === contextTarget) {
    p.log.info("context/ symlink already exists");
  } else if (existsSync(contextLink)) {
    p.log.error("context/ already exists (not a symlink to all-agents)");
    p.log.info(`Remove it first: rm -rf "${contextLink}"`);
    process.exit(1);
  } else {
    symlinkSync(contextTarget, contextLink);
    p.log.success(`Symlink: context/ -> ${contextTarget}`);
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
      p.log.info(`docs/${subdir}/ already exists`);
    } else if (DIRS_ONLY.includes(subdir)) {
      mkdirSync(destinationDirectory, { recursive: true });
      p.log.success(`Created docs/${subdir}/`);
    } else {
      cpSync(resolve(docsSource, subdir), destinationDirectory, {
        recursive: true,
      });
      p.log.success(`Copied docs/${subdir}/`);
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
    p.log.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }

  if (!existsSync(binPath)) {
    p.log.error(`Binary not found at ${binPath}`);
    process.exit(1);
  }

  // Step 2: Create ~/.local/bin
  if (!existsSync(LOCAL_BIN)) {
    mkdirSync(LOCAL_BIN, { recursive: true });
    p.log.info(`Created ${LOCAL_BIN}`);
  }

  // Step 3: Symlink
  const existingSymlinkTarget = getSymlinkTarget(AAA_SYMLINK);
  if (existingSymlinkTarget === binPath) {
    p.log.info("Symlink already exists");
  } else {
    if (existsSync(AAA_SYMLINK)) {
      execSync(`rm "${AAA_SYMLINK}"`);
    }
    symlinkSync(binPath, AAA_SYMLINK);
    p.log.success(`Symlink: ${AAA_SYMLINK} -> ${binPath}`);
  }

  // Step 4: Check PATH
  if (!isInPath(LOCAL_BIN)) {
    p.log.warn(`${LOCAL_BIN} not in PATH`);
    p.note(
      `Add to ${getShellConfigPath()}:\n\n  ${getExportLine("PATH", "$HOME/.local/bin:$PATH")}`,
      "PATH setup",
    );
  }

  // Step 5: CLAUDE_CONFIG_DIR
  await handleClaudeConfigDirectory();

  p.outro("User setup complete");
}

export default setupCommand;
