#!/usr/bin/env bun
import { Command } from 'commander';
import { commands } from '@tools/commands/index.js';

const program = new Command();

program
  .name('ai-agent')
  .description('AI Agent Toolkit CLI')
  .version('1.0.0');

commands.forEach(cmd => cmd.register(program));

program.parse(process.argv);
