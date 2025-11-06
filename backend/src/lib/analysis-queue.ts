/**
 * Analysis Queue Client
 * BullMQ queue client for adding analysis jobs from the backend
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger';

interface AnalysisJobData {
  projectId: string;
  projectPath: string;
  projectName: string;
  priority?: 'low' | 'normal' | 'high';
  forceRefresh?: boolean;
}

export class AnalysisQueueClient {
  private queue: Queue<AnalysisJobData> | null = null;
  private redisConnection: Redis | null = null;
  private isInitialized = false;

  constructor(private redisUrl: string) {}

  /**
   * Initialize the queue connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create Redis connection for BullMQ
      this.redisConnection = new Redis(this.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      // Initialize queue (same name as worker)
      this.queue = new Queue<AnalysisJobData>('project-analysis', {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 100,
            age: 24 * 3600,
          },
          removeOnFail: {
            count: 500,
          },
        },
      });

      this.isInitialized = true;
      logger.info('✅ Analysis queue client initialized');
    } catch (error) {
      logger.error('Failed to initialize analysis queue:', error);
      throw error;
    }
  }

  /**
   * Add a project analysis job to the queue
   */
  async addAnalysisJob(data: AnalysisJobData): Promise<string> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    try {
      const job = await this.queue.add('analyze-project', data, {
        priority: data.priority === 'high' ? 1 : data.priority === 'low' ? 3 : 2,
        jobId: `analysis-${data.projectId}-${Date.now()}`,
      });

      logger.info(`📝 Queued analysis job ${job.id} for project: ${data.projectName}`);
      return job.id!;
    } catch (error) {
      logger.error('Failed to queue analysis job:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Clear all jobs from the queue
   */
  async clearAllJobs(): Promise<number> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    try {
      // Get all jobs in various states
      const [waiting, active, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getDelayed(),
      ]);

      // Remove all jobs
      const allJobs = [...waiting, ...active, ...delayed];
      let cleared = 0;

      for (const job of allJobs) {
        await job.remove();
        cleared++;
      }

      logger.info(`🗑️  Cleared ${cleared} jobs from queue`);
      return cleared;
    } catch (error) {
      logger.error('Failed to clear queue:', error);
      throw error;
    }
  }

  /**
   * Check if queue is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.redisConnection) return false;
      await this.redisConnection.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      logger.info('Analysis queue closed');
    }
    if (this.redisConnection) {
      await this.redisConnection.quit();
      logger.info('Redis connection closed');
    }
    this.isInitialized = false;
  }
}

// Singleton instance
let queueClient: AnalysisQueueClient | null = null;

export async function getAnalysisQueue(redisUrl?: string): Promise<AnalysisQueueClient> {
  if (!queueClient) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    queueClient = new AnalysisQueueClient(url);
    await queueClient.initialize();
  }
  return queueClient;
}

export async function shutdownAnalysisQueue(): Promise<void> {
  if (queueClient) {
    await queueClient.shutdown();
    queueClient = null;
  }
}
