# Ralph Testing Feedback

Raw observations during hands-on testing. Process into Tasks/Stories when done.

---

## 2026-01-14

### Config Initialization
- Need `aaa ralph init-config` or similar command
- Should be interactive walkthrough with Q&A
- Generates `ralph.config.json` with user's preferences
- Currently only a template exists at `docs/planning/templates/ralph.config.template.json`

### Documentation: Sync Context Prerequisite
- Must run `aaa sync-context -t <project-dir>` before using Ralph skills in a new project
- Skills reference `@context/workflows/ralph/...` which must exist in target project
- Add to Ralph README/docs as prerequisite step

### Interactive Sessions: Incremental Document Creation
- Currently prompts generate full document at the end (big bang)
- Risk: crash/disconnect = lost work, context loss in long sessions
- **Suggestion:** Prompts should encourage incremental writing:
  - Save sections as they're discussed
  - Update document progressively during conversation
  - User always has partial progress if session ends unexpectedly
- Apply to: vision, roadmap, stories, tasks interactive prompts

### Vision Prompt: Missing "Next Steps" Guidance
- After completing vision, user doesn't know what to do next
- Prompt should end with: "Next: run `aaa ralph plan roadmap` to define milestones"
- **Question:** Can we auto-run next phase after Claude interactive exits? (probably not without wrapper script)

### Vision Prompt Not Loading (BUG) - FIXED
- `aaa ralph plan vision` starts session but prompt content not passed to Claude
- **Root cause:** Shell escaping in `invokeClaude()` function (`tools/src/commands/ralph/index.ts:145`)
- `$(cat '${temporaryPromptPath}')` fails for multiline markdown with quotes/special chars
- **Fixed:** Commit `5134fe4b` - using here-document for safe multiline passing

---

