/**
 * Sanitize a query string for use in filenames
 * @param query Original query string
 * @returns Kebab-cased slug (max 50 chars)
 */
export function sanitizeForFilename(query: string): string {
  return query
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .trim()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .slice(0, 50)
}

