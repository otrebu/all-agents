/* eslint-disable no-console */
import chalk from 'chalk'

// ===== CLI LOGGING UTILITY =====
// WHY: DRY wrapper for console + chalk, avoids repeating styling everywhere
// NOTE: This is a CLI tool, so console.log/console.error are correct (not pino)
// ESLint: no-console disabled ONLY in this file (all other modules import from here)

export const log = {
  // Normal output to stdout
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message)
  },

  success: (message: string) => {
    console.log(chalk.green('✔'), message)
  },

  warn: (message: string) => {
    console.log(chalk.yellow('⚠️ '), message)
  },

  // Error output to stderr
  error: (message: string) => {
    console.error(chalk.red('✖'), message)
  },

  // Dimmed helper text to stderr
  dim: (message: string) => {
    console.error(chalk.dim(message))
  },

  // Plain output (for markdown reports, etc.)
  plain: (message: string) => {
    console.log(message)
  },

  // Headers
  header: (message: string) => {
    console.log(chalk.bold.blue(message))
  }
}
