/**
 * Sanitize a query string for use in filenames
 * @param query Original query string
 * @returns Kebab-cased slug (max 50 chars)
 */
export function sanitizeForFilename(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

