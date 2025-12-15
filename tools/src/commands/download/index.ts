import sanitizeForFilename from "@lib/format";
import log from "@lib/log";
import { convert } from "html-to-text";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ora from "ora";

interface DownloadedContent {
  text: string;
  url: string;
}

interface DownloadOptions {
  dir?: string;
  output?: string;
}

// Custom Error
class DownloadError extends Error {
  override name = "DownloadError";
}

async function download(
  urls: Array<string>,
  options: DownloadOptions,
): Promise<string> {
  const outputDirectory =
    options.dir ?? join(process.cwd(), "docs/research/downloads");

  log.header("\n Download URLs\n");

  for (const url of urls) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new DownloadError(
        `Invalid URL (must start with http/https): ${url}`,
      );
    }
  }

  log.dim(`Downloading ${urls.length} URL${urls.length > 1 ? "s" : ""}...`);

  const spinner = ora("Fetching...").start();

  const contents = await Promise.all(
    urls.map(async (url) => {
      spinner.text = `Fetching: ${url}`;
      return fetchAndConvert(url);
    }),
  );

  spinner.succeed(
    `Fetched ${contents.length} URL${contents.length > 1 ? "s" : ""}`,
  );

  const markdown = formatOutput(contents);
  const filename = generateFilename(urls, options.output);

  await mkdir(outputDirectory, { recursive: true });

  const outputPath = join(outputDirectory, filename);
  await writeFile(outputPath, markdown);

  log.success(`Saved to: ${outputPath}`);
  return outputPath;
}

async function downloadCommand(
  urls: Array<string>,
  options: DownloadOptions,
): Promise<void> {
  try {
    await download(urls, options);
  } catch (error) {
    if (error instanceof DownloadError) {
      log.error(error.message);
    } else {
      log.error("Unexpected error");
      log.error(String(error));
    }
    process.exit(1);
  }
}

async function fetchAndConvert(url: string): Promise<DownloadedContent> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new DownloadError(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const html = await response.text();
  const text = convert(html, {
    selectors: [
      { options: { ignoreHref: true }, selector: "a" },
      { format: "skip", selector: "img" },
    ],
    wordwrap: 120,
  });
  return { text, url };
}

function formatOutput(contents: Array<DownloadedContent>): string {
  const date = new Date().toISOString().split("T")[0];
  const sections = contents.map(
    ({ text, url }) => `## ${url}\n\n${text.trim()}`,
  );
  return `# Downloaded: ${date}\n\n${sections.join("\n\n---\n\n")}\n`;
}

function generateFilename(urls: Array<string>, customName?: string): string {
  const timestamp = new Date()
    .toISOString()
    .replaceAll(/[-:T.]/g, "")
    .slice(0, 14);
  const formattedTimestamp = `${timestamp.slice(0, 8)}-${timestamp.slice(8)}`;

  if (customName !== undefined && customName !== "") {
    return `${formattedTimestamp}-${sanitizeForFilename(customName)}.md`;
  }

  const firstUrl = urls[0];
  if (firstUrl === undefined) {
    return `${formattedTimestamp}-download.md`;
  }
  const topic = sanitizeForFilename(firstUrl);
  return `${formattedTimestamp}-${topic === "" ? "download" : topic}.md`;
}

export default downloadCommand;
