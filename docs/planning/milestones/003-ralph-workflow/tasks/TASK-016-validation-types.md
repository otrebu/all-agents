## Task: Validation Response Types and Parser

**Story:** [STORY-002-prebuild-validation](../stories/STORY-002-prebuild-validation.md)

### Goal

Define TypeScript types and a response parser for pre-build validation output, handling both aligned and misaligned cases with graceful error handling.

### Context

The pre-build validation prompt (`context/workflows/ralph/building/pre-build-validation.md`) outputs JSON in a specific format. We need types and a parser to safely extract structured responses from Claude's output, handling:
- Valid aligned response: `{"aligned": true}`
- Valid misaligned response: `{"aligned": false, "reason": "...", "issue_type": "...", "suggestion": "..."}`
- Invalid JSON (treat as aligned with warning)
- Missing fields (provide defaults)

This is the foundation for TASK-017-020 which implement the actual validation logic.

### Plan

1. Create new file `tools/src/commands/ralph/validation.ts`

2. Add validation response types:
   ```typescript
   /**
    * Issue types from pre-build validation
    */
   type ValidationIssueType = "scope_creep" | "too_broad" | "too_narrow" | "unfaithful";

   /**
    * Result of validating a single subtask
    */
   interface ValidationResult {
     /** Whether the subtask is aligned with parent chain */
     aligned: boolean;
     /** Issue type if misaligned */
     issueType?: ValidationIssueType;
     /** Human-readable reason if misaligned */
     reason?: string;
     /** Suggested fix if misaligned */
     suggestion?: string;
   }

   /**
    * Context for validation, passed to prompt
    */
   interface ValidationContext {
     /** Path to milestone directory */
     milestonePath: string;
     /** Subtask being validated */
     subtask: Subtask;
     /** Path to subtasks.json file */
     subtasksPath: string;
   }
   ```

3. Add response parser function:
   ```typescript
   /**
    * Parse validation response from Claude
    *
    * Handles three cases:
    * 1. Valid JSON with aligned: true -> return aligned result
    * 2. Valid JSON with aligned: false -> return misaligned result with details
    * 3. Invalid JSON -> treat as aligned, log warning with raw response
    *
    * @param rawResponse - Raw text response from Claude
    * @param subtaskId - Subtask ID for error logging
    * @returns Parsed ValidationResult
    */
   function parseValidationResponse(
     rawResponse: string,
     subtaskId: string,
   ): ValidationResult {
     try {
       // Extract JSON from response (may be wrapped in markdown code block)
       const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
       if (jsonMatch === null) {
         console.warn(`[Validation:${subtaskId}] No JSON found in response, treating as aligned`);
         console.warn(`  Raw response: ${rawResponse.slice(0, 200)}...`);
         return { aligned: true };
       }

       const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

       // Validate aligned field exists and is boolean
       if (typeof parsed.aligned !== "boolean") {
         console.warn(`[Validation:${subtaskId}] Invalid response format (missing aligned field), treating as aligned`);
         return { aligned: true };
       }

       if (parsed.aligned) {
         return { aligned: true };
       }

       // Misaligned - extract details with defaults
       return {
         aligned: false,
         issueType: parseIssueType(parsed.issue_type),
         reason: typeof parsed.reason === "string" ? parsed.reason : "Unknown alignment issue",
         suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion : undefined,
       };
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       console.warn(`[Validation:${subtaskId}] Failed to parse response: ${message}`);
       console.warn(`  Raw response: ${rawResponse.slice(0, 200)}...`);
       return { aligned: true };
     }
   }

   /**
    * Parse issue_type field with validation
    */
   function parseIssueType(value: unknown): ValidationIssueType | undefined {
     const validTypes: Array<ValidationIssueType> = ["scope_creep", "too_broad", "too_narrow", "unfaithful"];
     if (typeof value === "string" && validTypes.includes(value as ValidationIssueType)) {
       return value as ValidationIssueType;
     }
     return undefined;
   }
   ```

4. Export types and functions from validation.ts

5. Add exports to ralph module index if needed for external use

### Acceptance Criteria

- [ ] `ValidationResult` type defined with aligned, reason, issueType, suggestion fields
- [ ] `ValidationIssueType` union type matches prompt output: `scope_creep | too_broad | too_narrow | unfaithful`
- [ ] `ValidationContext` type defined with subtask, subtasksPath, milestonePath
- [ ] `parseValidationResponse()` correctly parses `{"aligned": true}`
- [ ] `parseValidationResponse()` correctly parses full misaligned response with all fields
- [ ] `parseValidationResponse()` handles JSON wrapped in markdown code blocks
- [ ] `parseValidationResponse()` returns `{aligned: true}` on invalid JSON with warning logged
- [ ] `parseValidationResponse()` returns `{aligned: true}` on missing `aligned` field with warning logged
- [ ] `parseIssueType()` validates issue_type values, returns undefined for invalid values

### Test Plan

- [ ] Unit test: Parse aligned response `{"aligned": true}` -> `{aligned: true}`
- [ ] Unit test: Parse misaligned response with all fields -> extracts all fields correctly
- [ ] Unit test: Parse JSON wrapped in markdown code block -> extracts JSON correctly
- [ ] Unit test: Empty string -> returns aligned with warning
- [ ] Unit test: Invalid JSON string -> returns aligned with warning
- [ ] Unit test: Missing `aligned` field -> returns aligned with warning
- [ ] Unit test: Invalid issue_type value -> returns undefined for issueType
- [ ] Unit test: Partial misaligned response (missing optional fields) -> fills defaults

### Scope

- **In:** Types, parser function, error handling for validation responses
- **Out:** Claude invocation (TASK-017), mode-specific handlers (TASK-018/019), batch validation (TASK-020)

### Notes

**JSON extraction strategy:**
The parser uses a regex to extract the first JSON object from the response. This handles cases where Claude might include explanation text before or after the JSON, or wrap it in markdown code blocks.

**Fail-safe design:**
Any parsing failure results in `{aligned: true}` to avoid blocking builds due to validation errors. Warnings are logged so issues can be investigated.

**Type safety:**
The parser validates types at runtime since we're parsing external input. The `parseIssueType` helper ensures only valid enum values are accepted.

### Related Documentation

- @context/workflows/ralph/building/pre-build-validation.md - Source prompt defining output format
- @context/blocks/construct/zod.md - Could use Zod for validation, but keeping simple for now
