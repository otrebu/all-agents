import { env } from '@tools/env.js'
import { existsSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

let cachedRoot: null | string = null

function getOutputDirectory(subpath: string): string {
  return resolve(getProjectRoot(), 'docs', subpath)
}

function getProjectRoot(): string {
  if (cachedRoot !== null) return cachedRoot

  // 1. Environment override (AAA_ROOT_PATH)
  if (env.AAA_ROOT_PATH !== undefined && env.AAA_ROOT_PATH !== '') {
    cachedRoot = env.AAA_ROOT_PATH
    return cachedRoot
  }

  // 2. Walk up from CWD to find context/ (works from any subdirectory)
  let searchDirectory = process.cwd()
  for (let index = 0; index < 10; index += 1) {
    if (existsSync(resolve(searchDirectory, 'context'))) {
      cachedRoot = searchDirectory
      return cachedRoot
    }
    const parent = dirname(searchDirectory)
    if (parent === searchDirectory) break
    searchDirectory = parent
  }

  // 3. Relative to binary (handles symlinks, but not Bun's $bunfs virtual paths)
  const binaryPath = process.argv[1]
  if (binaryPath !== undefined && binaryPath !== '' && !binaryPath.startsWith('/$bunfs')) {
    const realPath = existsSync(binaryPath) ? realpathSync(binaryPath) : binaryPath
    const binaryDirectory = dirname(realPath)

    // Check ../context (binary in bin/, context at root)
    const fromBin = resolve(binaryDirectory, '..')
    if (existsSync(resolve(fromBin, 'context'))) {
      cachedRoot = fromBin
      return cachedRoot
    }
  }

  // 4. Relative to real executable path (for compiled binary run from elsewhere)
  const {execPath} = process
  if (execPath.length > 0 && !execPath.startsWith('/$bunfs')) {
    const execDirectory = dirname(execPath)
    const fromExec = resolve(execDirectory, '..')
    if (existsSync(resolve(fromExec, 'context'))) {
      cachedRoot = fromExec
      return cachedRoot
    }
  }

  throw new Error(
    'Cannot find project root. Set AAA_ROOT_PATH or run from project directory.'
  )
}

export { getOutputDirectory as getOutputDir, getProjectRoot }
