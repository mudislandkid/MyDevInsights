/**
 * File Watcher Service - Entry Point
 * Monitors project directories and publishes events to Redis
 */

import * as dotenv from 'dotenv';
import { FileWatcher } from './lib/file-watcher';
import { WatcherConfig } from './types';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Configuration
const config: WatcherConfig = {
  watchPath: process.env.WATCH_PATH || '/projects',
  depth: parseInt(process.env.WATCH_DEPTH || '1', 10),
  ignorePatterns: (process.env.WATCH_IGNORE_PATTERNS || 'node_modules,.git,dist,build,.next,out,coverage,.cache,__pycache__')
    .split(',')
    .map((p) => p.trim()),
  debounceDelay: parseInt(process.env.WATCH_DEBOUNCE_DELAY || '2000', 10),
  stabilityThreshold: parseInt(process.env.WATCH_STABILIZATION_MS || '2000', 10),
};

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

// Create file watcher instance
const watcher = new FileWatcher(config, redisUrl);

// Start watcher
async function start() {
  try {
    logger.info('🚀 Starting Project Viewer File Watcher Service');

    // Optional startup delay to ensure backend subscriber is ready
    const startupDelay = parseInt(process.env.STARTUP_DELAY || '0', 10);
    if (startupDelay > 0) {
      logger.info(`⏳ Waiting ${startupDelay}ms for backend subscriber to be ready...`);
      await new Promise(resolve => setTimeout(resolve, startupDelay));
      logger.info('✅ Startup delay complete');
    }

    logger.info('Configuration:', config);

    await watcher.start();

    // Health check interval
    setInterval(() => {
      const status = watcher.getStatus();
      logger.debug('Watcher status:', status);

      if (!watcher.isHealthy()) {
        logger.error('❌ Watcher is unhealthy!');
      }
    }, 30000); // Every 30 seconds

  } catch (error) {
    logger.error('Failed to start file watcher:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`\n${signal} received, shutting down gracefully...`);

  try {
    await watcher.stop();
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

// Start the service
start();
