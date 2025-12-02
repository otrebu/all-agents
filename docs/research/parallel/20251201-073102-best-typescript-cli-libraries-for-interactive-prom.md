# TypeScript CLI Interactive Prompt Libraries Research

**Date:** 2025-12-01
**Objective:** Best TypeScript CLI libraries for interactive prompts and user input in 2024-2025

## Summary

The modern TypeScript CLI ecosystem offers several mature libraries for interactive user prompts. The landscape is dominated by three primary libraries (Inquirer, Enquirer, and Prompts), with newer alternatives like @inquirer/prompts and @clack/prompts emerging. The choice depends on TypeScript quality needs, bundle size priorities, and behavioral preferences (especially error handling).

## Top Recommended Libraries

### 1. **@inquirer/prompts** (Modern Inquirer)
- **Pros**: Modular architecture, strongest ecosystem, best TypeScript support in new version, plugin ecosystem
- **Cons**: Main package has type issues, undergoing major refactor since 2018
- **Status**: Active development, market leader by downloads
- **Best for**: Projects needing rich interactions (autocomplete, directory selection, checkbox-plus)

### 2. **Enquirer**
- **Pros**: Lightweight, 32 built-in helpers for input transformation, better API consistency than Inquirer
- **Cons**: TypeScript types have issues, throws error on CTRL+C (requires error handling)
- **Best for**: Projects prioritizing bundle size and helper utilities

### 3. **Prompts**
- **Pros**: Smallest bundle, graceful CTRL+C handling (cancels without error), simple API
- **Cons**: TypeScript support weaker, fewer built-in prompt types
- **Best for**: Simple CLIs where bundle size matters

### 4. **@clack/prompts** (Emerging)
- **Pros**: Modern design, beautiful UI, TypeScript-first
- **Cons**: Newer library, smaller ecosystem
- **Best for**: New projects wanting modern UX

### 5. **cmd-ts** (Type-Safe Alternative)
- **Pros**: Strong runtime validation, treats inputs as typed values (not strings), zod-like approach
- **Cons**: Different paradigm from traditional prompt libraries
- **Best for**: Projects requiring strong type safety and input validation

## Key Behavioral Differences

### CTRL+C Handling
- **Inquirer**: Immediately kills process
- **Enquirer**: Throws error (requires `.catch()`)
- **Prompts**: Cancels gracefully, continues execution

### TypeScript Quality
- All three major libraries have some type issues
- @inquirer/prompts (new modular version) has improved types
- cmd-ts has the strongest type safety

## Built-in Prompt Types

### Common Across Libraries
- Text input
- Confirm (yes/no)
- List/Select (dropdown)
- Checkbox (multi-select)
- Password (hidden input)

### Inquirer Extensions (via plugins)
- `inquirer-autocomplete-prompt`
- `inquirer-directory`
- `inquirer-checkbox-plus-prompt`

## Bundle Size Comparison

1. **Prompts**: Smallest
2. **Enquirer**: Small
3. **Inquirer**: Larger (especially classic version)
4. **@inquirer/prompts**: Smaller (modular)

## Code Examples

### Simple Yes/No Prompt

**Inquirer:**
```typescript
import inquirer from 'inquirer';

const answer = await inquirer.prompt([{
  type: 'confirm',
  name: 'proceed',
  message: 'Continue?',
  default: false
}]);

console.log(answer.proceed); // true/false
```

**@inquirer/prompts (Modern):**
```typescript
import { confirm } from '@inquirer/prompts';

const proceed = await confirm({
  message: 'Continue?',
  default: false
});

console.log(proceed); // true/false
```

**Prompts:**
```typescript
import prompts from 'prompts';

const { proceed } = await prompts({
  type: 'confirm',
  name: 'proceed',
  message: 'Continue?',
  initial: false
});

console.log(proceed); // true/false
```

### List Selection

**Inquirer:**
```typescript
import inquirer from 'inquirer';

const answer = await inquirer.prompt([{
  type: 'list',
  name: 'color',
  message: 'Choose color:',
  choices: ['red', 'blue', 'green']
}]);

console.log(answer.color);
```

**Enquirer:**
```typescript
import { Select } from 'enquirer';

const prompt = new Select({
  name: 'color',
  message: 'Choose color:',
  choices: ['red', 'blue', 'green']
});

const color = await prompt.run();
console.log(color);
```

### Text Input

**@inquirer/prompts:**
```typescript
import { input } from '@inquirer/prompts';

const name = await input({
  message: "What's your name?",
  validate: (value) => value.length > 0 || 'Name required'
});
```

## Modern Alternatives to readline

All recommended libraries are modern alternatives to Node's `readline` module:

- **readline**: Low-level, callback-based, requires manual state management
- **Modern libs**: Promise-based, high-level abstractions, built-in validation

## Input Transformation Helpers

### Enquirer (32 helpers)
Most helpers for string transformation, including case conversion, slugification, etc.

### Inquirer (10 helpers via plugins)
Fewer built-in, but extensible via custom prompt types

### Prompts
Minimal helpers, focused on core functionality

## Analysis

### Key Learnings

1. **No perfect library**: All three major libraries have TypeScript type issues, indicating the challenge of modeling dynamic terminal interactions
2. **New modular approach**: @inquirer/prompts represents industry shift toward tree-shakeable, modular packages
3. **CTRL+C handling matters**: Choice should consider error handling strategy
4. **Ecosystem vs size**: Inquirer wins on plugins, Prompts wins on size
5. **Type safety as priority**: Consider cmd-ts if runtime validation is critical

### Recommendations

**For new projects (2024-2025):**
- Use **@inquirer/prompts** (modular) for rich interactions
- Use **@clack/prompts** for modern UX
- Use **prompts** for simple, lightweight CLIs

**For existing projects:**
- Migrate from classic Inquirer to @inquirer/prompts
- Enquirer is solid if already using it
- Avoid mixing libraries (inconsistent UX)

**For type-safe projects:**
- Consider **cmd-ts** for argument parsing + validation
- Combine with a prompt library for interactive flows

### Common Patterns

1. **Commander + Inquirer**: Most popular combo (command parsing + prompts)
2. **Minimist + @inquirer/prompts**: Lightweight alternative
3. **Yargs + Enquirer**: Balanced option

### Gotchas

**Issue 1**: TypeScript types not 100% accurate
**Solution**: Use type assertions where needed, report issues upstream

**Issue 2**: Different error handling behaviors
**Solution**: Wrap all prompts in try/catch for consistent handling

**Issue 3**: API inconsistencies between libraries
**Solution**: Create wrapper functions to normalize API

### Next Steps

1. Test @inquirer/prompts in sample project
2. Evaluate @clack/prompts for UX improvements
3. Review cmd-ts for argument validation needs
4. Benchmark bundle sizes in production build
5. Check latest releases for TypeScript improvements

## Sources

- **Medium** [Building a Powerful CLI Tool in TypeScript](https://medium.com/@WC_/building-a-powerful-command-line-interface-cli-tool-in-typescript-a-step-by-step-guide-3eac3837e190)
- **Medium** [Building a CLI App with Node.js in 2024](https://egmz.medium.com/building-a-cli-with-node-js-in-2024-c278802a3ef5)
- **npm-compare.com** [chalk vs inquirer comparison](https://npm-compare.com/chalk,inquirer)
- **Reddit** [2025 go-tos for CLI applications](https://www.reddit.com/r/javascript/comments/1ipe4dw/askjs_what_are_your_2025_gotos_for_building_cli/)
- **Reddit** [Best library for CLI app](https://www.reddit.com/r/node/comments/1byo22q/which_library_is_best_to_create_a_cli_app/)
- **GitHub** [awesome-cli-frameworks](https://github.com/shadawck/awesome-cli-frameworks)
- **GitHub** [nodejs-cli-apps-best-practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- **GitHub** [code-generation-tools-comparison](https://github.com/Ofadiman/code-generation-tools-comparison)
- **Medium** [Comparing CLI Building Libraries](https://lakatos.medium.com/comparing-cli-building-libraries-e3a5cff97553)
- **Blog** [The Landscape of npm Packages for CLI Apps](https://blog.kilpatrick.cloud/posts/node-cli-app-packages/)
- **Blog** [CLI Apps in TypeScript with cmd-ts](https://gal.hagever.com/posts/type-safe-cli-apps-in-typescript-with-cmd-ts-part-1)
- **Stack Overflow** [Console input in TypeScript](https://stackoverflow.com/questions/33858763/console-input-in-typescript)
- **Stack Overflow** [CLI input parsing for node.js](https://stackoverflow.com/questions/67756167/cli-input-parsing-for-node-js)
