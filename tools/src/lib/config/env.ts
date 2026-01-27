import { z } from "zod";

/**
 * Environment variable schema for secrets
 * All env vars are optional - missing vars are handled gracefully
 *
 * Following @context/foundations/security/secrets-env-typed.md pattern
 */
const envSchema = z.object({
  /** ntfy password for authenticated topics */
  NTFY_PASSWORD: z.string().optional(),

  /** ntfy server URL (overrides config file) */
  NTFY_SERVER: z.string().url().optional(),

  /** ntfy topic (overrides config file) */
  NTFY_TOPIC: z.string().optional(),
});

/**
 * Parse and validate environment variables
 * Warns on invalid values but uses defaults instead of exiting
 */
function parseEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.warn(
      "Warning: Invalid environment variables (using defaults):",
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
    // Return empty object for invalid env vars - all fields are optional
    return {};
  }

  return parsed.data;
}

/**
 * Parsed and validated environment variables
 * Access secrets through this export, not directly from process.env
 */
export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;

export { envSchema };
