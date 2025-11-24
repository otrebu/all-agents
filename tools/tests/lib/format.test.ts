import sanitizeForFilename from '@lib/format.js'
import { describe, expect, it } from 'vitest'

describe('sanitizeForFilename', () => {
  describe('URL extraction', () => {
    it('extracts domain + path from TanStack URL', () => {
      expect(sanitizeForFilename('https://tanstack.com/start/latest')).toBe(
        'tanstack-start'
      )
    })

    it('extracts domain + path from docs subdomain', () => {
      expect(sanitizeForFilename('https://docs.tanstack.com/query/latest')).toBe(
        'docs-tanstack-query'
      )
    })

    it('handles GitHub repo URLs', () => {
      expect(sanitizeForFilename('https://github.com/user/repo-name')).toBe(
        'github-user-repo-name'
      )
    })

    it('handles www subdomain', () => {
      expect(sanitizeForFilename('https://www.example.com/api/docs')).toBe(
        'example-api-docs'
      )
    })

    it('excludes version numbers from path', () => {
      expect(sanitizeForFilename('https://example.com/api/v2/docs')).toBe(
        'example-api-docs'
      )
    })

    it('excludes "latest" from path', () => {
      expect(sanitizeForFilename('https://example.com/docs/latest/guide')).toBe(
        'example-docs-guide'
      )
    })

    it('limits path segments to 3', () => {
      expect(
        sanitizeForFilename('https://example.com/a/b/c/d/e/f')
      ).toBe('example-a-b-c')
    })

    it('handles URLs with query params (ignores them)', () => {
      expect(
        sanitizeForFilename('https://example.com/docs?version=2.0')
      ).toBe('example-docs')
    })

    it('handles URLs with hash fragments (ignores them)', () => {
      expect(sanitizeForFilename('https://example.com/docs#section')).toBe(
        'example-docs'
      )
    })

    it('handles http:// URLs', () => {
      expect(sanitizeForFilename('http://example.com/api/docs')).toBe(
        'example-api-docs'
      )
    })

    it('handles URLs with only domain', () => {
      expect(sanitizeForFilename('https://example.com')).toBe('example')
    })

    it('handles URLs with trailing slash', () => {
      expect(sanitizeForFilename('https://example.com/docs/')).toBe(
        'example-docs'
      )
    })
  })

  describe('natural language queries', () => {
    it('converts spaces to hyphens', () => {
      expect(sanitizeForFilename('React hooks best practices')).toBe(
        'react-hooks-best-practices'
      )
    })

    it('removes special characters', () => {
      expect(sanitizeForFilename('TypeScript: Error Handling!')).toBe(
        'typescript-error-handling'
      )
    })

    it('converts to lowercase', () => {
      expect(sanitizeForFilename('TypeScript Testing')).toBe(
        'typescript-testing'
      )
    })

    it('collapses multiple spaces', () => {
      expect(sanitizeForFilename('React    Router    Guide')).toBe(
        'react-router-guide'
      )
    })

    it('collapses multiple hyphens', () => {
      expect(sanitizeForFilename('React---Router')).toBe('react-router')
    })

    it('trims whitespace', () => {
      expect(sanitizeForFilename('  React hooks  ')).toBe('react-hooks')
    })
  })

  describe('length limits', () => {
    it('respects 50-char limit for URLs', () => {
      const result = sanitizeForFilename(
        'https://example.com/very/long/path/with/many/segments'
      )
      expect(result.length).toBeLessThanOrEqual(50)
    })

    it('respects 50-char limit for natural language', () => {
      const result = sanitizeForFilename('a'.repeat(60))
      expect(result).toHaveLength(50)
    })

    it('respects 50-char limit for long query', () => {
      const longQuery =
        'This is a very long query with many words that exceeds fifty characters'
      const result = sanitizeForFilename(longQuery)
      expect(result.length).toBeLessThanOrEqual(50)
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(sanitizeForFilename('')).toBe('')
    })

    it('handles only whitespace', () => {
      expect(sanitizeForFilename('   ')).toBe('')
    })

    it('handles only special characters', () => {
      expect(sanitizeForFilename('!@#$%^&*()')).toBe('')
    })

    it('handles malformed URLs (falls back to natural language)', () => {
      expect(sanitizeForFilename('https://malformed url')).toBe(
        'httpsmalformed-url'
      )
    })

    it('preserves hyphens in natural language', () => {
      expect(sanitizeForFilename('React-Router-DOM')).toBe('react-router-dom')
    })
  })
})
