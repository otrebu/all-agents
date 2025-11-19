/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { readPackageUp, } from 'read-package-up';
export async function getPackageJson(cwd) {
    const result = await readPackageUp({ cwd });
    if (!result) {
        // TODO: Maybe bubble this up as an error.
        return;
    }
    return result.packageJson;
}
//# sourceMappingURL=package.js.map