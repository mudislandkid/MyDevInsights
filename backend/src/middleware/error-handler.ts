/**
 * Global error handler middleware
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  logger.error(`Error handling ${request.method} ${request.url}:`, {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Resource already exists',
      });
    }

    if (error.code === 'P2025') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Resource not found',
      });
    }

    return reply.status(400).send({
      error: 'Database Error',
      message: 'Database operation failed',
    });
  }

  // Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  // Custom status code
  if (error.statusCode && error.statusCode !== 500) {
    return reply.status(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message,
    });
  }

  // Default 500 error
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
  });
}
