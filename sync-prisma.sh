#!/bin/bash
# Sync Prisma Schema
# Copies the Prisma schema from backend to analyzer-worker
# Run this whenever the database schema changes

set -e

echo "🔄 Syncing Prisma schema from backend to analyzer-worker..."

# Check if backend prisma exists
if [ ! -d "backend/prisma" ]; then
  echo "❌ Error: backend/prisma directory not found"
  exit 1
fi

# Copy the schema
cp -r backend/prisma analyzer-worker/prisma

echo "✅ Prisma schema synced successfully!"
echo "📝 Remember to rebuild the analyzer-worker container:"
echo "   docker-compose build analyzer-worker"
