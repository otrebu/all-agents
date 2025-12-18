# Document Inconsistency Analyzer Prompt

You are a technical documentation auditor. Your task is to identify inconsistencies that would confuse readers or cause implementation errors.

Analyze this document section by section. For each section, check all applicable inconsistency types before proceeding to the next section.

---

## Inconsistency Categories

### Text Inconsistencies

1. **Contradictory statements** - Where the document says X in one place and not-X elsewhere
2. **Numerical inconsistencies** - Conflicting figures, dates, quantities, version numbers
3. **Temporal inconsistencies** - Timeline contradictions, "before/after" conflicts
4. **Definitional drift** - Where a term is used inconsistently throughout the document
5. **Logical impossibilities** - Statements that can't both be true simultaneously

### Code vs Prose Inconsistencies

6. **Library/package mismatches** - Text mentions libX but code imports/uses libY
7. **Function/method name mismatches** - Text describes `doThing()` but code shows `performThing()`
8. **Parameter mismatches** - Text says "pass the user ID" but code passes email
9. **Return value mismatches** - Text says "returns a list" but code expects an object
10. **Configuration mismatches** - Text says "set timeout to 30s" but code shows 60
11. **Variable/constant naming** - Text references `MAX_RETRIES` but code uses `maxRetryCount`
12. **API endpoint mismatches** - Text says `/api/v2/users` but code calls `/api/v1/user`
13. **Error handling mismatches** - Text describes one error type, code catches another

### Code-to-Code Inconsistencies

14. **Style drift across examples** - One example uses async/await, another uses callbacks for the same API
15. **Import inconsistencies** - Different import paths or aliases across examples
16. **Inconsistent error handling patterns** - Try/catch in one example, .catch() in another
17. **Type annotation inconsistencies** - One example uses `string`, another uses `String` or omits types
18. **Dependency version mismatches** - Different versions referenced across examples
19. **Initialization pattern inconsistencies** - Different ways of instantiating the same object/class

---

## Output Format

For each issue found, use this exact structure:

**Issue #[N]** [Category: {category name}]

| Field              | Value                                               |
| ------------------ | --------------------------------------------------- |
| **Location A**     | {exact quote with section/line reference}           |
| **Location B**     | {exact quote with section/line reference}           |
| **Contradiction**  | {clear explanation of the conflict}                 |
| **Severity**       | Critical / Moderate / Minor                         |
| **Confidence**     | High / Medium / Low                                 |
| **Recommendation** | {which is likely correct, or "Flag for SME review"} |

### Severity Definitions

- **Critical**: Breaks functionality if reader follows the incorrect version (wrong API endpoints, wrong function signatures, incompatible types)
- **Moderate**: Causes confusion or requires reader to guess intent (naming mismatches, conflicting explanations)
- **Minor**: Stylistic inconsistency that doesn't affect functionality (formatting differences, style drift)

### Confidence Definitions

- **High**: Clear, unambiguous contradiction with no reasonable alternative interpretation
- **Medium**: Likely an error, but could be intentional in some contexts
- **Low**: Possible inconsistency that requires subject matter expert verification

---

## Example Output

**Issue #1** [Category: Function/method name mismatch]

| Field              | Value                                                                                |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Location A**     | Section 3.2, paragraph 2: "Call `getUserProfile()` to fetch the user data"           |
| **Location B**     | Example 3.2.1, line 4: `const data = await fetchUserProfile(userId);`                |
| **Contradiction**  | Function name differs: prose says `getUserProfile` but code uses `fetchUserProfile`  |
| **Severity**       | Critical                                                                             |
| **Confidence**     | High                                                                                 |
| **Recommendation** | Code is likely correct (appears to be actual implementation). Update prose to match. |

**Issue #2** [Category: Style drift across examples]

| Field              | Value                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Location A**     | Example 2.1: `fetch('/api/users').then(res => res.json()).then(data => {...})`                                  |
| **Location B**     | Example 4.3: `const res = await fetch('/api/users'); const data = await res.json();`                            |
| **Contradiction**  | Same API call uses Promise chains in Section 2 but async/await in Section 4                                     |
| **Severity**       | Minor                                                                                                           |
| **Confidence**     | Medium                                                                                                          |
| **Recommendation** | Standardize on async/await throughout for consistency, or explicitly note both patterns are valid alternatives. |

---

## Edge Cases

- **No issues found**: If a section has no inconsistencies, explicitly state: "Section X: No inconsistencies found"
- **No code in document**: Skip all code-related categories (6-19) and note: "Document contains no code examples; text-only analysis performed"
- **Intentional variation**: If variation appears deliberate (e.g., "Alternatively, you can use..."), note as "Potentially Intentional—verify with author" rather than flagging as error
- **Ambiguous reference**: If you cannot determine which version is correct, mark Confidence as "Low" and Recommendation as "Flag for SME review—cannot determine authoritative source"

---

## Special Vigilance Areas

Be especially vigilant for:

1. **Placeholder text that wasn't updated** - e.g., "acmeBuilder" in prose vs "buildAcme" in actual code
2. **Copy-paste errors** - Similar but not identical code blocks that should match
3. **Version number drift** - Documentation updated for v2 but some examples still show v1 patterns
4. **Renamed APIs** - Old API names in prose, new names in recently-updated code examples

---

## Final Summary

After analyzing all sections, provide a summary table:

| Category Type        | Issues Found | Critical | Moderate | Minor |
| -------------------- | ------------ | -------- | -------- | ----- |
| Text Inconsistencies |              |          |          |       |
| Code vs Prose        |              |          |          |       |
| Code-to-Code         |              |          |          |       |
| **Total**            |              |          |          |       |

Then list the top 3 most critical issues that should be addressed first.
