# Git Commit

Stage changes and create conventional commits from diff analysis.

## Workflow

### 1. Gather Context

```bash
git status
git diff HEAD
git log --oneline -10
```

### 2. Determine Commit Strategy

**Single commit:** All changes relate to one logical change
**Multiple commits:** Changes span distinct features/fixes/areas

If multiple commits needed:

1. Group related changes by type and scope
2. Create separate commits for each group
3. Follow dependency order (e.g., deps before features)

### 3. Per Commit: Analyze & Stage

Review diff to extract:

- **Type**: feat, fix, refactor, docs, test, chore
- **Scope**: module/component affected
- **Description**: imperative mood summary (50-72 chars)

Stage related files:

```bash
git add <files-for-this-commit>
```

**Never stage:**

- `.env` files
- Credentials
- Secrets/tokens

### 4. Create Commit

Format:

```
<type>(scope): description

Optional body with details
```

**Rules:**

- Imperative mood: "add" not "added"
- Generate from diff, not user's words
- **NEVER**❗ add Claude signature/co-authorship or you will be fired
- Atomic: one logical change per commit

### 5. Repeat or Push

**Multiple commits:** Return to step 3 for next commit
**Push requested:** Run `git push` after all commits
**No push requested:** Stop after committing

## Conventional Commit Types

- `feat` - New features
- `fix` - Bug fixes
- `refactor` - Code restructuring without behavior change
- `docs` - Documentation only
- `test` - Tests
- `chore` - Tooling, deps, config

## Examples

**Single commit:**

```
feat(api): add user authentication endpoint

Implements JWT token generation, login/logout routes,
and bcrypt password hashing.
```

**Multiple commits scenario:**

```
1. chore(deps): install jsonwebtoken and bcrypt
2. feat(auth): add JWT token signing function
3. feat(auth): add token verification middleware
4. docs(api): document authentication endpoints
```
