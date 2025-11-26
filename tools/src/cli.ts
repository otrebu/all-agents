#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { makeGhSearchCommand } from './commands/github/command.js'
import { makeParallelSearchCommand } from './commands/parallel-search/command.js'
import { makeGeminiResearchCommand } from './commands/gemini/command.js'

const program = new Command()

program
  .name('aaa')
  .description('All-Agents CLI Toolkit')
  .version('1.0.0')

// Add pre-configured subcommands using .addCommand()
program.addCommand(makeGhSearchCommand())
program.addCommand(makeParallelSearchCommand())
program.addCommand(makeGeminiResearchCommand())

program.parse()
