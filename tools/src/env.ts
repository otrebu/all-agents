import { config } from 'dotenv'
import { z } from 'zod'

// Load .env file
config()

const envSchema = z.object({
  // Debug mode - enables verbose logging
  AAA_DEBUG: z.enum(['true', 'false', '1', '0']).optional()
    .transform(v => v === 'true' || v === '1'),

  // Optional GitHub token override
  AAA_GITHUB_TOKEN: z.string().optional(),

  // Required for parallel-search
  AAA_PARALLEL_API_KEY: z.string().optional(),
})

type Env = z.infer<typeof envSchema>

// Parse and validate environment
const parseResult = envSchema.safeParse(process.env)

if (!parseResult.success) {
  console.error('Invalid environment variables:')
  console.error(parseResult.error.format())
  process.exit(1)
}

const env = parseResult.data

// Debug helper - only logs when AAA_DEBUG is true
function debug(...args: Array<unknown>) {
  if (env.AAA_DEBUG) {
    console.log('[DEBUG]', ...args)
  }
}

export type { Env }
export { debug, env }
