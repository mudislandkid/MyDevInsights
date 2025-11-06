/**
 * Analyzer Worker Service - Entry Point
 * Background worker for AI-powered project analysis
 */

import * as dotenv from 'dotenv';
import { QueueManager } from './lib/queue';
import { WorkerProcessor } from './lib/worker-processor';
import { WorkerConfig } from './types';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Configuration
const config: WorkerConfig = {
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  timeout: parseInt(process.env.AI_TIMEOUT_MS || '180000', 10),
  cacheTTL: parseInt(process.env.CACHE_TTL_HOURS || '24', 10) * 3600000,
  maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '10000', 10),
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  rateLimit: {
    maxConcurrent: parseInt(process.env.RATE_LIMIT_CONCURRENT || '3', 10),
    requestsPerMinute: parseInt(process.env.RATE_LIMIT_PER_MIN || '10', 10),
    backoffMultiplier: parseFloat(process.env.BACKOFF_MULTIPLIER || '2'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    initialDelayMs: parseInt(process.env.INITIAL_DELAY_MS || '2000', 10),
  },
};

// Validate required config
if (!config.anthropicApiKey) {
  logger.error('❌ ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

// Create worker processor
const processor = new WorkerProcessor(config);

// Create queue manager
const queueManager = new QueueManager(
  config.redisUrl,
  config.concurrency,
  async (job) => {
    await processor.processJob(job);
  }
);

// Start service
async function start() {
  try {
    logger.info('🚀 Starting Analyzer Worker Service');
    logger.info('Configuration:', {
      model: config.model,
      concurrency: config.concurrency,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      cacheTTL: config.cacheTTL / 3600000 + 'h',
      rateLimit: config.rateLimit,
    });

    // Health check
    const isHealthy = await processor.isHealthy();
    if (!isHealthy) {
      logger.warn('⚠️  Some services are not healthy, but continuing...');
    }

    // Health check interval
    setInterval(async () => {
      const healthy = await processor.isHealthy();
      const queueHealthy = await queueManager.isHealthy();
      const stats = processor.getStats();
      const queueStats = await queueManager.getStats();

      logger.debug('Health Check:', {
        worker: healthy ? '✅' : '❌',
        queueHealthy: queueHealthy ? '✅' : '❌',
        stats: {
          processed: stats.jobsProcessed,
          failed: stats.jobsFailed,
          cacheHitRate: stats.jobsProcessed > 0
            ? `${((stats.cacheHits / stats.jobsProcessed) * 100).toFixed(1)}%`
            : '0%',
          avgDuration: `${Math.round(stats.averageDuration)}ms`,
          totalTokens: stats.totalTokensUsed,
        },
        queueStats,
      });

      if (!healthy || !queueHealthy) {
        logger.error('❌ Service is unhealthy!');
      }
    }, 30000); // Every 30 seconds

    // Stats reporting interval
    setInterval(() => {
      const stats = processor.getStats();
      logger.info('📊 Worker Stats:', {
        jobsProcessed: stats.jobsProcessed,
        jobsFailed: stats.jobsFailed,
        cacheHitRate: stats.jobsProcessed > 0
          ? `${((stats.cacheHits / stats.jobsProcessed) * 100).toFixed(1)}%`
          : '0%',
        avgDuration: `${Math.round(stats.averageDuration)}ms`,
        totalTokens: stats.totalTokensUsed,
        uptime: `${Math.round(stats.uptime / 60000)}m`,
      });
    }, 300000); // Every 5 minutes

    logger.info('✅ Analyzer Worker Service is ready and processing jobs');
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`\n${signal} received, shutting down gracefully...`);

  try {
    // Stop accepting new jobs
    await queueManager.pause();

    // Shutdown queue (waits for active jobs)
    await queueManager.shutdown();

    // Cleanup processor
    await processor.cleanup();

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
