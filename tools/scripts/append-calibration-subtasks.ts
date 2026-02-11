#!/usr/bin/env bun
/**
 * One-shot script to append calibration refactor subtasks to milestone 006.
 * Run: bun tools/scripts/append-calibration-subtasks.ts
 */
import path from "node:path";
import { appendSubtasksToFile } from "../src/commands/ralph/config";

const ROOT = path.resolve(import.meta.dirname, "../..");
const subtasksPath = path.join(
  ROOT,
  "docs/planning/milestones/006-cascade-mode-for-good/subtasks.json",
);

const newSubtasks = [
  {
    id: "SUB-031",
    taskRef: "WS-04-calibration-refactor",
    title: "Add extractDiffSummary and resolvePlanningChain pre-processing utilities",
    description:
      "Add two new utility functions to calibrate.ts: (1) extractDiffSummary(commitHash, subtaskId) — runs git show --stat and git show to get the full diff patch and file list for a given commit, returning a DiffSummary object. (2) resolvePlanningChain(subtask, milestonePath) — resolves the subtask→task→story chain by reading task/story files or extracting workstream sections from MILESTONE.md. Returns null when no planning context is resolvable (e.g. subtasks from arbitrary file/text input). Both functions are pure TypeScript with no LLM calls.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] extractDiffSummary returns DiffSummary with commitHash, filesChanged, patch, statSummary, subtaskId for a valid commit",
      "[Behavioral] resolvePlanningChain returns PlanningChainContext with taskContent and storyContent for a file-based subtask (milestones 003/004 pattern)",
      "[Behavioral] resolvePlanningChain returns PlanningChainContext with milestoneSection for a workstream-based subtask (milestones 005/006 pattern)",
      "[Behavioral] resolvePlanningChain returns null for subtasks with unresolvable taskRef",
      "[Evidence] Unit tests in tools/tests/lib/calibrate-preprocess.test.ts pass via bun test tools/tests/lib/calibrate-preprocess.test.ts",
    ],
    filesToRead: [
      "tools/src/commands/ralph/calibrate.ts",
      "tools/src/commands/ralph/config.ts",
      "tools/src/commands/ralph/types.ts",
      "docs/planning/milestones/006-cascade-mode-for-good/MILESTONE.md",
    ],
  },
  {
    id: "SUB-032",
    taskRef: "WS-04-calibration-refactor",
    title: "Add resolveFilesToRead utility and mergeCalibrationResults merger",
    description:
      "Add two more pre-processing utilities to calibrate.ts: (1) resolveFilesToRead(filesToRead) — reads ALL files from a subtask's filesToRead array, resolving @context/ prefixes to absolute paths, skipping missing files with a warning. Returns array of {path, content, tokenEstimate}. (2) mergeCalibrationResults(findings[]) — pure TypeScript merge of CalibrationParseResult arrays from multiple batch iterations: concatenates correctiveSubtasks, deduplicates by title similarity, merges summaries, returns unified CalibrationParseResult.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] resolveFilesToRead resolves @context/ prefix to absolute path and returns file content",
      "[Behavioral] resolveFilesToRead skips non-existent files and logs a warning instead of throwing",
      "[Behavioral] mergeCalibrationResults concatenates correctiveSubtasks from multiple batches",
      "[Behavioral] mergeCalibrationResults deduplicates subtasks with identical titles",
      "[Evidence] Unit tests in tools/tests/lib/calibrate-preprocess.test.ts pass via bun test tools/tests/lib/calibrate-preprocess.test.ts",
    ],
    filesToRead: [
      "tools/src/commands/ralph/calibrate.ts",
      "tools/src/commands/ralph/types.ts",
      "tools/src/commands/ralph/config.ts",
    ],
  },
  {
    id: "SUB-033",
    taskRef: "WS-04-calibration-refactor",
    title: "Create session-analysis.ts streaming signal extraction pipeline",
    description:
      "Create tools/src/commands/ralph/session-analysis.ts — a new module implementing the streaming signal extraction pipeline. Implements extractSignals(jsonlPath): Promise<OffTrackReport> with 8 stateful detectors that process JSONL line-by-line: (1) FilesTooBigDetector — regex for 'exceeds maximum allowed tokens', (2) FileNotFoundDetector — is_error + 'File does not exist', (3) StuckLoopDetector — sliding window size 3 over (tool_name, input_hash), (4) BacktrackDetector — track Edit old/new strings and detect reversals, (5) ExplorationDetector — window of 10+ Read/Glob/Grep with 0 Edit/Write, (6) SelfCorrectionDetector — regex for hedging/correction phrases in assistant text, (7) TokenAccelerationDetector — input_tokens growth >3x, (8) TestFixLoopDetector — Bash(test)->Edit->Bash(test) cycles. Reuses countToolCalls, getFilesFromSession, calculateDurationMs, getTokenUsageFromSession from session.ts. Includes composite scorer with weighted sum normalized by session length.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] extractSignals returns OffTrackReport with all 8 signal detector results",
      "[Behavioral] StuckLoopDetector detects repeated (tool_name, input_hash) tuples within a sliding window of 3",
      "[Behavioral] BacktrackDetector identifies edit reversals where new_string matches a previous old_string for the same file",
      "[Behavioral] Composite offTrackScore is 0-1 with stuck loops weighted at 0.25",
      "[Behavioral] Processing a clean session with no issues produces offTrackScore < 0.1",
      "[Evidence] Unit tests in tools/tests/lib/session-analysis.test.ts pass via bun test tools/tests/lib/session-analysis.test.ts",
    ],
    filesToRead: [
      "tools/src/commands/ralph/session.ts",
      "tools/src/commands/ralph/types.ts",
      ".claude/plans/mellow-imagining-spark.md",
    ],
  },
  {
    id: "SUB-034",
    taskRef: "WS-04-calibration-refactor",
    title: "Refactor runIntentionCheck to batch loop architecture",
    description:
      "Refactor runIntentionCheck() in calibrate.ts from a single provider invocation to a TypeScript-controlled batch loop. For each batch of 5 completed subtasks: (1) pre-resolve per subtask using extractDiffSummary and resolvePlanningChain, (2) filter out subtasks with null planning chain (intention drift requires planning context), (3) build a scoped prompt with only the batch's data (no @PROGRESS.md, @VISION.md, or full @subtasksPath), (4) invoke provider with the batch prompt, (5) parse findings and accumulate. After all batches, merge results via mergeCalibrationResults and apply via applyCalibrationProposal. Token budget per batch: ~15-23K tokens.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] runIntentionCheck processes completed subtasks in batches of 5 instead of a single invocation",
      "[Behavioral] Subtasks without resolvable planning chain are filtered out (not sent to provider)",
      "[Behavioral] Prompt no longer references @PROGRESS.md or @VISION.md (removes ~50K tokens)",
      "[Behavioral] Each batch invocation receives only its batch's subtask entries, diffs, and planning chain content inline",
      "[Regression] applyCalibrationProposal still receives merged results and applies/stages correctly",
      "[Evidence] Dry run: aaa ralph calibrate intention --review completes without context window overflow on milestone 006",
    ],
    filesToRead: [
      "tools/src/commands/ralph/calibrate.ts",
      "tools/src/commands/ralph/providers/registry.ts",
      "tools/src/commands/ralph/config.ts",
    ],
  },
  {
    id: "SUB-035",
    taskRef: "WS-04-calibration-refactor",
    title: "Refactor runTechnicalCheck to batch loop architecture",
    description:
      "Refactor runTechnicalCheck() in calibrate.ts to use the same batch loop pattern as runIntentionCheck. For each batch of 5 completed subtasks: (1) extractDiffSummary per subtask (full diff), (2) resolveFilesToRead(subtask.filesToRead) to inline all referenced files (atomic docs, source files, configs), (3) subtask entry with AC/description already available, (4) build prompt with all data inline ('DO NOT read additional files beyond what is provided'), (5) invoke provider, accumulate findings. No resolvePlanningChain needed — all subtasks are eligible. After all batches, merge and apply. Reference consistency-checker.md methodology for 'Code vs Prose' (categories 6-13) and 'Code-to-Code' (categories 14-19) patterns in the prompt.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] runTechnicalCheck processes completed subtasks in batches of 5 with inline filesToRead content",
      "[Behavioral] All subtasks are analyzed (no filtering — unlike intention check, planning chain is not required)",
      "[Behavioral] Prompt includes reference to consistency-checker.md categories 6-13 and 14-19 for structured analysis",
      "[Behavioral] Prompt instructs 'DO NOT read additional files beyond what is provided'",
      "[Regression] applyCalibrationProposal still receives merged results and applies/stages correctly",
      "[Evidence] Dry run: aaa ralph calibrate technical --review completes without context window overflow on milestone 006",
    ],
    filesToRead: [
      "tools/src/commands/ralph/calibrate.ts",
      "context/workflows/consistency-checker.md",
      "tools/src/commands/ralph/config.ts",
    ],
  },
  {
    id: "SUB-036",
    taskRef: "WS-04-calibration-refactor",
    title: "Refactor runImproveCheck to signal-based per-session loop",
    description:
      "Refactor runImproveCheck() in calibrate.ts to use the session-analysis.ts pipeline instead of raw JSONL. For each unique session: (1) run extractSignals(sessionLogPath) to get OffTrackReport (~2-5K tokens), (2) skip sessions with offTrackScore < 0.1 (LLM-free triage), (3) build a prompt with the OffTrackReport JSON as <session-signals> (not raw JSONL), (4) invoke provider per session, (5) accumulate findings. After all sessions, merge and apply. Remove raw session log embedding from the prompt. Keep session log path in prompt for optional targeted spot-checking by the LLM.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] runImproveCheck invokes extractSignals per unique session instead of embedding raw JSONL",
      "[Behavioral] Sessions with offTrackScore < 0.1 are skipped without provider invocation",
      "[Behavioral] Prompt receives <session-signals> JSON (~2-5K tokens) instead of raw session log (500K+)",
      "[Behavioral] Session log path is available in prompt for targeted spot-checking",
      "[Regression] Self-improvement mode handling (suggest/autofix/off) unchanged",
      "[Evidence] Dry run: aaa ralph calibrate improve --review completes without context window overflow on milestone 006",
    ],
    filesToRead: [
      "tools/src/commands/ralph/calibrate.ts",
      "tools/src/commands/ralph/session-analysis.ts",
      "tools/src/commands/ralph/session.ts",
    ],
  },
  {
    id: "SUB-037",
    taskRef: "WS-04-calibration-refactor",
    title: "Rewrite calibration workflow prompts as inner batch prompts",
    description:
      "Rewrite the 3 calibration workflow .md files as inner batch prompts: (1) intention-drift.md — remove Phase 2 parallel analyzer spawning, rewrite as single-batch analysis instructions ('You are given N subtasks with their diffs and planning chain. Analyze each for intention drift.'), add 'DO NOT read additional files' instruction, keep output JSON schema unchanged. (2) technical-drift.md — same parallel removal, keep atomic doc checking patterns, add reference to consistency-checker.md 'Code vs Prose' (6-13) and 'Code-to-Code' (14-19) categories as analysis framework, add 'DO NOT read additional files beyond what is provided'. (3) self-improvement.md — rewrite Phase 2 for signal-based analysis with <session-signals> template instead of raw <session-log>, allow targeted Grep spot-checking for backtracking signals, remove aspirational chunking guidance.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] intention-drift.md contains no Phase 2 parallel subagent spawning instructions",
      "[Behavioral] intention-drift.md instructs 'DO NOT read additional files' since all data is pre-gathered",
      "[Behavioral] technical-drift.md references consistency-checker.md categories 6-13 and 14-19",
      "[Behavioral] self-improvement.md uses <session-signals> template instead of <session-log>",
      "[Regression] All three prompts still specify the same JSON output schema (summary, insertionMode, correctiveSubtasks)",
      "[Evidence] grep -q 'DO NOT read additional files' context/workflows/ralph/calibration/intention-drift.md exits 0",
    ],
    filesToRead: [
      "context/workflows/ralph/calibration/intention-drift.md",
      "context/workflows/ralph/calibration/technical-drift.md",
      "context/workflows/ralph/calibration/self-improvement.md",
      "context/workflows/consistency-checker.md",
    ],
  },
  {
    id: "SUB-038",
    taskRef: "WS-04-calibration-refactor",
    title: "Rewrite SKILL.md as thin CLI wrapper",
    description:
      "Rewrite .claude/skills/ralph-calibrate/SKILL.md from a 219-line orchestration document to a thin CLI delegation wrapper. The skill should: (1) parse the argument to determine which check to run (intention, technical, improve, all), (2) build CLI command: aaa ralph calibrate <check> [--review|--force], (3) run via Bash tool, (4) display output to user. Move OUT of the skill: prerequisite checks (CLI does these with clear error messages), sequential execution logic for 'all' (CLI handles), selfImprovement config reading (CLI handles), direct references to workflow .md files. Keep IN the skill: argument parsing, CLI invocation, output presentation, usage documentation. Update mode terminology from (always/auto/never) to (suggest/autofix/off) to match current implementation.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] SKILL.md delegates to aaa ralph calibrate <check> via Bash tool instead of implementing orchestration",
      "[Behavioral] SKILL.md no longer contains prerequisite checks or sequential execution logic",
      "[Behavioral] Mode terminology uses suggest/autofix/off (not always/auto/never)",
      "[Behavioral] Usage documentation shows available subcommands and flags",
      "[Evidence] SKILL.md line count under 60 lines (down from 219)",
    ],
    filesToRead: [
      ".claude/skills/ralph-calibrate/SKILL.md",
      "tools/src/commands/ralph/calibrate.ts",
    ],
  },
  {
    id: "SUB-039",
    taskRef: "WS-04-calibration-refactor",
    title: "Integration test: full calibration suite on milestone 006",
    description:
      "Run the full calibration suite to verify the batch loop architecture works end-to-end: (1) aaa ralph calibrate intention --review on milestone 006 (30 subtasks → 6 batches at size 5), (2) aaa ralph calibrate technical --review on milestone 006, (3) aaa ralph calibrate improve --review on milestone 006 (unique sessions → per-session iterations), (4) aaa ralph calibrate all --review, (5) verify aaa ralph build --calibrate-every 3 still triggers periodic calibration. Also test cross-milestone on milestone 003 (file-based tasks/stories) to verify both resolution paths in resolvePlanningChain work.",
    done: false,
    acceptanceCriteria: [
      "[Behavioral] aaa ralph calibrate intention --review completes on milestone 006 without OOM or context overflow",
      "[Behavioral] aaa ralph calibrate technical --review completes on milestone 006",
      "[Behavioral] aaa ralph calibrate improve --review completes on milestone 006",
      "[Behavioral] aaa ralph calibrate all --review runs all three checks sequentially",
      "[Regression] aaa ralph build --calibrate-every 3 --review triggers calibration at correct interval",
      "[Evidence] All checks produce valid JSON proposals staged in feedback/ directory",
    ],
    filesToRead: [
      "tools/src/commands/ralph/calibrate.ts",
      "tools/src/commands/ralph/build.ts",
      "docs/planning/milestones/006-cascade-mode-for-good/subtasks.json",
    ],
  },
];

const result = appendSubtasksToFile(subtasksPath, newSubtasks as any, {
  scope: "milestone",
  milestoneRef: "006-cascade-mode-for-good",
});

console.log(
  `Added ${result.added} subtasks, skipped ${result.skipped} duplicates`,
);
console.log(`File: ${subtasksPath}`);
