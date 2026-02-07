# Testing & Verification Guidance

Shared reference for task/subtask generation.

## Testing Approach by Task Type

| Task Type | Browser Testing? | Test Approach |
|-----------|------------------|---------------|
| Backend/API | No | Unit/integration tests |
| CLI command | No | E2E with process execution |
| React component | Yes - visual | Unit + agent-browser verification |
| Layout/styling | Yes - visual | agent-browser verification |
| Form implementation | Yes - interaction | Unit + browser E2E |
| User flow | Yes - E2E | Playwright MCP on Chrome |
| Pure logic | No | Unit tests only |
| Documentation | No | No tests needed |

## Verification Tools

1. **agent-browser** - Visual verification. Claude inspects rendered pages for layout, styling, elements.

2. **Playwright MCP on Chrome** - Automated browser E2E. Navigation, interactions, assertions, screenshots.

## Writing Acceptance Criteria

Include tool name when browser verification needed:
- "Visual verification: Form displays correctly (use agent-browser)"
- "E2E: User can submit and see success (use Playwright MCP)"

For non-browser work:
- "Unit tests pass for validation logic"
- "Integration tests verify API response"
