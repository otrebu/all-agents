# Spike: UI Testing Guidance in Task Generation Prompts

**Date:** 2026-02-02
**Subtask:** SUB-147
**Status:** Complete

## Research Questions

### 1. Do prompts mention UI/browser testing?

**Answer: NO**

Files analyzed:
- `context/workflows/ralph/planning/tasks-auto.md`
- `context/workflows/ralph/planning/subtasks-auto.md`
- `context/workflows/ralph/planning/tasks-interactive.md`

None of these prompts mention:
- UI testing
- Browser testing
- Visual verification
- Frontend-specific testing
- Screenshot verification

The prompts refer to testing generically (unit tests, integration tests, E2E tests) but without distinguishing between backend and frontend testing approaches.

### 2. Are there instructions for agent-browser or Playwright MCP?

**Answer: NO**

Neither tool is mentioned:
- `agent-browser` - Not referenced
- `Playwright MCP` - Not referenced
- Browser automation - No guidance
- Chrome/browser context - No mentions

### 3. When should browser-based vs API testing be used?

**Answer: NO GUIDANCE EXISTS**

Current test-related content:
- `tasks-auto.md`: Generic "Test Plan" section, mentions unit/integration tests
- `subtasks-auto.md`: Asks "What test patterns are used?" without UI context
- `tasks-interactive.md`: Phase 5 asks about test types but doesn't address frontend

## Gap Identified

The task and subtask generation prompts lack guidance for:

1. **When to use browser-based testing** - Frontend changes involving visual elements, layout, user interactions
2. **Available browser testing tools** - agent-browser for visual verification, Playwright MCP for browser automation
3. **Frontend-specific acceptance criteria** - How to write verifiable AC for UI changes

## Recommendations Implemented

### 1. tasks-auto.md
Added a "UI Testing Guidance" section explaining when frontend tasks should include browser-based test plans.

### 2. subtasks-auto.md
Added guidance on when to include browser-based acceptance criteria for frontend subtasks.

### 3. tasks-interactive.md
Added Phase 5 probes for frontend-specific testing approaches.

## Tools Reference

### agent-browser
Use for visual verification when tasks involve UI changes. Allows Claude to visually inspect rendered pages.

### Playwright MCP on Chrome
Use for automated browser testing in Claude Code. Supports:
- Page navigation and interaction
- Visual assertions
- Screenshot capture
- Form filling and validation

## Decision Criteria: When to Use Browser Testing

| Change Type | Testing Approach |
|-------------|------------------|
| API endpoint | Unit/integration tests only |
| CLI command | E2E tests with process execution |
| React component | Unit tests + browser visual verification |
| Page layout | Browser visual verification |
| Form validation | Unit tests + browser E2E |
| User flow | Browser E2E with Playwright |
