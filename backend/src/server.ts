/**
 * Backend API Server - Entry Point
 */

import * as dotenv from 'dotenv';
import { buildApp } from './app';
import logger from './utils/logger';
import { db } from './lib/db';
import { ProjectDiscoverySubscriber } from './services/project-discovery-subscriber';
import { getAnalysisQueue, shutdownAnalysisQueue } from './lib/analysis-queue';

// Load environment variables
dotenv.config();

// Add BigInt serialization support for JSON
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let subscriber: ProjectDiscoverySubscriber | null = null;

async function start() {
  try {
    logger.info('🚀 Starting Project Viewer Backend...');

    // Test database connection
    logger.info('Testing database connection...');
    await db.$connect();
    logger.info('✅ Database connected');

    // Build and start server
    const app = await buildApp({
      host: HOST,
      port: PORT,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
    });

    await app.listen({
      port: PORT,
      host: HOST,
    });

    logger.info(`✅ Server listening on http://${HOST}:${PORT}`);
    logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
    logger.info(`🔌 WebSocket: ws://${HOST}:${PORT}/ws`);
    logger.info(`📚 API Documentation: http://${HOST}:${PORT}/`);

    // Start Redis subscriber for project discovery events
    logger.info('🔄 Starting project discovery subscriber...');
    subscriber = new ProjectDiscoverySubscriber(REDIS_URL);
    await subscriber.start();
    logger.info('✅ Project discovery subscriber started');

    // Initialize analysis queue client
    logger.info('🔄 Initializing analysis queue client...');
    await getAnalysisQueue(REDIS_URL);
    logger.info('✅ Analysis queue client initialized');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`\n${signal} received, shutting down gracefully...`);

  try {
    // Stop subscriber
    if (subscriber) {
      await subscriber.stop();
      logger.info('✅ Subscriber stopped');
    }

    // Shutdown analysis queue client
    await shutdownAnalysisQueue();
    logger.info('✅ Analysis queue shutdown');

    // Close database connection
    await db.$disconnect();
    logger.info('✅ Database disconnected');

    logger.info('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the server
start();
