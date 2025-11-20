# GitHub Code Search Results

**Query:** `createStartServer language:typescript`
**Found:** 45 results, showing top 6
**Execution:** 3.0s

---

### 1. [elastic/kibana](https://github.com/elastic/kibana) ⭐ 20.8k

**Path:** `x-pack/solutions/observability/plugins/apm/common/tutorial/instructions/apm_server_instructions.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/elastic/kibana/blob/cd10eac42873b25e02d2b0a01cfb75d043656210/x-pack/solutions/observability/plugins/apm/common/tutorial/instructions/apm_server_instructions.ts

```typescript
* 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const createEditConfig = () => ({
  title: i18n.translate('xpack.apm.tutorial.editConfig.title', {
    defaultMessage: 'Edit the configuration',
  }),
  textPre: i18n.translate('xpack.apm.tutorial.editConfig.textPre', {
    defaultMessage:
      "If you're using an X-Pack secured version of Elastic Stack, you must specify \
credentials in the `apm-server.yml` config file.",
  }),
  commands: [
    'output.elasticsearch:',
    '    hosts: ["<es_url>"]',
    '    username: <username>',
    '    password: <password>',
  ],
});

const createStartServer = () => ({
  title: i18n.translate('xpack.apm.tutorial.startServer.title', {
    defaultMessage: 'Start APM Server',
  }),
  textPre: i18n.translate('xpack.apm.tutorial.startServer.textPre', {
    defaultMessage:
      'The server processes and stores application performance metrics in Elasticsearch.',
  }),
});

export function createStartServerUnixSysv() {
  const START_SERVER = createStartServer();

  return {
    title: START_SERVER.title,
    textPre: START_SERVER.textPre,
    commands: ['service apm-server start'],
// ... truncated ...
```

---

### 2. [elastic/kibana](https://github.com/elastic/kibana) ⭐ 20.8k

**Path:** `x-pack/solutions/observability/plugins/apm/server/tutorial/envs/on_prem_apm_server_instruction_set.ts`
**Language:** typescript | **Lines:** 40
**Link:** https://github.com/elastic/kibana/blob/cd10eac42873b25e02d2b0a01cfb75d043656210/x-pack/solutions/observability/plugins/apm/server/tutorial/envs/on_prem_apm_server_instruction_set.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InstructionsSchema } from '@kbn/home-plugin/server';
import { INSTRUCTION_VARIANT } from '@kbn/home-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import {
  createDownloadServerDeb,
  createDownloadServerOsx,
  createDownloadServerRpm,
  createEditConfig,
  createStartServerUnix,
  createStartServerUnixSysv,
  createWindowsServerInstructions,
  createDownloadServerOtherLinux,
  createStartServerUnixBinari,
} from '../../../common/tutorial/instructions/apm_server_instructions';

const EDIT_CONFIG = createEditConfig();
const START_SERVER_UNIX = createStartServerUnix();
const START_SERVER_UNIX_SYSV = createStartServerUnixSysv();
const START_SERVER_UNIX_BINARI = createStartServerUnixBinari();

export function getOnPremApmServerInstructionSet({
  apmIndices,
  isFleetPluginEnabled,
}: {
  apmIndices: APMIndices;
  isFleetPluginEnabled: boolean;
}): InstructionsSchema['instructionSets'][0] {
  return {
    title: i18n.translate('xpack.apm.tutorial.apmServer.title', {
      defaultMessage: 'APM Server',
    }),
    callOut: {
```

---

### 3. [opensearch-project/OpenSearch-Dashboards](https://github.com/opensearch-project/OpenSearch-Dashboards) ⭐ 1.9k

**Path:** `src/plugins/apm_oss/server/tutorial/instructions/apm_server_instructions.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/opensearch-project/OpenSearch-Dashboards/blob/7f8062562002bdef5a8bfe84233545da524d64bb/src/plugins/apm_oss/server/tutorial/instructions/apm_server_instructions.ts

```typescript
* specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@osd/i18n';

export const createEditConfig = () => ({
  title: i18n.translate('apmOss.tutorial.editConfig.title', {
    defaultMessage: 'Edit the configuration',
  }),
  textPre: i18n.translate('apmOss.tutorial.editConfig.textPre', {
    defaultMessage:
      "If you're using a secured version of OpenSearch, you must specify \
credentials in the `apm-server.yml` config file.",
  }),
  commands: [
    'output.opensearch:',
    '    hosts: ["<opensearch_url>"]',
    '    username: <username>',
    '    password: <password>',
  ],
});

const createStartServer = () => ({
  title: i18n.translate('apmOss.tutorial.startServer.title', {
    defaultMessage: 'Start APM Server',
  }),
  textPre: i18n.translate('apmOss.tutorial.startServer.textPre', {
    defaultMessage:
      'The server processes and stores application performance metrics in OpenSearch.',
  }),
});

export function createStartServerUnixSysv() {
  const START_SERVER = createStartServer();

  return {
    title: START_SERVER.title,
    textPre: START_SERVER.textPre,
    commands: ['service apm-server start'],
// ... truncated ...
```

---

### 4. [opensearch-project/OpenSearch-Dashboards](https://github.com/opensearch-project/OpenSearch-Dashboards) ⭐ 1.9k

**Path:** `src/plugins/apm_oss/server/tutorial/envs/on_prem.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/opensearch-project/OpenSearch-Dashboards/blob/7f8062562002bdef5a8bfe84233545da524d64bb/src/plugins/apm_oss/server/tutorial/envs/on_prem.ts

```typescript
* Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@osd/i18n';
import { INSTRUCTION_VARIANT } from '../../../../../../src/plugins/home/server';
import {
  createWindowsServerInstructions,
  createEditConfig,
  createStartServerUnixSysv,
  createStartServerUnix,
  createDownloadServerRpm,
  createDownloadServerDeb,
  createDownloadServerOsx,
} from '../instructions/apm_server_instructions';
import {
  createNodeAgentInstructions,
  createDjangoAgentInstructions,
  createFlaskAgentInstructions,
  createRailsAgentInstructions,
  createRackAgentInstructions,
  createJsAgentInstructions,
  createGoAgentInstructions,
  createJavaAgentInstructions,
  createDotNetAgentInstructions,
} from '../instructions/apm_agent_instructions';
// ... truncated ...
```

---

### 5. [zijianhuang/openapiclientgen](https://github.com/zijianhuang/openapiclientgen) ⭐ 76

**Path:** `Tests/NG2Tests/Results/amazonaws_com_transfer_2018_11_05.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/zijianhuang/openapiclientgen/blob/79602bc3ec573fc90ee9ac26b8b2ab9beb57a60c/Tests/NG2Tests/Results/amazonaws_com_transfer_2018_11_05.ts

```typescript
ServerId: new FormControl<string | null | undefined>(undefined, [Validators.required, Validators.minLength(19), Validators.maxLength(19), Validators.pattern('^s-([0-9a-f]{17})$')]),
		});

	}

	export interface StartServerRequest {

		/**
		 * Required
		 * Max length: 19
		 * Min length: 19
		 */
		ServerId: string;
	}
	export interface StartServerRequestFormProperties {

		/**
		 * Required
		 * Max length: 19
		 * Min length: 19
		 */
		ServerId: FormControl<string | null | undefined>,
	}
	export function CreateStartServerRequestFormGroup() {
		return new FormGroup<StartServerRequestFormProperties>({
			ServerId: new FormControl<string | null | undefined>(undefined, [Validators.required, Validators.minLength(19), Validators.maxLength(19), Validators.pattern('^s-([0-9a-f]{17})$')]),
		});

	}

	export interface StopServerRequest {

		/**
		 * Required
		 * Max length: 19
		 * Min length: 19
		 */
		ServerId: string;
	}
	export interface StopServerRequestFormProperties {
// ... truncated ...
```

---

### 7. [nirtamir2/obsidian-slidev](https://github.com/nirtamir2/obsidian-slidev) ⭐ 28

**Path:** `src/views/createStartServerCommand.ts`
**Language:** typescript | **Lines:** 30
**Link:** https://github.com/nirtamir2/obsidian-slidev/blob/11082a82ab7dee05dda0e8f91bf17ea512fcfb9f/src/views/createStartServerCommand.ts

```typescript
import { spawn } from "node:child_process";
import path from "node:path";
import type { App } from "obsidian";
import type { SlidevPluginSettings } from "../SlidevSettingTab";
import { getVaultPath } from "../utils/getVaultPath";

export function createStartServerCommand({
  app,
  config,
}: {
  app: App;
  config: SlidevPluginSettings;
}) {
  const vaultPath = getVaultPath(app.vault);

  const templatePath = config.slidevTemplateLocation;

  const activeFile = app.workspace.getActiveFile();
  const currentSlideFilePath = activeFile == null ? "" : activeFile.path;

  const slidePathRelativeToTemplatePath = path.join(
    vaultPath,
    currentSlideFilePath,
  );

  const codeBlockContent = [
    // This makes node & npm usable
    config.initialScript,
    `cd ${templatePath}`,
    // If you use npm scripts, don't forget to add -- after the npm command:
```

---
