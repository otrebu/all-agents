import * as p from "@clack/prompts";
import log from "@lib/log";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type {
  Feature,
  FeatureCategory,
  FeaturePriority,
  InitOptions,
  PRD,
} from "./types";

/**
 * Collect features from user via sequential prompts
 */
async function collectFeatures(): Promise<Array<Feature>> {
  const features: Array<Feature> = [];
  let featureNumber = 1;
  let shouldAddMore = true;

  while (shouldAddMore) {
    // Await in loop is intentional - we need sequential user input
    // eslint-disable-next-line no-await-in-loop
    const feature = await promptFeature(featureNumber);

    if (feature === null) {
      if (features.length === 0) {
        log.warn("At least one feature is required");
        // eslint-disable-next-line no-continue
        continue;
      }
      break;
    }

    features.push(feature);
    featureNumber += 1;

    // eslint-disable-next-line no-await-in-loop
    const addMore = await p.confirm({
      initialValue: true,
      message: "Add another feature?",
    });

    if (p.isCancel(addMore) || !addMore) {
      shouldAddMore = false;
    }
  }

  return features;
}

/**
 * Interactive wizard to create a new PRD
 */
async function createPRDWizard(): Promise<null | PRD> {
  const project = await p.group(
    {
      description: async () =>
        p.text({
          message: "Project description",
          placeholder: "What does this project do?",
          validate: (value) => validateRequired(value, "Description"),
        }),
      name: async () =>
        p.text({
          message: "Project name",
          placeholder: "my-project",
          validate: (value) => validateRequired(value, "Project name"),
        }),
      smokeTestCommand: async () =>
        p.text({
          message:
            "Smoke test command (optional, for quick pre-iteration check)",
          placeholder: "pnpm test --fast",
        }),
      testCommand: async () =>
        p.text({
          initialValue: "pnpm test",
          message: "Test command",
          placeholder: "pnpm test",
          validate: (value) => validateRequired(value, "Test command"),
        }),
      typecheckCommand: async () =>
        p.text({
          message: "Typecheck command (optional)",
          placeholder: "pnpm typecheck",
        }),
    },
    {
      onCancel: () => {
        p.cancel("PRD creation cancelled");
        process.exit(0);
      },
    },
  );

  if (p.isCancel(project)) {
    return null;
  }

  const features = await collectFeatures();

  if (features.length === 0) {
    return null;
  }

  return {
    description: project.description,
    features,
    name: project.name,
    smokeTestCommand: project.smokeTestCommand || undefined,
    testCommand: project.testCommand,
    typecheckCommand: project.typecheckCommand || undefined,
  };
}

/**
 * Main entry point for ralph init
 */
async function executeRalphInit(options: InitOptions): Promise<void> {
  p.intro("Ralph PRD Wizard");

  if (existsSync(options.prdPath)) {
    const overwrite = await p.confirm({
      initialValue: false,
      message: `PRD already exists at ${options.prdPath}. Overwrite?`,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Init cancelled");
      process.exit(0);
    }
  }

  const prd = await createPRDWizard();

  if (prd === null) {
    p.cancel("PRD creation cancelled");
    process.exit(1);
  }

  savePRD(prd, options.prdPath);

  p.outro(`Created ${options.prdPath}`);
  log.plain(`\nNext: Run 'aaa ralph run' to start implementing features.`);
}

/**
 * Prompt user to create a new feature
 */
async function promptFeature(featureNumber: number): Promise<Feature | null> {
  const group = await p.group(
    {
      category: async () =>
        p.select({
          message: "Category",
          options: [
            { label: "Functional", value: "functional" as const },
            { label: "UI", value: "ui" as const },
            { label: "Validation", value: "validation" as const },
            { label: "Other", value: "other" as const },
          ],
        }),
      description: async () =>
        p.text({
          message: "Description",
          placeholder: "What should this feature do?",
          validate: (value) => validateRequired(value, "Description"),
        }),
      id: async () =>
        p.text({
          message: `Feature ${featureNumber} ID (e.g., "auth-login")`,
          placeholder: "feature-id",
          validate: validateFeatureId,
        }),
      priority: async () =>
        p.select({
          message: "Priority",
          options: [
            { label: "High", value: "high" as const },
            { label: "Medium", value: "medium" as const },
            { label: "Low", value: "low" as const },
          ],
        }),
      testSteps: async () =>
        p.text({
          message: "Test steps (comma-separated)",
          placeholder: "Run tests, Check output, Verify behavior",
          validate: (value) => validateRequired(value, "Test steps"),
        }),
    },
    { onCancel: () => null },
  );

  if (p.isCancel(group)) {
    return null;
  }

  return {
    category: group.category as FeatureCategory,
    description: group.description,
    id: group.id,
    priority: group.priority as FeaturePriority,
    status: "pending",
    testSteps: group.testSteps.split(",").map((s) => s.trim()),
  };
}

/**
 * Save PRD to file
 */
function savePRD(prd: PRD, prdPath: string): void {
  const dir = dirname(prdPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(prdPath, `${JSON.stringify(prd, null, 2)}\n`);
}

/**
 * Validation helper for feature IDs
 */
function validateFeatureId(value: string): string | undefined {
  if (value.length === 0) {
    return "ID is required";
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    return "Use lowercase letters, numbers, and hyphens only";
  }
  return undefined;
}

/**
 * Validation helper - returns undefined on success, string on error.
 * This pattern is required by @clack/prompts.
 */
function validateRequired(
  value: string,
  fieldName: string,
): string | undefined {
  if (value.length === 0) {
    return `${fieldName} is required`;
  }
  return undefined;
}

export default executeRalphInit;
