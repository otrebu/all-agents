import { getContextRoot } from "@tools/utils/paths";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const DEFAULT_PATTERN = /^(?<num>\d+)-.*\.md$/;

interface CreateResult {
  filepath: string;
  number: string;
}

interface NumberedFileOptions {
  customDirectory?: string;
  defaultDir: string;
  pattern?: RegExp;
  template?: string;
}

function createNumberedFile(
  name: string,
  options: NumberedFileOptions,
): CreateResult {
  const root = getContextRoot();
  const pattern = options.pattern ?? DEFAULT_PATTERN;
  const directory = resolveDirectory(
    root,
    options.customDirectory,
    options.defaultDir,
  );

  // Ensure directory exists
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  const number = getNextNumber(directory, pattern);
  const filename = `${number}-${name}.md`;
  const filepath = resolve(directory, filename);

  // Create file with optional template
  writeFileSync(filepath, options.template ?? "");

  return { filepath, number };
}

function getNextNumber(directory: string, pattern: RegExp): string {
  if (!existsSync(directory)) {
    return "001";
  }

  const files = readdirSync(directory);
  const numbers = files
    .map((file) => {
      const match = pattern.exec(file);
      const numberString = match?.groups?.num;
      return numberString !== undefined && numberString !== ""
        ? Number.parseInt(numberString, 10)
        : 0;
    })
    .filter((n) => n > 0);

  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(max + 1).padStart(3, "0");
}

function resolveDirectory(
  root: string,
  customDirectory: string | undefined,
  defaultDir: string,
): string {
  if (customDirectory === undefined || customDirectory === "") {
    return resolve(root, defaultDir);
  }
  if (isAbsolute(customDirectory)) {
    return customDirectory;
  }
  return resolve(root, customDirectory);
}

export { createNumberedFile, getNextNumber, resolveDirectory };
export type { CreateResult, NumberedFileOptions };
