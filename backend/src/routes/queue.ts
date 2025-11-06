/**
 * Queue management routes
 */

import { FastifyInstance } from 'fastify';
import { getAnalysisQueue } from '../lib/analysis-queue';
import logger from '../utils/logger';
import { z } from 'zod';

// Schema for pagination
const QueueJobsQuerySchema = z.object({
  status: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const JobIdParamSchema = z.object({
  id: z.string(),
});

export async function queueRoutes(fastify: FastifyInstance) {
  /**
   * GET /queue/stats - Get queue statistics
   */
  fastify.get('/stats', async (_request, reply) => {
    try {
      const queueClient = await getAnalysisQueue();
      const stats = await queueClient.getStats();
      const isHealthy = await queueClient.isHealthy();

      return reply.send({
        data: {
          ...stats,
          healthy: isHealthy,
        },
      });
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve queue statistics',
      });
    }
  });

  /**
   * GET /queue/jobs - List jobs with optional filtering
   */
  fastify.get('/jobs', async (_request, reply) => {
    const query = QueueJobsQuerySchema.parse(_request.query);

    try {
      const queueClient = await getAnalysisQueue();
      const queue = (queueClient as any).queue; // Access the underlying BullMQ queue

      if (!queue) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Queue is not initialized',
        });
      }

      let jobs: any[] = [];

      // Get jobs based on status filter
      if (query.status === 'waiting') {
        jobs = await queue.getWaiting(query.page - 1, query.limit);
      } else if (query.status === 'active') {
        jobs = await queue.getActive(query.page - 1, query.limit);
      } else if (query.status === 'completed') {
        jobs = await queue.getCompleted(query.page - 1, query.limit);
      } else if (query.status === 'failed') {
        jobs = await queue.getFailed(query.page - 1, query.limit);
      } else if (query.status === 'delayed') {
        jobs = await queue.getDelayed(query.page - 1, query.limit);
      } else {
        // Get all jobs (limited to first 20 from each status)
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(0, 5),
          queue.getActive(0, 5),
          queue.getCompleted(0, 5),
          queue.getFailed(0, 5),
          queue.getDelayed(0, 5),
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
      }

      // Transform jobs to include useful information
      const transformedJobs = await Promise.all(
        jobs.map(async (job) => {
          const state = await job.getState();
          return {
            id: job.id,
            name: job.name,
            data: job.data,
            state,
            progress: job.progress,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            attemptsMade: job.attemptsMade,
          };
        })
      );

      return reply.send({
        data: transformedJobs,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: transformedJobs.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get queue jobs:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve queue jobs',
      });
    }
  });

  /**
   * GET /queue/jobs/:id - Get specific job details
   */
  fastify.get('/jobs/:id', async (_request, reply) => {
    const params = JobIdParamSchema.parse(_request.params);

    try {
      const queueClient = await getAnalysisQueue();
      const queue = (queueClient as any).queue;

      if (!queue) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Queue is not initialized',
        });
      }

      const job = await queue.getJob(params.id);

      if (!job) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Job not found',
        });
      }

      const state = await job.getState();
      const logs = await queue.getJobLogs(params.id);

      return reply.send({
        data: {
          id: job.id,
          name: job.name,
          data: job.data,
          state,
          progress: job.progress,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          attemptsMade: job.attemptsMade,
          logs: logs.logs,
        },
      });
    } catch (error) {
      logger.error('Failed to get job details:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve job details',
      });
    }
  });

  /**
   * DELETE /queue/jobs/:id - Remove a specific job
   */
  fastify.delete('/jobs/:id', async (_request, reply) => {
    const params = JobIdParamSchema.parse(_request.params);

    try {
      const queueClient = await getAnalysisQueue();
      const queue = (queueClient as any).queue;

      if (!queue) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Queue is not initialized',
        });
      }

      const job = await queue.getJob(params.id);

      if (!job) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Job not found',
        });
      }

      // Check job state before attempting to remove
      const state = await job.getState();

      if (state === 'active') {
        return reply.status(409).send({
          error: 'Job is Active',
          message: 'Cannot delete an active job. Please wait for it to complete or fail, or pause the queue first.',
        });
      }

      try {
        await job.remove();
        logger.info(`🗑️  Removed job ${params.id}`);
        return reply.status(204).send();
      } catch (removeError: any) {
        // Job is locked by worker - provide helpful error message
        if (removeError.message && removeError.message.includes('locked by another worker')) {
          return reply.status(409).send({
            error: 'Job is Locked',
            message: 'This job is currently locked by a worker. Wait a moment and try again, or pause the queue first.',
          });
        }
        throw removeError;
      }
    } catch (error: any) {
      logger.error('Failed to remove job:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to remove job',
      });
    }
  });

  /**
   * POST /queue/jobs/:id/force-delete - Force delete a job (even if locked)
   */
  fastify.post('/jobs/:id/force-delete', async (_request, reply) => {
    const params = JobIdParamSchema.parse(_request.params);

    try {
      const queueClient = await getAnalysisQueue();
      const queue = (queueClient as any).queue;

      if (!queue) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Queue is not initialized',
        });
      }

      const job = await queue.getJob(params.id);

      if (!job) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Job not found',
        });
      }

      // Try to move job to failed state first, then remove
      try {
        const state = await job.getState();

        // If job is active, try to move it to failed first
        if (state === 'active') {
          await job.moveToFailed(new Error('Force deleted by user'), '0', false);
          logger.info(`📍 Moved active job ${params.id} to failed state`);
        }

        // Now try to remove
        await job.remove();
        logger.info(`🗑️  Force removed job ${params.id}`);

        return reply.send({
          success: true,
          message: 'Job force deleted successfully',
        });
      } catch (removeError: any) {
        logger.warn(`⚠️  Could not cleanly remove job ${params.id}, attempting forceful cleanup`);

        // Last resort: try to remove from all possible states
        try {
          await Promise.allSettled([
            job.discard(),
            job.remove(),
          ]);

          logger.info(`🗑️  Forcefully removed job ${params.id}`);
          return reply.send({
            success: true,
            message: 'Job force deleted (with cleanup)',
          });
        } catch (finalError) {
          logger.error(`Failed to force delete job ${params.id}:`, finalError);
          return reply.status(500).send({
            error: 'Delete Failed',
            message: 'Could not force delete the job. Try pausing the queue first.',
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to force delete job:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to force delete job',
      });
    }
  });

  /**
   * POST /queue/clear - Clear completed and failed jobs
   */
  fastify.post('/clear', async (_request, reply) => {
    try {
      const queueClient = await getAnalysisQueue();
      const queue = (queueClient as any).queue;

      if (!queue) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Queue is not initialized',
        });
      }

      // Clear completed and failed jobs older than 1 hour
      const oneHour = 3600 * 1000;
      const [completedJobs, failedJobs] = await Promise.all([
        queue.clean(oneHour, 1000, 'completed'),
        queue.clean(oneHour, 1000, 'failed'),
      ]);

      const totalCleared = completedJobs.length + failedJobs.length;
      logger.info(`🗑️  Cleared ${totalCleared} old jobs (${completedJobs.length} completed, ${failedJobs.length} failed)`);

      return reply.send({
        success: true,
        message: 'Queue cleared successfully',
        cleared: totalCleared,
        completedCleared: completedJobs.length,
        failedCleared: failedJobs.length,
      });
    } catch (error) {
      logger.error('Failed to clear queue:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to clear queue',
      });
    }
  });

  /**
   * POST /queue/pause - Pause queue processing
   */
  fastify.post('/pause', async (_request, reply) => {
    try {
      const queueClient = await getAnalysisQueue();
      const queue = (queueClient as any).queue;

      if (!queue) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Queue is not initialized',
        });
      }

      await queue.pause();
      logger.info('⏸️  Queue paused via API');

      return reply.send({
        success: true,
        message: 'Queue paused successfully',
      });
    } catch (error) {
      logger.error('Failed to pause queue:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to pause queue',
      });
    }
  });

  /**
   * POST /queue/resume - Resume queue processing
   */
  fastify.post('/resume', async (_request, reply) => {
    try {
      const queueClient = await getAnalysisQueue();
      const queue = (queueClient as any).queue;

      if (!queue) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Queue is not initialized',
        });
      }

      await queue.resume();
      logger.info('▶️  Queue resumed via API');

      return reply.send({
        success: true,
        message: 'Queue resumed successfully',
      });
    } catch (error) {
      logger.error('Failed to resume queue:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to resume queue',
      });
    }
  });
}
