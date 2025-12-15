import log from "@lib/log";
import { z } from "zod";

const envSchema = z.object({
  // Debug mode - enables verbose logging
  AAA_DEBUG: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => v === "true" || v === "1"),

  // Optional GitHub token override
  AAA_GITHUB_TOKEN: z.string().optional(),

  // Required for parallel-search
  AAA_PARALLEL_API_KEY: z.string().optional(),

  // Claude config directory
  CLAUDE_CONFIG_DIR: z.string().optional(),

  // Parallel API key (alternative name)
  PARALLEL_API_KEY: z.string().optional(),

  // System PATH
  PATH: z.string().default(""),

  // Shell environment
  SHELL: z.string().default(""),
});

type Env = z.infer<typeof envSchema>;

// Parse and validate environment
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  log.error("Invalid environment variables:");
  log.plain(JSON.stringify(parseResult.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const env = parseResult.data;

// Debug helper - only logs when AAA_DEBUG is true
function debug(...args: Array<unknown>) {
  if (env.AAA_DEBUG) {
    console.log("[DEBUG]", ...args);
  }
}

export type { Env };
export { debug, env };
