/**
 * Rate Limiter with Exponential Backoff
 * Handles API rate limiting and retry logic
 */

import { RateLimitConfig } from '../types';
import logger from '../utils/logger';

export class RateLimiter {
  private requestTimestamps: number[] = [];
  private currentConcurrent: number = 0;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Wait until rate limit allows next request
   */
  async waitForSlot(): Promise<void> {
    // Wait for concurrent slot
    while (this.currentConcurrent >= this.config.maxConcurrent) {
      await this.sleep(100);
    }

    // Wait for rate limit slot
    while (!this.canMakeRequest()) {
      const waitTime = this.getWaitTime();
      logger.debug(`⏳ Rate limit: waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    // Reserve slot
    this.currentConcurrent++;
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Release a concurrent slot
   */
  releaseSlot(): void {
    this.currentConcurrent = Math.max(0, this.currentConcurrent - 1);
  }

  /**
   * Check if we can make a request within rate limit
   */
  private canMakeRequest(): boolean {
    this.cleanOldTimestamps();
    return this.requestTimestamps.length < this.config.requestsPerMinute;
  }

  /**
   * Get wait time until next available slot
   */
  private getWaitTime(): number {
    this.cleanOldTimestamps();

    if (this.requestTimestamps.length === 0) {
      return 0;
    }

    // If at limit, wait until oldest request expires
    if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const age = Date.now() - oldestTimestamp;
      return Math.max(0, 60000 - age + 100); // Add 100ms buffer
    }

    return 0;
  }

  /**
   * Remove timestamps older than 1 minute
   */
  private cleanOldTimestamps(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneMinuteAgo);
  }

  /**
   * Execute function with rate limiting and exponential backoff
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: {
      onRetry?: (attempt: number, error: any) => void;
      maxRetries?: number;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries || this.config.maxRetries;
    let attempt = 0;
    let lastError: any;

    while (attempt < maxRetries) {
      try {
        // Wait for rate limit slot
        await this.waitForSlot();

        try {
          // Execute function
          const result = await fn();
          return result;
        } finally {
          // Always release slot
          this.releaseSlot();
        }
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Check if it's a rate limit error (429)
        const isRateLimit = error.status === 429 ||
                           error.message?.includes('rate limit') ||
                           error.message?.includes('429');

        if (attempt < maxRetries) {
          const delay = this.calculateBackoff(attempt, isRateLimit);
          logger.warn(
            `⚠️  Attempt ${attempt}/${maxRetries} failed: ${error.message}. ` +
            `Retrying in ${delay}ms...`
          );

          if (options?.onRetry) {
            options.onRetry(attempt, error);
          }

          await this.sleep(delay);
        } else {
          logger.error(
            `❌ All ${maxRetries} attempts failed: ${error.message}`
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number, isRateLimit: boolean): number {
    // For rate limit errors, use longer backoff
    const baseDelay = isRateLimit
      ? this.config.initialDelayMs * 3
      : this.config.initialDelayMs;

    // Exponential backoff: delay = baseDelay * (multiplier ^ attempt)
    const delay = baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);

    // Cap at 60 seconds
    return Math.min(delay + jitter, 60000);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit stats
   */
  getStats(): {
    currentConcurrent: number;
    requestsInLastMinute: number;
    availableSlots: number;
  } {
    this.cleanOldTimestamps();
    return {
      currentConcurrent: this.currentConcurrent,
      requestsInLastMinute: this.requestTimestamps.length,
      availableSlots: Math.max(
        0,
        this.config.requestsPerMinute - this.requestTimestamps.length
      ),
    };
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.requestTimestamps = [];
    this.currentConcurrent = 0;
  }
}
