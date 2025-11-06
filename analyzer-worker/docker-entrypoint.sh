#!/bin/sh
# Analyzer Worker Docker Entrypoint
# Ensures migrations are complete before starting worker

set -e

echo "🚀 Starting Analyzer Worker Service..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1; do
  echo "⏳ Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Check if migrations exist (backend should have run them)
echo "🔍 Checking database schema..."
if ! npx prisma migrate status > /dev/null 2>&1; then
  echo "⚠️  Migrations pending - waiting for backend to complete migrations..."
  sleep 5
fi

# Generate Prisma Client (in case schema changed)
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "✅ Prisma Client generated!"

# Start the worker
echo "🎉 Starting worker..."
exec "$@"
