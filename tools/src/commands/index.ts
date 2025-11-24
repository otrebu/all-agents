import { CommandModule } from '@tools/types';
import { ghSearchCommand } from '@tools/commands/gh-search.js';
import { parallelSearchCommand } from '@tools/commands/parallel-search.js';
import { geminiResearchCommand } from '@tools/commands/gemini-research.js';

export const commands: CommandModule[] = [
  ghSearchCommand,
  parallelSearchCommand,
  geminiResearchCommand,
];
