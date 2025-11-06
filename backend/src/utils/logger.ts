/**
 * Winston Logger Configuration
 * Provides structured logging with file rotation, error tracking, and multiple transports
 */

import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import { cwd } from 'process'

// Define log directory
const LOG_DIR = process.env.LOG_DIR || path.join(cwd(), 'logs')

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`
    }

    return msg
  })
)

// Create daily rotate file transport for combined logs
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
  level: 'info',
})

// Create daily rotate file transport for error logs
const errorFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  level: 'error',
})

// Create console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.LOG_LEVEL || 'info',
})

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'project-viewer-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    combinedFileTransport,
    errorFileTransport,
    consoleTransport,
  ],
  exitOnError: false,
})

// Add request logging helper
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  metadata?: Record<string, any>
) {
  logger.info('HTTP Request', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    ...metadata,
  })
}

// Add error logging helper with stack trace
export function logError(
  error: Error,
  context?: string,
  metadata?: Record<string, any>
) {
  logger.error('Error occurred', {
    context,
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
    ...metadata,
  })
}

// Add performance logging helper
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  })
}

// Add business event logging helper
export function logEvent(
  event: string,
  data?: Record<string, any>
) {
  logger.info('Business event', {
    event,
    ...data,
  })
}

// Export logger instance as default
export default logger

// Also export winston types for convenience
export type { Logger } from 'winston'
