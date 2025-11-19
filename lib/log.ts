import chalk from 'chalk'

/**
 * CLI logging utilities for human-readable terminal output
 */
export const log = {
  dim: (message: string) => { console.log(chalk.dim(message)); },
  error: (message: string) => { console.error(chalk.red(`✗ ${  message}`)); },
  header: (message: string) => { console.log(chalk.bold.cyan(message)); },
  info: (message: string) => { console.log(chalk.blue(`ℹ ${  message}`)); },
  plain: (message: string) => { console.log(message); },
  success: (message: string) => { console.log(chalk.green(`✓ ${  message}`)); },
  warn: (message: string) => { console.warn(chalk.yellow(`⚠ ${  message}`)); },
}

