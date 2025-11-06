/**
 * Health check routes
 */

import { FastifyInstance } from 'fastify';
import { db } from '../lib/db';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { performanceMonitor } from '../lib/performance-monitor';

export async function healthRoutes(fastify: FastifyInstance) {
  const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

  /**
   * GET /health - Basic health check
   */
  fastify.get('/', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'project-viewer-backend',
    });
  });

  /**
   * GET /health/detailed - Detailed health check with dependencies
   */
  fastify.get('/detailed', async (_request, reply) => {
    const checks: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'project-viewer-backend',
      checks: {
        database: { status: 'unknown' },
        redis: { status: 'unknown' },
      },
    };

    // Check database
    try {
      await db.$queryRaw`SELECT 1`;
      checks.checks.database = { status: 'ok' };
    } catch (error: any) {
      checks.checks.database = {
        status: 'error',
        message: error.message,
      };
      checks.status = 'degraded';
      logger.error('Database health check failed:', error);
    }

    // Check Redis
    try {
      await redis.ping();
      checks.checks.redis = { status: 'ok' };
    } catch (error: any) {
      checks.checks.redis = {
        status: 'error',
        message: error.message,
      };
      checks.status = 'degraded';
      logger.error('Redis health check failed:', error);
    }

    const statusCode = checks.status === 'ok' ? 200 : 503;
    return reply.status(statusCode).send(checks);
  });

  /**
   * GET /health/metrics - Performance metrics
   */
  fastify.get('/metrics', async (_request, reply) => {
    const metrics = performanceMonitor.getMetrics();

    return reply.send({
      timestamp: new Date().toISOString(),
      ...metrics,
    });
  });

  /**
   * GET /health/summary - Performance summary (text format)
   */
  fastify.get('/summary', async (_request, reply) => {
    const summary = performanceMonitor.getSummary();

    return reply.type('text/plain').send(summary);
  });
}
