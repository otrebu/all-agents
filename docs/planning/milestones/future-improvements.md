# Future Improvements

## Improve all-agents init with new Claude Code features

**Source:** CC v2.1.9-2.1.10 release notes

### Features to explore

1. **Setup hook event** (v2.1.10)
   - Triggered via `--init`, `--init-only`, or `--maintenance` CLI flags
   - Could automate repo bootstrapping, dependency checks, env setup
   - Potential: `aaa init` integration or `.claude/hooks/setup.sh`

2. **plansDirectory setting** (v2.1.9)
   - Customize where plan files are stored
   - Could point to `docs/planning/` for consistency with our structure

### Ideas

- Create Setup hook that runs `bun install`, checks env vars, validates config
- Configure `plansDirectory: "docs/planning/plans"` in settings
- Document in CLAUDE.md for new contributors
