import {existsSync, lstatSync, readlinkSync, realpathSync} from 'node:fs'
import {homedir} from 'node:os'
import {dirname, resolve} from 'node:path'

export const LOCAL_BIN = resolve(homedir(), '.local/bin')
export const AAA_SYMLINK = resolve(LOCAL_BIN, 'aaa')

let cachedAllAgentsRoot: string | null = null

export function getAllAgentsRoot(): string {
  if (cachedAllAgentsRoot !== null) return cachedAllAgentsRoot

  // 1. Follow ~/.local/bin/aaa symlink (works for compiled binary)
  if (existsSync(AAA_SYMLINK)) {
    try {
      const realBinary = realpathSync(AAA_SYMLINK)
      const root = resolve(dirname(realBinary), '..')
      if (existsSync(resolve(root, 'context')) && existsSync(resolve(root, 'tools'))) {
        cachedAllAgentsRoot = root
        return root
      }
    } catch {
      // Fall through
    }
  }

  // 2. Follow process.argv[1] (works in dev mode: bun run dev)
  const binaryPath = process.argv[1]
  if (binaryPath && !binaryPath.startsWith('/$bunfs')) {
    try {
      const realPath = existsSync(binaryPath) ? realpathSync(binaryPath) : binaryPath
      const root = resolve(dirname(realPath), '..')
      if (existsSync(resolve(root, 'context')) && existsSync(resolve(root, 'tools'))) {
        cachedAllAgentsRoot = root
        return root
      }
    } catch {
      // Fall through
    }
  }

  throw new Error('Cannot find all-agents root. Run from all-agents directory or ensure aaa is properly installed.')
}

export function getShellConfigPath(): string {
  const shell = process.env.SHELL ?? ''
  if (shell.includes('zsh')) return '~/.zshrc'
  if (shell.includes('bash')) return '~/.bashrc'
  return '~/.profile'
}

export function isInPath(dir: string): boolean {
  const pathDirs = (process.env.PATH ?? '').split(':')
  return pathDirs.some((p) => p === dir || p === dir.replace(homedir(), '~'))
}

export function getClaudeConfigStatus(): {
  status: 'correct' | 'different' | 'unset'
  current?: string
  expected: string
} {
  const root = getAllAgentsRoot()
  const expected = resolve(root, '.claude')
  const current = process.env.CLAUDE_CONFIG_DIR

  if (!current) return {status: 'unset', expected}
  if (resolve(current) === expected) return {status: 'correct', current, expected}
  return {status: 'different', current, expected}
}

export function isCliInstalled(): boolean {
  if (!existsSync(AAA_SYMLINK)) return false
  try {
    const stat = lstatSync(AAA_SYMLINK)
    return stat.isSymbolicLink()
  } catch {
    return false
  }
}

export function getSymlinkTarget(path: string): string | null {
  try {
    if (!existsSync(path)) return null
    const stat = lstatSync(path)
    if (!stat.isSymbolicLink()) return null
    return readlinkSync(path)
  } catch {
    return null
  }
}

export function getExportLine(varName: string, value: string): string {
  return `export ${varName}="${value}"`
}
