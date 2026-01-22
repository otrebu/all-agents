## Task: Prompt Quality Improvements

### Goal
Improve all Ralph planning and review prompts with consistent quality patterns from FEEDBACK.md.

### Context
User testing revealed several UX gaps in how prompts guide the planning process. These patterns should be applied across all interactive prompts.

### Prompt Patterns to Implement

#### 1. Incremental Document Creation
- Save sections as they're discussed, not big-bang at end
- Use Write tool progressively during conversation
- User always has partial progress if session ends unexpectedly
- **Applies to:** vision, roadmap, stories, tasks interactive prompts

#### 2. Handholding at Completion
After completing a document, offer both options:
1. "Let's review it in detail together"
2. "Let me spin up a subagent for gap analysis"
- **Applies to:** vision, roadmap, stories, tasks completion phases

#### 3. Regular Validation Checkpoints
- Don't just trust user input - actively validate at each step
- Offer: "Want me to spin up an Opus subagent to check if we're missing anything?"
- Use SUBAGENT with fresh context (same agent gets blind spots)
- **Applies to:** after reviewing each milestone/story during step-by-step review

#### 4. Scope Creep Guardrails
- Roadmap should stay at milestone/outcome level
- When user drifts into story-level detail: "That's story-level detail - let's capture it and move on"
- Maintain explicit "parking lot" for story ideas that come up during roadmap planning
- **Applies to:** roadmap-interactive.md

#### 5. Web/Browser Integration
- Ask: "Want to show me anything on the web? (competitor app, existing system, docs, mockups)"
- Use Chrome/Playwright MCP to extract requirements from real examples
- Offer at start of vision/roadmap OR when discussing specific features
- **Applies to:** vision-interactive.md, roadmap-interactive.md

#### 6. Next Steps Guidance
- After completing any artifact, tell user what to run next
- Example: "Next: run `aaa ralph plan roadmap` to define milestones"
- **Applies to:** ALL interactive prompts at completion

#### 7. Chunked Review Presentation
- Present findings one at a time, not full dump
- "I'll show you one review point at a time. Ready for the first one?"
- Wait for acknowledgment before next finding
- **Applies to:** ALL review prompts (stories-review, roadmap-review, gap prompts)

### Files to Update

**Planning prompts:**
- `context/workflows/ralph/planning/vision-interactive.md`
- `context/workflows/ralph/planning/roadmap-interactive.md`
- `context/workflows/ralph/planning/stories-interactive.md`
- `context/workflows/ralph/planning/tasks-interactive.md`

**Review prompts:**
- `context/workflows/ralph/review/stories-review-auto.md`
- `context/workflows/ralph/review/roadmap-review-auto.md`
- `context/workflows/ralph/review/roadmap-gap-auto.md`
- `context/workflows/ralph/review/stories-gap-auto.md`

### Acceptance Criteria
- [ ] All interactive prompts save incrementally (not big-bang)
- [ ] Completion phases offer review + gap analysis options
- [ ] Roadmap prompt has scope creep guardrails
- [ ] Vision/roadmap prompts offer web integration
- [ ] All prompts include next steps guidance
- [ ] Review prompts present findings one at a time

### Test Plan
- [ ] Manual: Run `aaa ralph plan vision` and verify incremental saves
- [ ] Manual: Complete a planning session, verify handholding options appear
- [ ] Manual: Run `aaa ralph review stories <milestone>` and verify chunked presentation

### Scope
- **In:** Prompt content improvements
- **Out:** CLI changes, skill changes, new prompts

### Related Documentation
- @docs/planning/VISION.md (Section 3.3 Prompt Quality Guidelines)
- @docs/planning/milestones/ralph/FEEDBACK.md (original observations)
