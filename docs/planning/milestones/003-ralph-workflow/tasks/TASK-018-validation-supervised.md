## Task: Supervised Mode Validation Handler

**Story:** [STORY-002-prebuild-validation](../stories/STORY-002-prebuild-validation.md)

**Depends on:** [TASK-017-validation-invoke](./TASK-017-validation-invoke.md)

### Goal

Implement the supervised mode handler for pre-build validation that displays misalignment details to the user and prompts for skip/continue decision.

### Context

When `ralph build --validate-first` runs in supervised mode (TTY available) and validation finds a misaligned subtask, the user should see the reason and choose whether to skip or proceed with the subtask anyway.

This is different from headless mode (TASK-019) where the decision is automated (write feedback file, skip subtask, continue).

### Plan

1. Add supervised validation handler to `tools/src/commands/ralph/validation.ts`:
   ```typescript
   import chalk from "chalk";
   import * as readline from "node:readline";

   /**
    * Result of handling a validation failure in supervised mode
    */
   type SupervisedValidationAction = "continue" | "skip";

   /**
    * Handle validation failure in supervised mode
    *
    * Displays the misalignment details and prompts user to skip or continue.
    *
    * @param subtask - The misaligned subtask
    * @param result - The validation result with reason and suggestion
    * @returns User's choice: "skip" to skip subtask, "continue" to proceed anyway
    */
   async function handleSupervisedValidationFailure(
     subtask: Subtask,
     result: ValidationResult,
   ): Promise<SupervisedValidationAction> {
     // Display validation failure box
     console.log();
     console.log(chalk.yellow("╔══════════════════════════════════════════════════════════════╗"));
     console.log(chalk.yellow("║") + chalk.bold.red("  VALIDATION FAILED") + chalk.yellow("                                          ║"));
     console.log(chalk.yellow("╠══════════════════════════════════════════════════════════════╣"));
     console.log(chalk.yellow("║") + `  Subtask: ${chalk.cyan(subtask.id)}`.padEnd(62) + chalk.yellow("║"));
     console.log(chalk.yellow("║") + `  ${subtask.title.slice(0, 56)}`.padEnd(62) + chalk.yellow("║"));
     console.log(chalk.yellow("╠══════════════════════════════════════════════════════════════╣"));

     // Issue type
     if (result.issueType !== undefined) {
       const issueLabel = formatIssueType(result.issueType);
       console.log(chalk.yellow("║") + `  Issue: ${chalk.bold(issueLabel)}`.padEnd(62) + chalk.yellow("║"));
     }

     // Reason (may be multi-line, wrap at 56 chars)
     if (result.reason !== undefined) {
       console.log(chalk.yellow("║") + chalk.yellow("║"));
       console.log(chalk.yellow("║") + `  ${chalk.bold("Reason:")}`.padEnd(62) + chalk.yellow("║"));
       const reasonLines = wrapText(result.reason, 56);
       for (const line of reasonLines) {
         console.log(chalk.yellow("║") + `    ${line}`.padEnd(62) + chalk.yellow("║"));
       }
     }

     // Suggestion (may be multi-line)
     if (result.suggestion !== undefined) {
       console.log(chalk.yellow("║") + chalk.yellow("║"));
       console.log(chalk.yellow("║") + `  ${chalk.bold("Suggestion:")}`.padEnd(62) + chalk.yellow("║"));
       const suggestionLines = wrapText(result.suggestion, 56);
       for (const line of suggestionLines) {
         console.log(chalk.yellow("║") + `    ${line}`.padEnd(62) + chalk.yellow("║"));
       }
     }

     console.log(chalk.yellow("╚══════════════════════════════════════════════════════════════╝"));
     console.log();

     // Prompt for decision
     return promptSkipOrContinue(subtask.id);
   }

   /**
    * Prompt user to skip or continue with misaligned subtask
    *
    * @param subtaskId - Subtask ID for context in prompt
    * @returns "skip" or "continue"
    */
   async function promptSkipOrContinue(
     subtaskId: string,
   ): Promise<SupervisedValidationAction> {
     // Check if running in TTY mode
     if (!process.stdin.isTTY) {
       console.log(`Non-interactive mode detected, skipping ${subtaskId}`);
       return "skip";
     }

     // eslint-disable-next-line promise/avoid-new -- readline requires manual Promise wrapping
     return new Promise<SupervisedValidationAction>((resolve) => {
       const rl = readline.createInterface({
         input: process.stdin,
         output: process.stdout,
       });

       // Handle Ctrl+C explicitly
       rl.on("SIGINT", () => {
         rl.close();
         process.emit("SIGINT");
       });

       rl.question(
         `Skip ${subtaskId}? [Y/n] (Enter=skip, n=continue anyway): `,
         (answer) => {
           rl.close();
           const normalized = answer.trim().toLowerCase();
           // Default to skip (empty or 'y' or 'yes')
           if (normalized === "n" || normalized === "no") {
             console.log(`Continuing with ${subtaskId} despite validation failure`);
             resolve("continue");
           } else {
             console.log(`Skipping ${subtaskId}`);
             resolve("skip");
           }
         },
       );
     });
   }

   /**
    * Format issue type for display
    */
   function formatIssueType(issueType: ValidationIssueType): string {
     switch (issueType) {
       case "scope_creep": return "Scope Creep";
       case "too_broad": return "Too Broad";
       case "too_narrow": return "Too Narrow";
       case "unfaithful": return "Unfaithful to Parent";
       default: return issueType;
     }
   }

   /**
    * Wrap text to specified width
    */
   function wrapText(text: string, width: number): Array<string> {
     const words = text.split(/\s+/);
     const lines: Array<string> = [];
     let currentLine = "";

     for (const word of words) {
       if (currentLine.length + word.length + 1 <= width) {
         currentLine = currentLine === "" ? word : `${currentLine} ${word}`;
       } else {
         if (currentLine !== "") {
           lines.push(currentLine);
         }
         currentLine = word.length > width ? word.slice(0, width) : word;
       }
     }

     if (currentLine !== "") {
       lines.push(currentLine);
     }

     return lines.length === 0 ? [""] : lines;
   }
   ```

2. Export new types and functions from validation.ts:
   ```typescript
   export {
     // ... existing exports
     type SupervisedValidationAction,
     formatIssueType,
     handleSupervisedValidationFailure,
     promptSkipOrContinue,
     wrapText,
   };
   ```

### Acceptance Criteria

- [ ] `handleSupervisedValidationFailure()` displays formatted box with validation details
- [ ] Display includes subtask ID and title
- [ ] Display includes issue type (formatted nicely, e.g., "Scope Creep" not "scope_creep")
- [ ] Display includes reason (wrapped to fit box width)
- [ ] Display includes suggestion when present (wrapped to fit box width)
- [ ] `promptSkipOrContinue()` prompts user with `[Y/n]` format (default skip)
- [ ] Returns "skip" on Enter or 'y' or 'yes'
- [ ] Returns "continue" on 'n' or 'no'
- [ ] Returns "skip" in non-TTY mode without prompting
- [ ] Handles SIGINT (Ctrl+C) by propagating to process

### Test Plan

- [ ] Unit test: `formatIssueType()` converts all issue types correctly
- [ ] Unit test: `wrapText()` wraps long text at specified width
- [ ] Unit test: `wrapText()` handles single word longer than width
- [ ] Unit test: `wrapText()` handles empty string
- [ ] Manual test: Run in terminal, verify box formatting looks correct
- [ ] Manual test: Press Enter -> returns "skip"
- [ ] Manual test: Type 'n' -> returns "continue"
- [ ] Manual test: Type 'y' -> returns "skip"
- [ ] Manual test: Ctrl+C propagates SIGINT

### Scope

- **In:** Display formatting, user prompt, text wrapping
- **Out:** Validation invocation (TASK-017), headless handler (TASK-019), build loop integration (TASK-020)

### Notes

**Box formatting:**
The visual box uses chalk for colors and Unicode box-drawing characters. The width is fixed at 64 characters to fit in most terminal widths while providing enough space for content.

**Default to skip:**
The prompt defaults to "skip" (Y/n format) because:
1. Validation failure indicates a real issue
2. Skipping is safer than proceeding with a misaligned subtask
3. User can easily override with 'n' if they understand the issue

**Text wrapping:**
Simple word-based wrapping that respects word boundaries. Words longer than the width are truncated (rare edge case for long technical terms).

**Non-TTY behavior:**
In non-TTY mode (piped input, CI environment), the function returns "skip" without prompting. This is consistent with the headless mode behavior where misaligned subtasks are skipped automatically.

### Related Documentation

- @context/blocks/construct/chalk.md - Terminal styling
- tools/src/commands/ralph/display.ts - Existing display patterns in ralph
