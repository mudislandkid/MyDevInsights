/**
 * Database Connection and Prisma Client
 * Centralized Prisma Client instance with connection pooling
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Prisma Client instance
let prisma: PrismaClient;

/**
 * Get or create Prisma Client instance (singleton pattern)
 * Uses connection pooling and proper cleanup
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
      errorFormat: 'pretty',
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }

  return prisma;
}

/**
 * Test database connection
 * @returns true if connected, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Disconnect from database
 */
export async function disconnect(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const db = getPrismaClient();
