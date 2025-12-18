# API Conventions

Project REST conventions, versioning, error formats.

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Fastify instance | `server` | `const server = Fastify()` |
| Factory function | `createServer()` | `export function createServer()` |
| Entry file | `src/server.ts` | |
| Routes | `src/routes/*.ts` | `src/routes/users.ts` |
| Plugins | `src/plugins/*.ts` | `src/plugins/db.ts` |

See @context/blocks/tools/fastify.md for implementation patterns.

## Endpoints

<!-- Naming conventions, versioning strategy -->

## Request/Response Format

<!-- JSON structure, pagination, filtering -->

## Error Format

<!-- Error response structure, status codes -->

## Authentication

<!-- How auth headers are passed -->
