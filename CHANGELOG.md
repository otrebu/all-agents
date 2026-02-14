## [1.22.1](https://github.com/otrebu/all-agents/compare/v1.22.0...v1.22.1) (2026-02-14)

### Bug Fixes

- **dev:** upgrade commitlint for parser compatibility ([b22ae48](https://github.com/otrebu/all-agents/commit/b22ae48c8884c2a31752a496ee836392fb9d40ee))
- **release:** restore changelog tracking and backfill history ([e485c8b](https://github.com/otrebu/all-agents/commit/e485c8bbeb384e2af7f4818778cbc62ebf304275))
- **release:** run prepare formatter from tools cwd ([e12c79d](https://github.com/otrebu/all-agents/commit/e12c79df456f8880bfaff3d28ba327159a0716e7))

# 1.22.0 (2026-02-13)

### Features

- **ralph:** add dry-run pipeline preview and visual rendering ([7887c52](https://github.com/otrebu/all-agents/commit/7887c527ae0a677e0c8249b8d586090ea98c1f6f))

# 1.21.3 (2026-02-13)

### Documentation

- human README review ([1d627f7](https://github.com/otrebu/all-agents/commit/1d627f726f7a6548316cf011cfa0e17577dcf6aa))

# 1.21.2 (2026-02-12)

### Documentation

- restructure README for newcomer friendliness (v2) ([8a9d246](https://github.com/otrebu/all-agents/commit/8a9d246081a98d9d5ef13ebab76fea866e329028))

# 1.21.1 (2026-02-12)

### Documentation

- sync docs and shell completions after v1.19-v1.20 feature burst ([dc42b64](https://github.com/otrebu/all-agents/commit/dc42b64940adf086e19642fd2e685ad9fa0fe5eb))

# 1.21.0 (2026-02-12)

### Features

- **ralph:** deterministic queue operations, validation-first, calibration refactor ([d95a03b](https://github.com/otrebu/all-agents/commit/d95a03b56a3a71b6fe714f2bbda3a8d101e583a2))

### Bug Fixes

- opencode crash go to retry ([e84b908](https://github.com/otrebu/all-agents/commit/e84b90873656231c5cdbbeed939e55c5b58bea58))

# 1.20.1 (2026-02-09)

### Documentation

- write and run guide ([a9faa23](https://github.com/otrebu/all-agents/commit/a9faa23c5d06bf2c5f3144d55f0e0438140423c7))

# 1.20.0 (2026-02-09)

### Features

- validate step before build ([947559f](https://github.com/otrebu/all-agents/commit/947559f2f9cfa79db050b6d64623b6e5be41070e))

# 1.19.5 (2026-02-09)

### Bug Fixes

- **ralph:** remove plugins cache from tracking and update ralph features ([6202af9](https://github.com/otrebu/all-agents/commit/6202af9aba062874a7b969da75862da7379e4f75))
- **ralph:** prevent subtasks headless hangs with watchdog fragment merge ([ed700bd](https://github.com/otrebu/all-agents/commit/ed700bd1644e93bc98a0cb13ef57170dce27dc11))

# 1.19.4 (2026-02-09)

### Bug Fixes

- **ralph:** resolve milestone paths from roadmap in external repos ([ad3196d](https://github.com/otrebu/all-agents/commit/ad3196d7c3651959ca3c323d010913d69c4b5962))

### Chores

- **ralph:** update approval defaults and cascade tests ([5bd42d5](https://github.com/otrebu/all-agents/commit/5bd42d5f42abd112e1728cfda1c3f200a5f79401))

# 1.19.3 (2026-02-09)

### Bug Fixes

- **ralph:** sync prompt examples and add audit skill ([64484a0](https://github.com/otrebu/all-agents/commit/64484a043102423784d568367a9b76146428158e))

# 1.19.2 (2026-02-09)

### Bug Fixes

- **completion:** sync ralph flags and add command matrix ([860f31b](https://github.com/otrebu/all-agents/commit/860f31b74eb7121bbc97a435a279f77a107f6faa))

### Code Refactoring

- move code-review Finding schema to atomic docs ([038fb20](https://github.com/otrebu/all-agents/commit/038fb203e34f2c162709d96a3d984c7bd5dd7a1a))

# 1.19.1 (2026-02-09)

### Bug Fixes

- **cli:** align ralph status metrics and session completions ([0ce089f](https://github.com/otrebu/all-agents/commit/0ce089fddbc506550ad640148142a621c0ed0550))

### Chores

- gitignore ephemeral claude session and plugin cache files ([d5e6c20](https://github.com/otrebu/all-agents/commit/d5e6c20a31bf08ed8af0a5bbce29182cf86f9569))

# 1.19.0 (2026-02-08)

### Features

- **completion:** add --output-dir, --file and sync flag metadata ([02200d0](https://github.com/otrebu/all-agents/commit/02200d0d24dd3115cecae2e78f2b277d44c997d7))

### Documentation

- add taste-test guide and milestone 005 planning ([a91fe4c](https://github.com/otrebu/all-agents/commit/a91fe4ce2d915a6c0faf5fd2ba222d5ef812f5a7))

### Chores

- enable context7 plugin ([7589521](https://github.com/otrebu/all-agents/commit/7589521302ec4af6544a22c841e711e0b4357522))

# 1.18.0 (2026-02-08)

### Features

- **SUB-018:** enforce deterministic headless subtasks outcomes ([238753f](https://github.com/otrebu/all-agents/commit/238753f224b9ce9c5343f23eeefe969a99bec590))
- **SUB-017:** align subtasks source messaging to --review-diary ([3b4981d](https://github.com/otrebu/all-agents/commit/3b4981d209c8fe1b832cc23c5ce52ff57f2c5349))
- **SUB-016:** add milestone defaults for task/story create ([1b9160a](https://github.com/otrebu/all-agents/commit/1b9160a4aade57a6900c49e67475876c514dd4d5))
- **SUB-015:** normalize planning docs for milestone-scoped IDs ([3826a96](https://github.com/otrebu/all-agents/commit/3826a961c14288b98d4f277573f83d4d2c58b6f4))
- **SUB-014:** expand parity and naming integration coverage ([7cf36a0](https://github.com/otrebu/all-agents/commit/7cf36a068163fadf9af275c17a8a775d5379eb2c))
- **SUB-013:** dry planning prompts via canonical docs ([33d4188](https://github.com/otrebu/all-agents/commit/33d4188940ae5b421532422211e4628e5d08d395))
- **SUB-012:** align planning docs with milestone-scoped naming ([31aadd9](https://github.com/otrebu/all-agents/commit/31aadd93e734e4801c4931dcbe3105e880947fd9))
- **SUB-011:** align iteration-summary status vocabulary ([f090054](https://github.com/otrebu/all-agents/commit/f090054ba8ff0878f5407c094c999818006adfc0))
- **SUB-010:** align Ralph docs with runtime defaults ([640be9e](https://github.com/otrebu/all-agents/commit/640be9e388fa4ce9c9f136275beb5d19a5b7539d))
- **SUB-009:** align build --print with runtime assignment prompt ([0b0b1d9](https://github.com/otrebu/all-agents/commit/0b0b1d9268b21844f41fddc2bd3bb8b0b0c30325))
- **SUB-008:** rewrite iteration prompt for CLI queue flow ([688a716](https://github.com/otrebu/all-agents/commit/688a716f3debc982a9807390a0e755c000939f42))
- **SUB-007:** unify build iteration context across modes ([afff3d1](https://github.com/otrebu/all-agents/commit/afff3d11d9fb10956fbbff971754ee31cda631be))
- **SUB-006:** drop legacy subtask status on save ([76f5d0c](https://github.com/otrebu/all-agents/commit/76f5d0c55b7d2f499c3aa8992ecb9617a1a2f8f9))
- **SUB-005:** add milestone-scoped ralph subtasks queue commands ([754ecbd](https://github.com/otrebu/all-agents/commit/754ecbd9eca27fd06e8cc3cad66a581159a1969e))
- **SUB-004:** enforce incoming subtask ID uniqueness in append path ([08749a4](https://github.com/otrebu/all-agents/commit/08749a40d2ffa2beb6da4dfc82e521ea7137ac88))
- **SUB-003:** align naming convention with locked decisions ([6b215e3](https://github.com/otrebu/all-agents/commit/6b215e385da7b177c7c7b176049e4b340f183448))
- **sub-002:** add planning artifact naming utility ([0136a7e](https://github.com/otrebu/all-agents/commit/0136a7ebae5d7c14999df068eeba9f832f391846))
- **SUB-001:** remove legacy planning-create skill surfaces ([0030859](https://github.com/otrebu/all-agents/commit/0030859031082c34b93df9075190e1a1f07e92ca))

### Tests

- **sub-021:** add subtasks contract and headless outcome regressions ([18461a5](https://github.com/otrebu/all-agents/commit/18461a5c442164d393d1fd8ebdc917d0be2937b9))

### Chores

- **sub-021:** sync completion metadata ([723e57b](https://github.com/otrebu/all-agents/commit/723e57b8a8c97f62241b02864e5d8adf24bea785))
- **SUB-020:** update tracking files ([07f17d3](https://github.com/otrebu/all-agents/commit/07f17d3d4ad98a7ab58a31506a93dec7738d56fb))
- **SUB-020:** align subtasks docs with current contract ([c36faa2](https://github.com/otrebu/all-agents/commit/c36faa269520c9eedafe33a2df1839ba488dbfa9))
- **SUB-019:** simplify subtasks-from-source deterministic flow ([112efc6](https://github.com/otrebu/all-agents/commit/112efc68300289299cc89e49bd3033ece6f0a496))
- **SUB-018:** update tracking files ([c734198](https://github.com/otrebu/all-agents/commit/c734198c875f3633a797b0cb67229819197482f6))
- **SUB-017:** update tracking files ([3022149](https://github.com/otrebu/all-agents/commit/3022149d6de2c9e452814d08272f307a40822f8e))
- **SUB-016:** update tracking files ([5fe69c9](https://github.com/otrebu/all-agents/commit/5fe69c9ceb747642b1d87ee2d19eeaab0cc750b1))
- **SUB-014:** update tracking files ([3846ca9](https://github.com/otrebu/all-agents/commit/3846ca94357fb054b368115fcc93fcace87e0551))
- **SUB-013:** update tracking files ([ce3ca18](https://github.com/otrebu/all-agents/commit/ce3ca18f23ff79d69f9629e4ad53c41e6d57cc48))
- **SUB-012:** update tracking files ([141739f](https://github.com/otrebu/all-agents/commit/141739f4956efa4789d6cd553ce3cc8dd24bfaea))
- **SUB-011:** update tracking files ([c0efc07](https://github.com/otrebu/all-agents/commit/c0efc078bd13d58bfbb60ae3a692f567290d82e8))
- **SUB-010:** update tracking files ([6a9eea0](https://github.com/otrebu/all-agents/commit/6a9eea0c06310e09918a1dea8ed16076adfbd1fa))
- **SUB-009:** update tracking files ([e0f1be9](https://github.com/otrebu/all-agents/commit/e0f1be93c6a3b99142e404bb455bd500fae3c520))
- **SUB-007:** update tracking files ([c40f18b](https://github.com/otrebu/all-agents/commit/c40f18b809f0da9dbf2c123fd2f3fa70bac5d021))
- **SUB-006:** update tracking files ([793199e](https://github.com/otrebu/all-agents/commit/793199ef8ad620b18e7b12b9015afeefe16a11a1))
- **SUB-005:** update tracking files ([ed0e77a](https://github.com/otrebu/all-agents/commit/ed0e77ac73051b925f24a372c9670098299167e9))
- **SUB-004:** update tracking files ([f946e57](https://github.com/otrebu/all-agents/commit/f946e5755fa5ea66696804c378bb0de003190718))
- **SUB-003:** update build tracking files ([e900e03](https://github.com/otrebu/all-agents/commit/e900e03992cb8e538f82f63122a2ae8c6138b31d))
- **sub-002:** update tracking files ([33fa51e](https://github.com/otrebu/all-agents/commit/33fa51eda510f44c572f8d7a6e6c026211a4751b))
- **SUB-001:** update tracking files ([272e1a5](https://github.com/otrebu/all-agents/commit/272e1a5bb44b31c04aa4fa1acc3cbeeb59f31f9a))

# 1.17.1 (2026-02-08)

### Bug Fixes

- **ralph:** add planning heartbeat and extend stall timeout ([3ebcf32](https://github.com/otrebu/all-agents/commit/3ebcf328eb63104bff13fe17844a6ad32e5b428c))

# 1.17.0 (2026-02-07)

### Features

- **ralph:** complete milestone 003 workflow enhancements ([18e541e](https://github.com/otrebu/all-agents/commit/18e541efb60d451ab092bbc6b9c43d12c5ed276b))

# 1.16.1 (2026-02-07)

### Documentation

- **planning:** reconcile milestone 003 subtask state and cascade gaps ([e7161b8](https://github.com/otrebu/all-agents/commit/e7161b8b776bca840e92726cd99c0076e1837302))

# 1.16.0 (2026-02-07)

### Features

- **ralph:** deliver multi-cli abstraction and workflow upgrades ([c329808](https://github.com/otrebu/all-agents/commit/c3298084f19d2a5c128ee6002e9ebc319b64aff9))

### Bug Fixes

- **completion:** add missing notify command and improve dynamic completions ([0ae453c](https://github.com/otrebu/all-agents/commit/0ae453ccfb39103cb8cfa2d7d918fe1891663bb4))

# 1.15.0 (2026-02-02)

### Features

- **SUB-147:** add UI testing guidance to task generation prompts ([2e9e47f](https://github.com/otrebu/all-agents/commit/2e9e47f17fa64df018ff8fdf8692d36473e489da))
- **SUB-146:** update tasks-gap-auto.md to use parallel subagents ([23b42b0](https://github.com/otrebu/all-agents/commit/23b42b00ae9879e61a31722a0c1bd3419fe7ea3b))
- **SUB-145:** add gap tasks routing to ralph-review skill ([c980171](https://github.com/otrebu/all-agents/commit/c9801710f824d40a08208ae9f5c9a7ad28317f31))
- **SUB-144:** update calibration workflows to use parallel subagents ([9915caf](https://github.com/otrebu/all-agents/commit/9915caf045ae3d4e3c33193a6fd4e08d5f17ae45))

### Bug Fixes

- **ralph:** correct inflated files count in build output ([d5e89ea](https://github.com/otrebu/all-agents/commit/d5e89ea68abc392ba337a41154c9a743849fc5b4))

# 1.14.1 (2026-02-02)

### Documentation

- add aaa manpage playground prompt ([e938714](https://github.com/otrebu/all-agents/commit/e938714bdbf709380ffc21d5b5e232d967ed55c1))

# 1.14.0 (2026-01-29)

### Features

- **ralph:** code review system and ralph improvements ([d1a330a](https://github.com/otrebu/all-agents/commit/d1a330ac5d98c53bc9e8b8dca7873b79f94b20ff))

# 1.13.0 (2026-01-26)

### Features

- **SUB-025:** create review CLI types ([6e57b11](https://github.com/otrebu/all-agents/commit/6e57b11db99d94a5596ad17115e5b9af1a88c4a3))
- **SUB-024:** update code-review command to use parallel skill ([9ef9879](https://github.com/otrebu/all-agents/commit/9ef9879dc09a3b653bf7ea42c36f8aa830958f84))
- **SUB-023:** create parallel-code-review skill ([fc25f8d](https://github.com/otrebu/all-agents/commit/fc25f8d14b0708e6074766aa76ce200b872f55ab))
- **SUB-022:** update code-review workflow for parallel agents ([5911404](https://github.com/otrebu/all-agents/commit/591140415b2e9a855fae26e10a35ced1c2650815))
- **SUB-021:** rename coding-style-reviewer to maintainability-reviewer ([430ac5c](https://github.com/otrebu/all-agents/commit/430ac5c09fba5377f2f6e3ec3b6337c699b8decc))
- **SUB-020:** add synthesizer agent for code review aggregation ([5aad2a3](https://github.com/otrebu/all-agents/commit/5aad2a374ba72b5fbe22347799ee3c157fb8901c))
- **SUB-019:** add test-coverage-reviewer agent for code review ([bad0d26](https://github.com/otrebu/all-agents/commit/bad0d26e096d422ac610840d402b03399b048bea))
- **SUB-018:** add error-handling-reviewer agent for code review ([ee2513f](https://github.com/otrebu/all-agents/commit/ee2513fad34861df52a73c35766e4772dd92a526))
- **SUB-017:** add data-integrity-reviewer agent for code review ([e8603b5](https://github.com/otrebu/all-agents/commit/e8603b504b47f1b1052a53a4a7ae7028b8a656d9))
- **SUB-016:** add security-reviewer agent for code review ([7a3361d](https://github.com/otrebu/all-agents/commit/7a3361dc9a1c9535d6e97cd1d2c8d5350cca4432))
- **SUB-015:** add code-review agents directory and Finding types ([9015ef2](https://github.com/otrebu/all-agents/commit/9015ef22ff21cd978099242664312ac772886c9b))
- **SUB-013:** add interrogate skill command ([df2a2cf](https://github.com/otrebu/all-agents/commit/df2a2cfc812326bf2fa6bae40ae5216ed1540027))

### Documentation

- **SUB-014:** add interrogation checkpoint to complete-feature workflow ([af1954e](https://github.com/otrebu/all-agents/commit/af1954efdee6fcd0c1e6b7cd9dd247884184a42a))
- **SUB-012:** add interrogate workflow for code review ([3d744dd](https://github.com/otrebu/all-agents/commit/3d744ddc8b4143968c18c6c7b9fb5c9430a4fa79))

### Chores

- **SUB-025:** update tracking files ([4ba00b6](https://github.com/otrebu/all-agents/commit/4ba00b60f1eb6aa5c26de0e1e0a66f0ee041e6d1))
- **SUB-024:** update tracking files ([024fef6](https://github.com/otrebu/all-agents/commit/024fef61fa224a41ac1b1418f99a92733ef235e5))
- **SUB-023:** update tracking files ([53bb3ad](https://github.com/otrebu/all-agents/commit/53bb3ad984c2052bff5099e87c963275657d2611))
- **SUB-022:** update tracking files ([1c62b14](https://github.com/otrebu/all-agents/commit/1c62b14d678829bea454e77f0974a72b40e05fa3))
- **SUB-021:** update tracking files ([fe71dad](https://github.com/otrebu/all-agents/commit/fe71dada2d50ccd67d45f77162b2584c20d92223))
- **SUB-020:** update tracking files ([0b62c0e](https://github.com/otrebu/all-agents/commit/0b62c0efcc9ca91bdfd7e27ec16ea810b4026563))
- **SUB-019:** update tracking files ([cbd0372](https://github.com/otrebu/all-agents/commit/cbd0372d4565164372a8f8a9dc055d0dbf2f804f))
- **SUB-018:** update tracking files ([9133815](https://github.com/otrebu/all-agents/commit/91338153833b7a3972424f1d982f991da70e1ba7))
- **SUB-017:** update tracking files ([32ed51c](https://github.com/otrebu/all-agents/commit/32ed51c7c8f7f417ffecc00cc18dfb15275fa175))
- **SUB-016:** update tracking files ([a8cdfbc](https://github.com/otrebu/all-agents/commit/a8cdfbc390d1f4b0f79cd8795fcdbada88e4b100))
- **SUB-015:** update tracking files ([9460e52](https://github.com/otrebu/all-agents/commit/9460e52ce1f920862109972a375413eae7b97104))
- **SUB-014:** update tracking files ([668cc8b](https://github.com/otrebu/all-agents/commit/668cc8bb142769324a75fe284ce233f81efc9681))
- **SUB-013:** update tracking files ([24ea07d](https://github.com/otrebu/all-agents/commit/24ea07d5188609585f34032b7a08c021f1500c3f))
- **SUB-012:** update tracking files ([ffff3cb](https://github.com/otrebu/all-agents/commit/ffff3cb9155a31a2a9cb6177469eac11708e4354))

# 1.12.1 (2026-01-25)

### Bug Fixes

- **git:** add pre-push hook to prevent divergence from semantic-release ([6968fbc](https://github.com/otrebu/all-agents/commit/6968fbc58e96f5732c64546da425810018e340c8))

# 1.12.0 (2026-01-25)

### Features

- **planning:** add tasks and subtasks for parallel code review story ([5584e64](https://github.com/otrebu/all-agents/commit/5584e64a9c539bc01605da5efe7179b632c263e0))

### Documentation

- **planning:** add parallel code review story for ralph milestone ([8ad0368](https://github.com/otrebu/all-agents/commit/8ad036878ebea38bfda69c74f7b9f018a843af88))

# 1.11.0 (2026-01-24)

### Features

- **ralph:** store logs in target project instead of all-agents ([66f1d9e](https://github.com/otrebu/all-agents/commit/66f1d9e3388b6454e98b406764fe690f038fd8c8))

# 1.10.1 (2026-01-23)

### Bug Fixes

- **setup:** improve shell completion detection for cached setups ([bdd8955](https://github.com/otrebu/all-agents/commit/bdd89554ec48f91cbb6d81e6c3f5adb5049ec5b1))

# 1.10.0 (2026-01-23)

### Features

- **ralph:** autonomous build system v2 ([5b584b0](https://github.com/otrebu/all-agents/commit/5b584b0a778f1c4090995216d33a01e54174b8f2))

# 1.9.1 (2026-01-07)

### Bug Fixes

- **ralph:** stream claude output live while capturing for completion check ([f4b49e6](https://github.com/otrebu/all-agents/commit/f4b49e6c8646a0167eb5741360dee910e3853683))

# 1.9.0 (2026-01-07)

### Features

- **setup:** install statusline script to ~/.claude during user setup ([b976699](https://github.com/otrebu/all-agents/commit/b976699e5810b91b6798bf0abff3e55e36e71a21))

# 1.8.2 (2026-01-07)

### Bug Fixes

- **prd:** resolve relative task directory from CWD, not repo root ([fff8bbf](https://github.com/otrebu/all-agents/commit/fff8bbf186fff04be1aca077c178439a2a902005))

# 1.8.1 (2026-01-07)

### Bug Fixes

- **prd:** use single quotes for empty string in claude CLI calls ([15495ec](https://github.com/otrebu/all-agents/commit/15495ec0260cdb1b3df66cf40db08254e2bf9719))

# 1.8.0 (2026-01-07)

### Features

- **prd:** add prd explode command for granular feature generation ([1ee5d1e](https://github.com/otrebu/all-agents/commit/1ee5d1e76395eecbe04e933e0aa671e53ea02073))

# 1.7.0 (2026-01-07)

### Features

- **prd:** add prd generate command to transform tasks into PRD JSON ([2104770](https://github.com/otrebu/all-agents/commit/210477045c1d2e7ffd2ec60a99b14d652aa33345))

# 1.6.0 (2026-01-07)

### Features

- **claude:** add statusline script with relative path ([26478d6](https://github.com/otrebu/all-agents/commit/26478d676142d77aeb44fe449794d543446a0549))

### Code Refactoring

- **ralph:** strip 865→208 LOC, bash-based harness ([ef93a36](https://github.com/otrebu/all-agents/commit/ef93a36aa06c1a42b49402d3c73d1d6a8604ccc7))

# 1.5.1 (2026-01-06)

### Bug Fixes

- **setup:** remove auto-gitignore for context/ in project init ([9529173](https://github.com/otrebu/all-agents/commit/952917372d383dab5dfe31fa391e8ff8f8f6ad82))

### Documentation

- **context:** add oRPC API stack for monorepo use ([b3a9eff](https://github.com/otrebu/all-agents/commit/b3a9eff71703f1ddd5020155c8487c5d5da38b09))

# 1.5.0 (2026-01-06)

### Features

- **ralph:** add PRD-driven iterative Claude harness ([1ad1aaf](https://github.com/otrebu/all-agents/commit/1ad1aaf0d0c2e2f852af85f21ff93d1ae93351a6))

### Bug Fixes

- **ralph:** add explicit STOP instruction to prevent multi-feature iterations ([36374f3](https://github.com/otrebu/all-agents/commit/36374f3d62cb07b80859f94791e1019e3735de2f))

### Documentation

- **ralph:** add to READMEs and roadmap ([21dfa03](https://github.com/otrebu/all-agents/commit/21dfa030d163c491efa5bc302b64f9f66c81790f))

# 1.4.0 (2026-01-06)

### Features

- **task-create:** add --story flag to link tasks to stories ([cb762ea](https://github.com/otrebu/all-agents/commit/cb762eabe9bc774836f2ed2f8d343bb7edecce5d))

# 1.3.4 (2026-01-06)

### Documentation

- **roadmap:** add priority tiers and visualization ([a4f697c](https://github.com/otrebu/all-agents/commit/a4f697cce16268f661812d62857ba4eeca63a613))

# 1.3.3 (2026-01-05)

### Documentation

- **readme:** add atomic documentation section and roadmap link ([6856761](https://github.com/otrebu/all-agents/commit/6856761ddd5ab680968b7ff01d01ba9024ef4e06))

# 1.3.2 (2026-01-05)

### Documentation

- **roadmap:** add phase 15 compound engineering, reorganize roadmap structure ([4d6dea6](https://github.com/otrebu/all-agents/commit/4d6dea6d1816bf387d8206db67a1037b3f158b44))

# 1.3.1 (2026-01-05)

### Documentation

- **readme:** update CLI tools and skills status ([9d6bb2e](https://github.com/otrebu/all-agents/commit/9d6bb2e0e04e6fea3c821141a7d4c9a427e0e521))
- **context:** integrate database references into stacks ([edfca81](https://github.com/otrebu/all-agents/commit/edfca812b776c135cce97a83f345ba9ca385f6bf))
- **context:** add database documentation ([14c1a58](https://github.com/otrebu/all-agents/commit/14c1a586c9924fe39553d5e1728a2577022045d9))

# 1.3.0 (2026-01-05)

### Features

- **aaa:** add extract-conversations command ([77b58ce](https://github.com/otrebu/all-agents/commit/77b58ce1aaf27364e64e71019f940f5a31c414ea))
- **claude:** add friction analysis workflow ([94fbe62](https://github.com/otrebu/all-agents/commit/94fbe6213ba5b9b75ebb54fab0a2a602aee45d56))

### Documentation

- **context:** add Claude Code patterns foundation ([460e57c](https://github.com/otrebu/all-agents/commit/460e57c907f5bb10f7627b3cc93a01a8704ad4f7))
- **context:** simplify stack imports, remove redundant blocks ([fc0c0ee](https://github.com/otrebu/all-agents/commit/fc0c0ee878f8eb62d125d8cd7222d5b34cf07e66))

# 1.2.1 (2026-01-05)

### Documentation

- **context:** update backend stack in README to include Prisma ([de4c770](https://github.com/otrebu/all-agents/commit/de4c770a1d1b026c9134658504a78176e7e00029))

# 1.2.0 (2025-12-31)

### Features

- **aaa:** add --skip option to extract-conversations ([1ef9bfe](https://github.com/otrebu/all-agents/commit/1ef9bfed383d8b1ab1cb89a70761248feb52e786))
- **aaa:** add extract-conversations command for Claude Code history ([2603ae1](https://github.com/otrebu/all-agents/commit/2603ae1b4e34c522620132acaae53361cbe64ef6))

# 1.1.2 (2025-12-31)

### Documentation

- **context:** remove file counts, add api/shared stacks ([d034ad8](https://github.com/otrebu/all-agents/commit/d034ad80cc689dff36ab064867aabe66786f8f72))

# 1.1.1 (2025-12-31)

### Documentation

- **context:** add frontend atomic documentation ([3ad0667](https://github.com/otrebu/all-agents/commit/3ad0667458c702677138fdcd53aa12f8be33020d))

# 1.1.0 (2025-12-24)

### Features

- add task/story templates and improve error handling ([52f0528](https://github.com/otrebu/all-agents/commit/52f0528bd70db0511319001f2c2cf3fbedf27fc0))

### Chores

- move CHANGELOG to repo root ([aa46e56](https://github.com/otrebu/all-agents/commit/aa46e563408787f215e87c1823d033ba59b9d0d1))

# 1.0.3 (2025-12-22)

### Documentation

- **orpc:** add OpenAPIReferencePlugin example for Swagger/Scalar UI ([d52757d](https://github.com/otrebu/all-agents/commit/d52757d66e6ec0fad36d979dc4af9426d5db4f22))

# 1.0.2 (2025-12-22)

### Documentation

- **workflow:** clarify uncommitted changes handling in start-feature ([7a0f7c3](https://github.com/otrebu/all-agents/commit/7a0f7c3733ab89a0cb16ef082547415cd7b0cb58))
- **context:** add XML parsing foundation with Zod validation ([b6701fa](https://github.com/otrebu/all-agents/commit/b6701fa902c263068405255d40cee7d558d59890))

### Chores

- **release:** bump version on docs commits ([3f709ff](https://github.com/otrebu/all-agents/commit/3f709ff687cf63c241b1fc785ca699ec25e9f878))

# 1.0.1 (2025-12-22)

### Bug Fixes

- **config:** git hooks + changelog path + gitignore cleanup ([8b8c72f](https://github.com/otrebu/all-agents/commit/8b8c72fd44cac6c1c35fad97d03a7eda83e37bc3))

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
