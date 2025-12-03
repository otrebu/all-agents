## Task: Add semantic-release

### Goal
Automate versioning and changelog generation based on conventional commits.

### Context
Currently no automated release process. Manual versioning is error-prone and changelog maintenance is tedious. Conventional commits are already enforced, making semantic-release a natural fit.

### Plan
1. Install semantic-release and plugins (`@semantic-release/changelog`, `@semantic-release/git`, `@semantic-release/npm`)
2. Create `.releaserc.json` config
3. Configure commit message parsing for conventional commits
4. Set up changelog generation
5. Configure npm publish (if publishing to registry)
6. Add `release` script to package.json
7. Document release process in README

### Acceptance Criteria
- [ ] `bun run release` works locally (dry-run)
- [ ] Changelog auto-generated from commits
- [ ] Version bumped based on commit types (feat’minor, fix’patch, BREAKING’major)
- [ ] Git tags created automatically

### Test Plan
- [ ] Run `npx semantic-release --dry-run` to verify config
- [ ] Test with sample commits locally

### Scope
- **In:** semantic-release setup, changelog, versioning, npm publish config
- **Out:** CI/CD integration (separate task), GitHub releases UI

### Notes
- Depends on CI/CD task for automated runs
- Consider `@semantic-release/github` for GitHub releases if needed later
