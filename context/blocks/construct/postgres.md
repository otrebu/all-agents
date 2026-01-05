---
depends: []
tags: [database]
---

# PostgreSQL

Open-source relational database. PostgreSQL 18 introduces version-specific data directories for easier major version upgrades.

## Docker Setup (v18+)

**Critical v18 change:** Data path is now `/var/lib/postgresql/18/docker` (version-specific).

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:18
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql
      - ./init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

**v18 vs v17 paths:**

| Version | PGDATA                          | Volume Mount               |
| ------- | ------------------------------- | -------------------------- |
| 18+     | `/var/lib/postgresql/18/docker` | `/var/lib/postgresql`      |
| 17-     | `/var/lib/postgresql/data`      | `/var/lib/postgresql/data` |

## Connection String

```
postgresql://user:password@host:port/database
```

**Examples:**

```bash
# Local Docker
postgresql://app:secret@localhost:5432/appdb

# With SSL
postgresql://user:pass@host:5432/db?sslmode=require

# Connection pool params
postgresql://user:pass@host:5432/db?pool_timeout=30&pool_size=10
```

## Initialization Scripts

Place `.sql` or `.sh` files in `/docker-entrypoint-initdb.d/`:

```sql
-- init/01-extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

```sql
-- init/02-schema.sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Scripts run alphabetically on first container start only.

## psql Commands

```bash
# Connect
psql postgresql://app:secret@localhost:5432/appdb

# Or via Docker
docker exec -it postgres psql -U app -d appdb
```

**Common commands:**

| Command    | Description             |
| ---------- | ----------------------- |
| `\l`       | List databases          |
| `\dt`      | List tables             |
| `\d table` | Describe table          |
| `\du`      | List users/roles        |
| `\q`       | Quit                    |
| `\x`       | Toggle expanded display |
| `\timing`  | Toggle query timing     |

## Backup & Restore

```bash
# Backup single database
docker exec postgres pg_dump -U app appdb > backup.sql

# Backup all databases
docker exec postgres pg_dumpall -U app > all_backup.sql

# Compressed backup
docker exec postgres pg_dump -U app -Fc appdb > backup.dump

# Restore SQL
docker exec -i postgres psql -U app -d appdb < backup.sql

# Restore compressed
docker exec -i postgres pg_restore -U app -d appdb < backup.dump
```

## Health Checks

```bash
# Check if ready
pg_isready -h localhost -p 5432 -U app

# Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('appdb'));"
```

## Performance Extensions

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Best Practices

**DO:**

- Pin exact image version (`postgres:18.1` not `postgres:latest`)
- Use health checks in Docker Compose
- Place init scripts in numbered order (`01-`, `02-`)
- Use `pg_isready` for readiness checks
- Enable `pg_stat_statements` for query analysis

**DON'T:**

- Mount v18 volumes at old `/var/lib/postgresql/data` path
- Store credentials in docker-compose.yml (use `.env`)
- Run as root in production
- Skip backups before major version upgrades
