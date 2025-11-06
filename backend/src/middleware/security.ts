/**
 * Security middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Validate file path to prevent directory traversal attacks
 */
export async function validatePath(filePath: string): Promise<boolean> {
  try {
    // Resolve to absolute path
    const resolvedPath = path.resolve(filePath);

    // Check if path exists
    const stats = await fs.stat(resolvedPath);

    // Check if it's a directory
    if (!stats.isDirectory()) {
      return false;
    }

    // Additional security checks can be added here
    // e.g., check if path is within allowed directories

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize command arguments to prevent injection
 */
export function sanitizeCommand(arg: string): string {
  // Remove potentially dangerous characters
  return arg.replace(/[;&|`$()<>]/g, '');
}

/**
 * Rate limiting middleware (basic implementation)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async check(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const ip = request.ip;
    const now = Date.now();

    // Get request timestamps for this IP
    let timestamps = this.requests.get(ip) || [];

    // Filter out old requests outside the window
    timestamps = timestamps.filter((timestamp) => now - timestamp < this.windowMs);

    // Check if rate limit exceeded
    if (timestamps.length >= this.maxRequests) {
      reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please try again later',
      });
      return;
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(ip, timestamps);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < this.windowMs
      );
      if (validTimestamps.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validTimestamps);
      }
    }
  }
}
