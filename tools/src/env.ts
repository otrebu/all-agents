import { config } from 'dotenv'
import { z } from 'zod'

// Load .env file
config()

const envSchema = z.object({
  // Required for parallel-search
  AAA_PARALLEL_API_KEY: z.string().optional(),

  // Optional GitHub token override
  AAA_GITHUB_TOKEN: z.string().optional(),

  // Project root override (for binary deployment)
  AAA_ROOT_PATH: z.string().optional(),

  // Debug mode - enables verbose logging
  AAA_DEBUG: z.enum(['true', 'false', '1', '0']).optional()
    .transform(v => v === 'true' || v === '1'),
})

export type Env = z.infer<typeof envSchema>

// Parse and validate environment
const parseResult = envSchema.safeParse(process.env)

if (!parseResult.success) {
  console.error('Invalid environment variables:')
  console.error(parseResult.error.format())
  process.exit(1)
}

export const env = parseResult.data

// Debug helper - only logs when AAA_DEBUG is true
export function debug(...args: unknown[]) {
  if (env.AAA_DEBUG) {
    console.log('[DEBUG]', ...args)
  }
}
