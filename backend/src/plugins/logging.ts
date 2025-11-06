/**
 * Logging Plugin for Fastify
 * Adds request/response logging with performance tracking
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import logger, { logRequest, logError } from '../utils/logger'
import { performanceMonitor } from '../lib/performance-monitor'

interface LoggingOptions {
  logRequests?: boolean
  logErrors?: boolean
  excludePaths?: string[]
}

async function loggingPlugin(
  fastify: FastifyInstance,
  options: LoggingOptions = {}
) {
  const {
    logRequests = true,
    logErrors = true,
    excludePaths = ['/health', '/metrics'],
  } = options

  // Add request logging
  if (logRequests) {
    fastify.addHook('onRequest', async (request: FastifyRequest) => {
      // Store request start time for performance tracking
      request.requestStartTime = Date.now()
    })

    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip excluded paths
      if (excludePaths.some(path => request.url.startsWith(path))) {
        return
      }

      const responseTime = Date.now() - (request.requestStartTime || Date.now())

      logRequest(
        request.method,
        request.url,
        reply.statusCode,
        responseTime,
        {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          referer: request.headers.referer,
        }
      )

      // Record performance metrics
      performanceMonitor.recordRequest(
        request.url,
        request.method,
        responseTime,
        reply.statusCode
      )
    })
  }

  // Add error logging
  if (logErrors) {
    fastify.setErrorHandler((error, request, reply) => {
      logError(error, `Request: ${request.method} ${request.url}`, {
        method: request.method,
        url: request.url,
        ip: request.ip,
        statusCode: error.statusCode || 500,
      })

      // Send error response
      const statusCode = error.statusCode || 500

      reply.status(statusCode).send({
        error: true,
        message: statusCode === 500 ? 'Internal Server Error' : error.message,
        statusCode,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
        }),
      })
    })
  }

  // Add logger to fastify instance
  fastify.decorate('logger', logger)
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    requestStartTime?: number
  }

  interface FastifyInstance {
    logger: typeof logger
  }
}

export default fp(loggingPlugin, {
  name: 'logging-plugin',
  fastify: '>=4.x',
})
