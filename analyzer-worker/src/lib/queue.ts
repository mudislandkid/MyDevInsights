/**
 * BullMQ Queue Manager
 * Handles job queue setup, configuration, and lifecycle management
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { AnalysisJobData, JobProgress } from '../types';
import logger from '../utils/logger';

export class QueueManager {
  private queue: Queue<AnalysisJobData>;
  private worker: Worker<AnalysisJobData>;
  private queueEvents: QueueEvents;
  private redisConnection: Redis;
  private isShuttingDown: boolean = false;

  constructor(
    redisUrl: string,
    private concurrency: number = 5,
    private processor: (job: Job<AnalysisJobData>) => Promise<void>
  ) {
    // Create Redis connection for BullMQ
    this.redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Initialize queue
    this.queue = new Queue<AnalysisJobData>('project-analysis', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 1, // No automatic retries - fail fast and stop
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 500, // Keep last 500 failed jobs for debugging
        },
      },
    });

    // Initialize worker
    this.worker = new Worker<AnalysisJobData>(
      'project-analysis',
      async (job) => {
        if (this.isShuttingDown) {
          throw new Error('Worker is shutting down');
        }
        await this.processor(job);
      },
      {
        connection: this.redisConnection.duplicate(),
        concurrency: this.concurrency,
        limiter: {
          max: 2, // Max 2 jobs per duration (conservative to avoid rate limits)
          duration: 60000, // Per minute
        },
      }
    );

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents('project-analysis', {
      connection: this.redisConnection.duplicate(),
    });

    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for queue monitoring
   */
  private setupEventHandlers(): void {
    // Worker events
    this.worker.on('completed', (job) => {
      logger.info(`✅ Job ${job.id} completed for project ${job.data.projectId}`);
    });

    this.worker.on('failed', (job, error) => {
      if (job) {
        logger.error(
          `❌ Job ${job.id} failed for project ${job.data.projectId}: ${error.message}`
        );
      }
    });

    this.worker.on('progress', (job, progress: any) => {
      if (typeof progress === 'object' && progress.progress !== undefined) {
        logger.debug(`⏳ Job ${job.id} progress: ${progress.progress}% - ${progress.status}`);
      }
    });

    this.worker.on('error', (error) => {
      logger.error(`Worker error: ${error.message}`);
    });

    // Queue events
    this.queueEvents.on('waiting', ({ jobId }) => {
      logger.debug(`Job ${jobId} is waiting`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      logger.debug(`Job ${jobId} is now active`);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      logger.warn(`⚠️  Job ${jobId} has stalled`);
    });
  }

  /**
   * Add a new analysis job to the queue
   */
  async addJob(
    data: AnalysisJobData,
    priority?: number
  ): Promise<Job<AnalysisJobData>> {
    const job = await this.queue.add(
      'analyze-project',
      data,
      {
        priority: priority || (data.priority === 'high' ? 1 : data.priority === 'low' ? 3 : 2),
        jobId: `analysis-${data.projectId}-${Date.now()}`,
      }
    );

    logger.info(`📝 Added analysis job ${job.id} for project ${data.projectId}`);
    return job;
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: number;
    data?: AnalysisJobData;
  } | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress as number;

    return {
      state,
      progress,
      data: job.data,
    };
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('⏸️  Queue paused');
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('▶️  Queue resumed');
  }

  /**
   * Clean old jobs from queue
   */
  async clean(grace: number = 24 * 3600 * 1000): Promise<void> {
    await this.queue.clean(grace, 1000, 'completed');
    await this.queue.clean(grace, 1000, 'failed');
    logger.info(`🧹 Cleaned jobs older than ${grace}ms`);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    logger.info('🛑 Shutting down queue manager...');

    // Pause the queue to prevent new jobs
    await this.queue.pause();

    // Wait for active jobs to complete (with timeout)
    const activeCount = await this.queue.getActiveCount();
    if (activeCount > 0) {
      logger.info(`⏳ Waiting for ${activeCount} active jobs to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s for active jobs
    }

    // Close worker and queue
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    await this.redisConnection.quit();

    logger.info('✅ Queue manager shut down complete');
  }

  /**
   * Check if queue is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redisConnection.ping();
      return !this.isShuttingDown;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get queue instance (for advanced operations)
   */
  getQueue(): Queue<AnalysisJobData> {
    return this.queue;
  }

  /**
   * Get worker instance (for advanced operations)
   */
  getWorker(): Worker<AnalysisJobData> {
    return this.worker;
  }
}
