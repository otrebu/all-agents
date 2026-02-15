import * as p from "@clack/prompts";
import { unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  AAA_SYMLINK,
  getAllAgentsRoot,
  getClaudeConfigStatus,
  getShellConfigPath,
  getSymlinkTarget,
  isCliInstalled,
} from "./setup/utils";

interface UninstallOptions {
  project?: boolean;
  user?: boolean;
}

function executeUninstall(options: UninstallOptions): void {
  if (options.user !== true && options.project !== true) {
    p.log.error("Specify --user or --project");
    process.exit(1);
  }

  performUninstall(options);
}

function performUninstall(options: UninstallOptions): void {
  if (options.user !== true && options.project !== true) {
    return;
  }

  if (options.user === true) {
    removeUserInstallation();
  }

  if (options.project === true) {
    removeProjectInstallation();
  }
}

function removeProjectInstallation(): void {
  p.intro("aaa uninstall --project");

  const cwd = process.cwd();
  const contextLink = resolve(cwd, "context");
  const root = getAllAgentsRoot();
  const expectedTarget = resolve(root, "context");

  const actualTarget = getSymlinkTarget(contextLink);

  if (actualTarget === null) {
    p.log.warn("context/ symlink not found");
    p.outro("Nothing to uninstall");
    return;
  }

  const resolvedActualTarget = resolve(dirname(contextLink), actualTarget);

  if (resolvedActualTarget !== expectedTarget) {
    p.log.error("context/ is not a symlink to all-agents");
    p.outro("Skipped");
    return;
  }

  unlinkSync(contextLink);
  p.log.success("Removed context/ symlink");
  p.outro("Project uninstall complete");
}

function removeUserInstallation(): void {
  p.intro("aaa uninstall --user");

  if (!isCliInstalled()) {
    p.log.warn("aaa symlink not found");
    p.outro("Nothing to uninstall");
    return;
  }

  unlinkSync(AAA_SYMLINK);
  p.log.success(`Removed ${AAA_SYMLINK}`);

  // Remove ~/.agents/skills symlink if it points to our repo
  const agentsSkillsDirectory = resolve(homedir(), ".agents/skills");
  const skillsTarget = getSymlinkTarget(agentsSkillsDirectory);
  if (skillsTarget?.includes("all-agents") === true) {
    unlinkSync(agentsSkillsDirectory);
    p.log.success("Removed ~/.agents/skills symlink");
  }

  // Warn about CLAUDE_CONFIG_DIR if set
  const { current, status } = getClaudeConfigStatus();
  if (status !== "unset") {
    const shellConfig = getShellConfigPath();
    p.note(
      `Remove from ${shellConfig}:\n\n  export CLAUDE_CONFIG_DIR="${current}"`,
      "CLAUDE_CONFIG_DIR",
    );
  }

  p.outro("User uninstall complete");
}

export default executeUninstall;
