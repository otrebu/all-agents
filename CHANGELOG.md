# 1.0.0 (2025-12-22)

### Bug Fixes

- **context:** correct invalid path references ([d7f5fb1](https://github.com/otrebu/all-agents/commit/d7f5fb1e55cc58a08c1d62f6778b499d6711e4b6))
- **research:** correct timestamp format to YYYYMMDD-HHMMSS ([2705a84](https://github.com/otrebu/all-agents/commit/2705a84344d8f7cbf18fc81427212e465dc25d2f))
- **setup:** walk directory tree to find all-agents root ([1da8e96](https://github.com/otrebu/all-agents/commit/1da8e963c0b6e50c2f2de9519ba94dc95519a877))

### Documentation

- **context:** reorganize into SWEBOK-aligned domain structure ([9bd83e8](https://github.com/otrebu/all-agents/commit/9bd83e8011d2488b6897adecc02711195fcda660))

### Features

- **agents:** add gemini-research agent with Google Search grounding ([2804f96](https://github.com/otrebu/all-agents/commit/2804f96e4c09f16f7ee1b48905b21367fdb27e42))
- **agents:** add parallel-search subagent for multi-angle web research ([beac7cf](https://github.com/otrebu/all-agents/commit/beac7cf798244cb12cf666ed846eaa605461e2fa))
- CLAUDE update ([9d0ea05](https://github.com/otrebu/all-agents/commit/9d0ea05e0d2ebc8921230c5c5932f2d5f006d5dd))
- **cli:** add sync-context command to sync context/ folder to target project ([644860d](https://github.com/otrebu/all-agents/commit/644860d072d19f218e4e9a19ca89c5fa9e0b9529))
- **cli:** add uninstall command and format cli.ts ([0f79261](https://github.com/otrebu/all-agents/commit/0f7926113d47609e0ad046c905a3a698f0129b06))
- **commands, skills:** add dev workflow commands and work-summary skill ([75a80ac](https://github.com/otrebu/all-agents/commit/75a80accfb0f24f6f9a6e956d6f245452fb95386))
- **commands:** add atomic-doc command for context documentation ([ee2bc2e](https://github.com/otrebu/all-agents/commit/ee2bc2e8951af5bd2a18630f7ae8274a45b33fd1))
- **commands:** add consistency-check command for doc/code analysis ([ac8f9b1](https://github.com/otrebu/all-agents/commit/ac8f9b17e5d132ca857ab04c08eba7a843b3255d))
- **commands:** add parallel-search command with documentation ([cea50e4](https://github.com/otrebu/all-agents/commit/cea50e42b7a435f21b825624e5f85f7f91fc19ea))
- **commands:** improve commit workflow and release formatting ([7cee314](https://github.com/otrebu/all-agents/commit/7cee314d0ae71ec4c650dcad9622a930d7c7addf))
- delete primitives atomic docs ([6b945d3](https://github.com/otrebu/all-agents/commit/6b945d30345905d31c649906b2f97912477df5d3))
- **dev:** add code-review and git-commit commands ([659d8ba](https://github.com/otrebu/all-agents/commit/659d8badc66a3a38acd9003f38cf0c49e854f0bf))
- **download:** add download command for URL text extraction ([85ded4e](https://github.com/otrebu/all-agents/commit/85ded4e1ed77544fdc4ef66f72695ccfb8978d1c))
- **lib:** add numbered-files shared utility ([0ecb0bf](https://github.com/otrebu/all-agents/commit/0ecb0bf765b0abc2c73b94317e958f9a4bc8c8b7))
- ready ([5ccf509](https://github.com/otrebu/all-agents/commit/5ccf50953efa676075d57e535897c2e111c579f9))
- **release:** add semantic versioning with linear history ([a89f74d](https://github.com/otrebu/all-agents/commit/a89f74d21fc085fe9d8249e1460708ca6e550e7e))
- **research:** add TanStack Start research reports ([95a6a79](https://github.com/otrebu/all-agents/commit/95a6a79a7c93b064849c18c32c10e93b0c2ca09e))
- **setup:** add setup command and documentation index ([d4c0d8d](https://github.com/otrebu/all-agents/commit/d4c0d8d683c74d81ee1f3071580aca80b767d2c8))
- **setup:** copy doc templates to project ([c6ea708](https://github.com/otrebu/all-agents/commit/c6ea7081439879dc3754cf2a5d3d11dd44e71d39))
- **skills, commands, docs:** add brainwriting skill and documentation ([03b7599](https://github.com/otrebu/all-agents/commit/03b7599bb8d0cfc8a289be3ee7ade1e7bae3a0d2)), closes [#search](https://github.com/otrebu/all-agents/issues/search)
- **story:** add story create command ([6985683](https://github.com/otrebu/all-agents/commit/69856838ad52abb0ae663264150a38b2a3954c6d))
- **task:** add create command for auto-numbered task files ([4c2ba1b](https://github.com/otrebu/all-agents/commit/4c2ba1b19ea4830d79cc1133f276bffb09525f30))
- **workflow:** add pre-commit hooks and tools workflow docs ([fe59268](https://github.com/otrebu/all-agents/commit/fe59268cb09e00e821fe8c4f50fa7817cb52ce2b))

### BREAKING CHANGES

- **context:** All context/ file paths have changed

* Organized blocks/ into 8 domains (construct, test, quality, security, scm, observe, docs)
* Organized foundations/ into same 8 domains
* Organized stacks/ by artifact type (cli, library, api, web, monorepo)
* Updated all cross-references
* Deleted obsolete .built.md file
* Renamed files to follow naming conventions (e.g., ts-node-tsc.md → transpile-esm-tsc.md)
