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

### Planning Sessions: Need More Handholding at Completion
- After completing a document (roadmap, vision, etc.), prompt should offer:
  1. **Detailed review:** "If you're happy, let's review it all in detail together"
  2. **Gap analysis:** "Let me spin up a subagent with a gap-finder prompt based on what I understand about your app"
- User wants BOTH options presented
- Apply to: vision, roadmap, stories, tasks completion phases
- Could use Opus subagent for gap/risk analysis before finalizing

### Regular Validation Checkpoints (IMPORTANT)
- Don't just trust user input - actively validate at each step
- After reviewing each milestone/story, offer: "Want me to spin up an Opus subagent to check if we're missing anything?"
- Should be prompted REGULARLY, not just at the end
- Especially during step-by-step review - challenge assumptions
- **KEY: Use SUBAGENT with fresh context** - same agent gets blind spots from conversation history
- Fresh eyes on just the artifacts (VISION.md, ROADMAP.md) catches what we both missed
- Subagent reads files cold, no bias from discussion that led to current state

### Roadmap vs Stories: Scope Creep Risk
- Easy to over-plan roadmap and drift into story-level details
- Roadmap should stay at milestone/outcome level
- Need clearer guardrails: "That's story-level detail - let's capture it and move on"
- More research needed on where to draw the line
- Possibly: explicit "parking lot" for story ideas that come up during roadmap planning

### Planning: Offer Web/Browser Integration
- Planning agent should ask: "Want to show me anything on the web? (competitor app, existing system, docs, mockups)"
- Use Chrome/Playwright MCP integration to extract requirements from:
  - Existing apps being replaced
  - Competitor products
  - Design mockups (Figma, etc.)
  - External documentation
- Could be offered at start of vision/roadmap OR when discussing specific features
- Helps ground planning in real examples, not just abstract discussion

### Milestone Review Prompt (NEW)
- Detailed walkthrough after roadmap is drafted
- Prompt template:
  ```
  Let's review ROADMAP.md milestone by milestone.

  For each one:
  1. **Show it as-is** (quote the current text)
  2. **Summarize your understanding** (what users can DO when complete - in your words)
  3. **Dependencies** (what must exist before this works)
  4. **Acceptance criteria** (how we know it's done)
  5. **Open questions** (things unclear or under-specified)
  6. **Ask me 1-2 clarifying questions** before moving on

  Go through them one at a time. Pause after each for my input - I'll confirm or we refine. Then next milestone.

  Start with #1.
  ```
- Could be offered after gap analysis completes
- Ensures shared understanding before moving to stories

### Gap Analyzer Subagent (NEW)
- Should be a **subagent** (not skill) - runs analysis, returns findings
- Prompt template:
  ```
  Analyze ROADMAP.md for gaps, risks, and blind spots:

  1. **Missing milestones** - What's likely needed that isn't listed?
  2. **Dependency risks** - Are milestones in wrong order? Hidden blockers?
  3. **Scope creep traps** - Which milestones are vague enough to explode?
  4. **Technical risks** - Integration challenges, unknown unknowns?
  5. **User journey gaps** - Can users actually accomplish their jobs with this sequence?

  Compare against VISION.md - does the roadmap fully deliver the vision?

  Be critical, not polite. Find problems now, not during implementation.
  ```
- Invoke automatically at end of roadmap planning
- Could also work for: vision (vs problem statement), stories (vs milestone), tasks (vs story)

### CLI: Missing --auto Flag for Plan Commands
- VISION.md specifies `--auto, -a` flag for auto mode
- Currently NOT implemented in CLI
- Should use `stories-auto.md`, `tasks-auto.md`, etc. prompts
- Commands that need it: `ralph plan stories --auto`, `ralph plan tasks --auto`, `ralph plan subtasks --auto`
- Roadmap auto is "risky" per VISION.md, subtasks is "always auto"

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

