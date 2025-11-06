# Prisma Migrations Guide

## Initial Migration Setup

The initial database migration will be created when you first run the application with Docker Compose.

### Automatic Migration (Recommended)

When you run `docker compose up`, the migrations will be applied automatically:

```bash
# From project root
docker compose up -d

# Check migration status
docker compose exec backend npx prisma migrate status
```

### Manual Migration

If you need to create or apply migrations manually:

```bash
# Create a new migration
docker compose exec backend npx prisma migrate dev --name init

# Apply pending migrations
docker compose exec backend npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
docker compose exec backend npx prisma migrate reset
```

## Migration Commands

### Development

```bash
# Create a migration from schema changes
npm run prisma:migrate

# Apply migrations
npm run prisma:migrate:deploy

# Reset database and apply all migrations
npm run db:reset

# Push schema changes without creating migration (for prototyping)
npm run db:push
```

### Production

```bash
# Apply migrations (safe for production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

## Initial Schema

The initial migration creates three tables:

1. **projects** - Main project information
2. **project_analyses** - AI-generated analysis results
3. **tags** - Project categorization tags
4. **_ProjectToTag** - Many-to-many relation table (auto-generated)

### Indexes Created

- `projects`: status, discoveredAt, composite(status, discoveredAt), framework, language
- `project_analyses`: projectId, createdAt
- Tags automatically indexed via many-to-many relation

## Troubleshooting

### Migration fails with "database doesn't exist"

Ensure PostgreSQL service is running:

```bash
docker compose ps postgres
docker compose logs postgres
```

### Schema changes not detected

Regenerate Prisma Client:

```bash
npx prisma generate
```

### Need to rollback

Prisma doesn't support automatic rollback. You must:

1. Manually revert schema changes
2. Create a new migration
3. Or reset the database entirely

### Viewing migration SQL

Check the `prisma/migrations/` directory for generated SQL files.

## Best Practices

1. **Never edit migration files manually** - always use `prisma migrate dev`
2. **Test migrations** in development before applying to production
3. **Backup production data** before running migrations
4. **Use transactions** - Prisma migrations are transactional by default
5. **Version control** - commit migration files to git

## Connection String

The `DATABASE_URL` environment variable must point to your PostgreSQL instance:

```
# For Docker (service name)
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/projectviewer"

# For local development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projectviewer"
```
