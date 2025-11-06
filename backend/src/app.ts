/**
 * Fastify application factory
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { errorHandler } from './middleware/error-handler';
import { RateLimiter } from './middleware/security';
import { projectRoutes } from './routes/projects';
import { healthRoutes } from './routes/health';
import { queueRoutes } from './routes/queue';
import { websocketPlugin } from './plugins/websocket';
import loggingPlugin from './plugins/logging';
import logger from './utils/logger';

export interface AppConfig {
  host?: string;
  port?: number;
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  trustProxy?: boolean;
}

export async function buildApp(config: AppConfig = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel || 'error', // Only log errors/warnings, suppress info logs
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    trustProxy: config.trustProxy ?? true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
    disableRequestLogging: true, // Disable Fastify's built-in request logging (using custom Winston logger instead)
  });

  // Register plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  await app.register(websocket);

  // Winston logging (application-level)
  await app.register(loggingPlugin, {
    logRequests: true,
    logErrors: true,
    excludePaths: ['/health'],
  });

  // Rate limiting
  const rateLimiter = new RateLimiter(
    parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
  );

  app.addHook('preHandler', async (request, reply) => {
    await rateLimiter.check(request, reply);
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(projectRoutes, { prefix: '/projects' });
  await app.register(queueRoutes, { prefix: '/queue' });

  // Register WebSocket
  await app.register(websocketPlugin);

  // Root endpoint
  app.get('/', async () => {
    return {
      service: 'project-viewer-backend',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        projects: '/projects',
        queue: '/queue',
        websocket: '/ws',
      },
    };
  });

  // Not found handler
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  logger.info('Fastify app initialized');

  return app;
}
