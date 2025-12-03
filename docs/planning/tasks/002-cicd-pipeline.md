## Task: Set up CI/CD pipeline

### Goal
Automate testing, linting, and releases via GitHub Actions.

### Context
No CI/CD currently. PRs aren't validated automatically, and releases require manual intervention. Need quality gates on PRs and automated releases on main.

### Plan
1. Create `.github/workflows/ci.yml` for PR checks
   - Run `bun install`
   - Run `bun --cwd tools run lint`
   - Run `bun --cwd tools run typecheck`
   - Run `bun --cwd tools test`
2. Create `.github/workflows/release.yml` for main branch
   - Trigger on push to main
   - Run semantic-release
3. Configure branch protection rules (optional, manual step)
4. Add CI status badges to README

### Acceptance Criteria
- [ ] PRs trigger lint, typecheck, test jobs
- [ ] Merges to main trigger semantic-release
- [ ] Failed checks block PR merge (via branch protection)
- [ ] Workflows use Bun for speed

### Test Plan
- [ ] Open test PR to verify CI runs
- [ ] Merge to main to verify release workflow
- [ ] Intentionally break lint/test to verify failure handling

### Scope
- **In:** GitHub Actions for CI and release
- **Out:** Deployment pipelines, Docker builds, other CI providers

### Notes
- Depends on semantic-release task (001)
- Use `oven-sh/setup-bun` action for Bun
- Consider caching `node_modules` for faster runs
