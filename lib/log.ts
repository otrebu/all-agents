import chalk from 'chalk'

/**
 * CLI logging utilities for human-readable terminal output
 */
export const log = {
  header: (message: string) => console.log(chalk.bold.cyan(message)),
  success: (message: string) => console.log(chalk.green('✓ ' + message)),
  error: (message: string) => console.error(chalk.red('✗ ' + message)),
  warn: (message: string) => console.warn(chalk.yellow('⚠ ' + message)),
  info: (message: string) => console.log(chalk.blue('ℹ ' + message)),
  dim: (message: string) => console.log(chalk.dim(message)),
  plain: (message: string) => console.log(message),
}

