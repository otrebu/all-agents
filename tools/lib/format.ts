/**
 * Extract meaningful topic from URL
 * Examples:
 *   https://tanstack.com/start/latest -> tanstack-start
 *   https://example.com/api/v2/docs -> example-api-docs
 *   https://github.com/user/repo -> user-repo
 */
function extractTopicFromUrl(url: string): string {
  try {
    const urlObject = new URL(url);
    const parts: Array<string> = [];

    // Get domain name (include subdomain if meaningful, e.g., docs.tanstack.com)
    const domainParts = urlObject.hostname.split('.');
    if (domainParts[0] === 'www') {
      // Skip www, take next parts (e.g., www.example.com -> example)
      const secondPart = domainParts[1];
      if (secondPart !== undefined && secondPart !== '') {
        parts.push(secondPart);
      }
    } else if (domainParts.length >= 3) {
      // Has subdomain (e.g., docs.tanstack.com -> docs, tanstack)
      parts.push(domainParts[0], domainParts[1]);
    } else {
      // No subdomain (e.g., example.com -> example)
      parts.push(domainParts[0]);
    }

    // Get path segments (exclude 'latest' and version numbers)
    // Max 3 path segments
    const pathSegments = urlObject.pathname
      .split('/')
      .filter(seg => seg.length > 0 && seg !== 'latest' && !/^v\d+$/.test(seg))
      .slice(0, 3);
    parts.push(...pathSegments);

    // Join with hyphens and sanitize
    return parts
      .join('-')
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]/g, '')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-+|-+$/g, '');
  } catch {
    // Invalid URL, return empty string to fall back
    return '';
  }
}

/**
 * Sanitize a query string for use in filenames
 * Detects URLs and extracts meaningful topic; handles natural language queries
 * @param query Original query string
 * @returns Kebab-cased slug (max 50 chars)
 */
function sanitizeForFilename(query: string): string {
  const trimmed = query.trim().toLowerCase();

  // Try to extract meaningful topic from URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const urlTopic = extractTopicFromUrl(trimmed);
    if (urlTopic.length > 0) {
      return urlTopic.slice(0, 50);
    }
  }

  // Fall back to natural language sanitization
  return trimmed
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .trim()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .slice(0, 50);
}

export default sanitizeForFilename
