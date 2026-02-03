## Task: CLI Flags for Approval Control

**Story:** [STORY-001-artifact-approvals](../stories/STORY-001-artifact-approvals.md)

**Depends on:** [TASK-010-approval-evaluation](./TASK-010-approval-evaluation.md)

### Goal

Add `--force`, `--review`, and `--from` flags to cascade-supporting commands so users can control approval behavior from the CLI.

### Context

The approval evaluation logic (TASK-010) uses `ApprovalContext` with `forceFlag` and `reviewFlag` to determine actions. These flags need to be exposed via CLI so users can:
- Skip all approvals for trusted automated runs (`--force`)
- Require all approvals for careful review (`--review`)
- Resume a cascade from a specific level after headless exit (`--from`)

The `--from` flag is particularly important for the git-based approval workflow: when headless mode exits with `"exit-unstaged"`, the user reviews changes, commits (or rejects), then resumes with `--from <next-level>`.

### Plan

1. Update `CascadeFromOptions` interface in `tools/src/commands/ralph/cascade.ts`:
   ```typescript
   interface CascadeFromOptions {
     calibrateEvery?: number;
     contextRoot: string;
     forceFlag?: boolean;    // Skip all approval prompts
     headless?: boolean;
     reviewFlag?: boolean;   // Require all approval prompts
     subtasksPath: string;
   }
   ```

2. Add `--from` handling to `runCascadeFrom()` in `cascade.ts`:
   - Accept optional `fromLevel` parameter
   - When provided, override the `start` parameter
   - Validate that `fromLevel` is a valid level name
   - Validate that `fromLevel` is before or equal to target

3. Add flags to `ralph build` command in `tools/src/commands/ralph/index.ts`:
   ```typescript
   .option("--force", "Skip all approval prompts")
   .option("--review", "Require all approval prompts")
   .option("--from <level>", "Resume cascade from this level (skips earlier levels)")
   ```

4. Add same flags to `ralph plan roadmap` command

5. Add same flags to `ralph plan stories` command

6. Add same flags to `ralph plan tasks` command

7. Add same flags to `ralph plan subtasks` command

8. Update `HandleCascadeOptions` interface to include new flags:
   ```typescript
   interface HandleCascadeOptions {
     calibrateEvery?: number;
     cascadeTarget: string;
     contextRoot: string;
     forceFlag?: boolean;
     fromLevel: string;
     resolvedMilestonePath: null | string;
     reviewFlag?: boolean;
     subtasksPath?: string;
   }
   ```

9. Update `handleCascadeExecution()` helper to pass through flags to `runCascadeFrom()`

10. Add validation in each command action:
    - Error if both `--force` and `--review` specified (mutually exclusive)
    - Validate `--from` level name using `isValidLevelName()`

### Acceptance Criteria

- [ ] `--force` flag added to: `ralph build`, `ralph plan roadmap`, `ralph plan stories`, `ralph plan tasks`, `ralph plan subtasks`
- [ ] `--review` flag added to same 5 commands
- [ ] `--from <level>` flag added to same 5 commands
- [ ] `aaa ralph build --help` shows all three new flags with descriptions
- [ ] `aaa ralph plan subtasks --help` shows all three new flags
- [ ] `CascadeFromOptions` interface includes `forceFlag` and `reviewFlag`
- [ ] `runCascadeFrom()` accepts and uses `fromLevel` parameter
- [ ] `--from invalid-level` produces error: "Invalid level 'invalid-level'. Valid levels: roadmap, stories, tasks, subtasks, build, calibrate"
- [ ] `--force --review` together produces error: "Cannot use --force and --review together"
- [ ] `--from build` with `--cascade calibrate` starts cascade at build level (skips earlier)

### Test Plan

- [ ] Manual: `aaa ralph build --help` shows `--force`, `--review`, `--from` flags
- [ ] Manual: `aaa ralph plan subtasks --help` shows flags
- [ ] Manual: `aaa ralph plan subtasks --from invalid` produces helpful error
- [ ] Manual: `aaa ralph plan subtasks --force --review` produces mutual exclusion error
- [ ] Unit test: `isValidLevelName()` validates `--from` values
- [ ] TypeScript compiles without errors (`bun run typecheck`)

### Scope

- **In:** CLI flag definitions, options interfaces, flag validation, passing flags through to cascade
- **Out:** Actual approval prompting behavior, git workflow, notification wait logic (separate tasks)

### Notes

**Flag semantics:**

| Flag | Effect |
|------|--------|
| `--force` | `evaluateApproval()` always returns `"write"` |
| `--review` | `evaluateApproval()` treats all gates as `"always"` mode |
| `--from <level>` | Cascade skips levels before `<level>`, starts execution there |

**Mutual exclusion:**
`--force` and `--review` are opposites - one skips approvals, one requires them. Using both is a user error and should fail fast with a clear message.

**Resume workflow example:**
```bash
# Initial run - cascade exits at subtasks approval (headless + always)
$ aaa ralph plan stories --milestone 003 --cascade build -H
# ... exits with unstaged changes ...

# User reviews, commits
$ git add . && git commit -m "feat: generated subtasks"

# Resume from subtasks level
$ aaa ralph plan stories --milestone 003 --cascade build --from subtasks -H
```

**Why not a separate command:**
Adding `--from` to existing commands keeps the CLI surface minimal. Users don't need to learn a new command - they just add `--from` to retry/resume.
