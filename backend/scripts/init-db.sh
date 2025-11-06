#!/bin/bash

# Initialize Database and Run Migrations
# This script sets up the PostgreSQL database with Prisma migrations

set -e

echo "🔄 Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be ready (using environment variables or defaults)
PGHOST="${PGHOST:-postgres}"
PGUSER="${POSTGRES_USER:-postgres}"
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"
PGDATABASE="${POSTGRES_DB:-projectviewer}"

export PGPASSWORD

until psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c '\q' 2>/dev/null; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

echo "✅ PostgreSQL is ready!"

echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "✅ Database initialization complete!"
