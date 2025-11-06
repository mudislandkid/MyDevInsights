/**
 * Redis Cache Manager
 * Handles caching of analysis results with TTL and invalidation
 */

import Redis from 'ioredis';
import * as crypto from 'crypto';
import { AnalysisResult, CachedAnalysis } from '../types';
import logger from '../utils/logger';

export class CacheManager {
  private client: Redis;
  private ttl: number; // seconds

  constructor(redisUrl: string, ttlHours: number = 24) {
    this.client = new Redis(redisUrl);
    this.ttl = ttlHours * 3600; // Convert to seconds

    this.client.on('error', (error) => {
      logger.error(`Redis cache error: ${error.message}`);
    });

    this.client.on('connect', () => {
      logger.info('✅ Cache connected to Redis');
    });
  }

  /**
   * Generate cache key from project path and last modified time
   */
  generateCacheKey(projectPath: string, lastModified: Date): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${projectPath}:${lastModified.toISOString()}`)
      .digest('hex');

    return `analysis:${hash}`;
  }

  /**
   * Get cached analysis
   */
  async get(projectPath: string, lastModified: Date): Promise<CachedAnalysis | null> {
    const key = this.generateCacheKey(projectPath, lastModified);

    try {
      const cached = await this.client.get(key);
      if (!cached) {
        logger.debug(`Cache MISS for ${projectPath}`);
        return null;
      }

      const parsed: CachedAnalysis = JSON.parse(cached);

      // Check if expired
      if (new Date(parsed.expiresAt) < new Date()) {
        logger.debug(`Cache EXPIRED for ${projectPath}`);
        await this.client.del(key);
        return null;
      }

      logger.debug(`Cache HIT for ${projectPath}`);
      return parsed;
    } catch (error) {
      logger.error(`Cache get error: ${error}`);
      return null;
    }
  }

  /**
   * Set cached analysis
   */
  async set(
    projectPath: string,
    lastModified: Date,
    result: AnalysisResult
  ): Promise<boolean> {
    const key = this.generateCacheKey(projectPath, lastModified);
    const projectHash = crypto.createHash('sha256').update(projectPath).digest('hex');

    const cached: CachedAnalysis = {
      result,
      projectHash,
      lastModified,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.ttl * 1000),
    };

    try {
      await this.client.setex(key, this.ttl, JSON.stringify(cached));
      logger.debug(`Cache SET for ${projectPath} (TTL: ${this.ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set error: ${error}`);
      return false;
    }
  }

  /**
   * Invalidate cache for a specific project
   */
  async invalidate(projectPath: string): Promise<number> {
    const projectHash = crypto.createHash('sha256').update(projectPath).digest('hex');

    try {
      // Find all keys for this project
      const pattern = `analysis:*`;
      const keys = await this.client.keys(pattern);

      let deleted = 0;
      for (const key of keys) {
        const cached = await this.client.get(key);
        if (cached) {
          const parsed: CachedAnalysis = JSON.parse(cached);
          if (parsed.projectHash === projectHash) {
            await this.client.del(key);
            deleted++;
          }
        }
      }

      if (deleted > 0) {
        logger.info(`🗑️  Invalidated ${deleted} cache entries for ${projectPath}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Cache invalidation error: ${error}`);
      return 0;
    }
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpired(): Promise<number> {
    try {
      const pattern = `analysis:*`;
      const keys = await this.client.keys(pattern);

      let deleted = 0;
      for (const key of keys) {
        const cached = await this.client.get(key);
        if (cached) {
          const parsed: CachedAnalysis = JSON.parse(cached);
          if (new Date(parsed.expiresAt) < new Date()) {
            await this.client.del(key);
            deleted++;
          }
        }
      }

      if (deleted > 0) {
        logger.info(`🧹 Cleared ${deleted} expired cache entries`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Clear expired error: ${error}`);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    totalSize: number; // bytes
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    try {
      const pattern = `analysis:*`;
      const keys = await this.client.keys(pattern);

      let totalSize = 0;
      let oldest: Date | undefined;
      let newest: Date | undefined;

      for (const key of keys) {
        const cached = await this.client.get(key);
        if (cached) {
          totalSize += Buffer.byteLength(cached, 'utf-8');
          const parsed: CachedAnalysis = JSON.parse(cached);
          const created = new Date(parsed.createdAt);

          if (!oldest || created < oldest) oldest = created;
          if (!newest || created > newest) newest = created;
        }
      }

      return {
        totalKeys: keys.length,
        totalSize,
        oldestEntry: oldest,
        newestEntry: newest,
      };
    } catch (error) {
      logger.error(`Get stats error: ${error}`);
      return { totalKeys: 0, totalSize: 0 };
    }
  }

  /**
   * Check if cache is available
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
    logger.info('Cache connection closed');
  }
}
