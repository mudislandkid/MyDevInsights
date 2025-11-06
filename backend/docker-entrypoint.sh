#!/bin/sh
# Backend Docker Entrypoint
# Handles database migrations and service startup

set -e

echo "🚀 Starting Backend Service..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1; do
  echo "⏳ Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed!"

# Generate Prisma Client (in case schema changed)
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "✅ Prisma Client generated!"

# Start the application
echo "🎉 Starting application..."
exec "$@"
