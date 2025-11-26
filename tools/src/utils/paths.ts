import { existsSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from '@tools/env.js'

let cachedRoot: string | null = null

export function getProjectRoot(): string {
  if (cachedRoot) return cachedRoot

  // 1. Environment override (AAA_ROOT_PATH)
  if (env.AAA_ROOT_PATH) {
    cachedRoot = env.AAA_ROOT_PATH
    return cachedRoot
  }

  // 2. Walk up from CWD to find context/ (works from any subdirectory)
  let searchDir = process.cwd()
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(searchDir, 'context'))) {
      cachedRoot = searchDir
      return cachedRoot
    }
    const parent = dirname(searchDir)
    if (parent === searchDir) break // reached filesystem root
    searchDir = parent
  }

  // 3. Relative to binary (handles symlinks, but not Bun's $bunfs virtual paths)
  const binaryPath = process.argv[1]
  if (binaryPath && !binaryPath.startsWith('/$bunfs')) {
    const realPath = existsSync(binaryPath) ? realpathSync(binaryPath) : binaryPath
    const binaryDir = dirname(realPath)

    // Check ../context (binary in bin/, context at root)
    const fromBin = resolve(binaryDir, '..')
    if (existsSync(resolve(fromBin, 'context'))) {
      cachedRoot = fromBin
      return cachedRoot
    }
  }

  // 4. Relative to real executable path (for compiled binary run from elsewhere)
  const execPath = process.execPath
  if (execPath && !execPath.startsWith('/$bunfs')) {
    const execDir = dirname(execPath)
    const fromExec = resolve(execDir, '..')
    if (existsSync(resolve(fromExec, 'context'))) {
      cachedRoot = fromExec
      return cachedRoot
    }
  }

  throw new Error(
    'Cannot find project root. Set AAA_ROOT_PATH or run from project directory.'
  )
}

export function getOutputDir(subpath: string): string {
  return resolve(getProjectRoot(), 'context', subpath)
}
