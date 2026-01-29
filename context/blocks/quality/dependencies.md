# Dependencies

Patterns for managing package dependencies: security, versioning, licensing, and avoiding unnecessary bloat.

---

## Quick Reference

- Run `npm audit` / `bun audit` regularly. Fix critical vulnerabilities immediately.
- Pin major versions (`^1.2.3`), not ranges (`*` or `>=`). 0.x versions need extra care.
- Check license compatibility before adding dependencies. GPL in MIT project = problem.
- Question every new dependency. Can native APIs or existing deps handle this?
- Prefer actively maintained packages with multiple contributors.

---

## Security Vulnerabilities

### Severity Levels

| Level | Action | Example |
|-------|--------|---------|
| Critical | Fix immediately | Known exploited CVE, RCE vulnerability |
| High | Fix within days | Auth bypass, data exposure |
| Moderate | Fix within sprint | DoS vector, limited impact |
| Low | Track for next update | Theoretical risk, complex exploit path |

### Rules

- Run `npm audit` / `bun audit` in CI pipeline—fail builds on critical/high
- Subscribe to security advisories for critical dependencies
- Update promptly when security fixes are released
- Check transitive dependencies—your direct deps bring their own deps

### Audit Commands

```bash
# Check for vulnerabilities
npm audit
bun audit  # if using Bun
pnpm audit

# Auto-fix where possible (review changes!)
npm audit fix

# Check outdated packages
npx npm-check-updates
```

### Example Findings

```json
{
  "package": "lodash",
  "version": "4.17.15",
  "vulnerability": "Prototype Pollution",
  "cve": "CVE-2020-8203",
  "severity": "high",
  "fix": "Upgrade to 4.17.21+"
}
```

---

## Version Management

### Semver Ranges

| Range | Meaning | Risk |
|-------|---------|------|
| `*` | Any version | Breaking changes on every install |
| `>=1.0.0` | 1.0.0 or higher | Breaking changes possible |
| `^1.2.3` | 1.x.x (>=1.2.3 <2.0.0) | Safe for mature packages |
| `~1.2.3` | 1.2.x (>=1.2.3 <1.3.0) | Conservative |
| `1.2.3` | Exactly 1.2.3 | No auto-updates |

### Rules

- Use `^` for most dependencies (allows minor/patch updates)
- Use `~` for packages with history of breaking in minors
- Pin exact version for critical dependencies that must not change
- Extra caution with `^0.x.x`—in semver, 0.x allows breaking changes in minor versions

### 0.x Version Gotcha

```json
// ❌ Dangerous: ^0.2.3 allows 0.3.0 which may break
"some-new-package": "^0.2.3"

// ✅ Safer: pin minor for 0.x
"some-new-package": "~0.2.3"
// Or exact:
"some-new-package": "0.2.3"
```

### Lock Files

- Always commit lock files (`package-lock.json`, `bun.lockb`, `pnpm-lock.yaml`)
- Lock files ensure reproducible installs across environments
- Regenerate lock file when upgrading dependencies, not just package.json

---

## License Compatibility

### Common License Types

| License | Commercial Use | Copyleft | Notes |
|---------|----------------|----------|-------|
| MIT | ✅ | No | Permissive, safe for any project |
| Apache-2.0 | ✅ | No | Permissive with patent clause |
| BSD-3-Clause | ✅ | No | Permissive |
| GPL-3.0 | ⚠️ | Yes | Must open-source if distributed |
| AGPL-3.0 | ⚠️ | Yes | Must open-source even for network use |
| LGPL | ⚠️ | Weak | OK if dynamically linked |

### Rules

- Know your project's license before adding dependencies
- GPL/AGPL in MIT/Apache projects creates legal obligations
- Review license changes between major versions
- Document any license exceptions in NOTICE file

### Check Licenses

```bash
# List all licenses in project
npx license-checker --summary

# Check for problematic licenses
npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-3-Clause;ISC'

# Fail on copyleft
npx license-checker --failOn 'GPL;AGPL'
```

### Example Issue

```
Project license: MIT
Dependency: some-gpl-lib@1.0.0
License: GPL-3.0

⚠️ Warning: Using GPL-licensed code in MIT project may require
   open-sourcing your entire codebase if distributed.
```

---

## Avoiding Unnecessary Dependencies

### Decision Tree

```
Need new functionality?
├── Can native APIs handle it?
│   ├── YES → Use native (fetch, crypto, fs, etc.)
│   └── NO → Continue
├── Does an existing dependency provide it?
│   ├── YES → Use existing
│   └── NO → Continue
├── Is it trivial to implement? (< 50 lines)
│   ├── YES → Implement yourself
│   └── NO → Continue
└── Add dependency (evaluate options)
```

### Red Flags

| Pattern | Problem | Alternative |
|---------|---------|-------------|
| `left-pad` (trivial utils) | Adds dep for one-liner | Use `String.padStart()` |
| `moment` for simple formatting | 300KB for basic dates | Native `Intl.DateTimeFormat` |
| Multiple HTTP clients | Redundant | Pick one, standardize |
| `lodash` for one function | Whole lib for `_.get` | `obj?.nested?.value` |

### Rules

- Audit dependencies periodically—remove unused ones
- DevDependencies shouldn't appear in production deps (and vice versa)
- Prefer smaller, focused packages over Swiss-army-knife libraries
- Check bundle size impact with `bundlephobia.com`

### Commands

```bash
# Find unused dependencies
npx depcheck

# Check bundle size before adding
npx bundlephobia lodash

# See what's actually in node_modules
npm ls --all
```

---

## Supply Chain Risks

### Warning Signs

| Signal | Risk | Action |
|--------|------|--------|
| Similar name to popular package | Typosquatting | Verify exact package name |
| Very few weekly downloads | Untested in production | Prefer established alternatives |
| Single maintainer | Bus factor risk | Consider alternatives for critical deps |
| Sudden ownership change | Potential compromise | Review recent changes |
| No recent commits (2+ years) | Abandoned | Look for maintained fork |

### Rules

- Verify package names carefully (typosquatting is common)
- Check npm/registry page for download counts, recent activity
- Review `package.json` repository link—matches actual source?
- Be cautious with new packages for security-critical functionality

### Due Diligence Checklist

Before adding a new dependency:

- [ ] Verify exact package name (no typosquatting)
- [ ] Check weekly downloads (prefer > 10,000)
- [ ] Review recent commit activity
- [ ] Check number of maintainers
- [ ] Review open security issues
- [ ] Check license compatibility
- [ ] Evaluate transitive dependencies

---

## Maintenance Patterns

### Regular Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Security audit | Weekly / CI | `npm audit` |
| Check outdated | Monthly | `npx npm-check-updates` |
| Remove unused | Quarterly | `npx depcheck` |
| License review | Per new dep | `npx license-checker` |

### Renovate/Dependabot

Automated dependency updates are valuable but need guardrails:

```json
// renovate.json example
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["major"],
      "labels": ["breaking"]
    },
    {
      "matchPackagePatterns": ["*"],
      "groupName": "all dependencies"
    }
  ],
  "schedule": ["before 6am on monday"]
}
```

---

## Summary: Checklist

When adding or updating dependencies:

- [ ] No critical/high vulnerabilities (`npm audit`)
- [ ] Version pinned appropriately (not `*` or `>=`)
- [ ] License compatible with project
- [ ] Actually needed (can't use native/existing/inline)
- [ ] Actively maintained (recent commits, multiple maintainers)
- [ ] Package name verified (no typosquatting)
- [ ] Transitive dependencies reviewed
- [ ] Lock file updated and committed
