/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
export function correctPath(filePath, config) {
    // Check for direct path relative to the primary target directory.
    const directPath = path.join(config.getTargetDir(), filePath);
    if (fs.existsSync(directPath)) {
        return { success: true, correctedPath: directPath };
    }
    // If not found directly, search across all workspace directories for ambiguous matches.
    const workspaceContext = config.getWorkspaceContext();
    const fileSystem = config.getFileSystemService();
    const searchPaths = workspaceContext.getDirectories();
    const foundFiles = fileSystem.findFiles(filePath, searchPaths);
    if (foundFiles.length === 0) {
        return {
            success: false,
            error: `File not found for '${filePath}' and path is not absolute.`,
        };
    }
    if (foundFiles.length > 1) {
        return {
            success: false,
            error: `The file path '${filePath}' is ambiguous and matches multiple files. Please provide a more specific path. Matches: ${foundFiles.join(', ')}`,
        };
    }
    return { success: true, correctedPath: foundFiles[0] };
}
//# sourceMappingURL=pathCorrector.js.map