/**
 * Worker Processor
 * Main job processing logic with all integrations
 */

import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import {
  AnalysisJobData,
  JobProgress,
  WorkerConfig,
  WorkerStats,
  AnalysisResult,
} from '../types';
import { ContextExtractor } from './context-extractor';
import { ClaudeAnalyzer } from './claude-analyzer';
import { CacheManager } from './cache';
import { RateLimiter } from './rate-limiter';
import { WebSocketEmitter } from './websocket-emitter';
import logger from '../utils/logger';

export class WorkerProcessor {
  private contextExtractor: ContextExtractor;
  private claudeAnalyzer: ClaudeAnalyzer;
  private cacheManager: CacheManager;
  private rateLimiter: RateLimiter;
  private wsEmitter: WebSocketEmitter;
  private prisma: PrismaClient;
  private stats: WorkerStats;
  private config: WorkerConfig;

  constructor(config: WorkerConfig) {
    this.config = config;

    // Initialize components
    this.contextExtractor = new ContextExtractor(config.maxContextTokens);
    this.claudeAnalyzer = new ClaudeAnalyzer(config.anthropicApiKey, {
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });
    this.cacheManager = new CacheManager(
      config.redisUrl,
      config.cacheTTL / 3600000 // Convert ms to hours
    );
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.wsEmitter = new WebSocketEmitter(config.redisUrl);
    this.prisma = new PrismaClient();

    // Initialize stats
    this.stats = {
      jobsProcessed: 0,
      jobsFailed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTokensUsed: 0,
      averageDuration: 0,
      uptime: Date.now(),
    };
  }

  /**
   * Process analysis job
   */
  async processJob(job: Job<AnalysisJobData>): Promise<void> {
    const { projectId, projectPath, projectName, forceRefresh } = job.data;
    const startTime = Date.now();

    logger.info(
      `🚀 Processing job ${job.id} for project ${projectName} (${projectId})`
    );

    try {
      // 1. Emit started event
      await this.wsEmitter.emitStarted(projectId, projectName);
      await this.updateProgress(job, {
        projectId,
        status: 'queued',
        progress: 0,
        message: 'Job queued',
      });

      // 2. Check if project path exists
      await this.validateProjectPath(projectPath);

      // 3. Get last modified time
      const stats = await fs.stat(projectPath);
      const lastModified = stats.mtime;

      // 4. Check cache (unless force refresh)
      let result: AnalysisResult | null = null;

      if (!forceRefresh) {
        await this.updateProgress(job, {
          projectId,
          status: 'extracting',
          progress: 10,
          message: 'Checking cache',
        });

        const cached = await this.cacheManager.get(projectPath, lastModified);
        if (cached) {
          logger.info(`📦 Cache HIT for project ${projectName}`);
          result = cached.result;
          this.stats.cacheHits++;

          // Store in database and emit
          await this.saveToDatabase(result);
          await this.wsEmitter.emitCompleted(result);
          await this.updateProgress(job, {
            projectId,
            status: 'completed',
            progress: 100,
            message: 'Analysis complete (from cache)',
          });

          this.updateStats(Date.now() - startTime, 0);
          return;
        }

        this.stats.cacheMisses++;
      }

      // 5. Extract project context
      await this.updateProgress(job, {
        projectId,
        status: 'extracting',
        progress: 20,
        message: 'Extracting project context',
      });

      const context = await this.withTimeout(
        this.contextExtractor.extractContext(projectPath, projectName),
        30000, // 30s timeout for context extraction
        'Context extraction timeout'
      );

      // Update project with context metadata
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          fileCount: context.fileCount,
          linesOfCode: context.linesOfCode,
          size: BigInt(context.totalSize),
        },
      });

      // 6. Analyze with Claude (with rate limiting and retry)
      await this.updateProgress(job, {
        projectId,
        status: 'analyzing',
        progress: 50,
        message: 'Analyzing with AI',
      });

      result = await this.rateLimiter.execute(
        async () => {
          return await this.withTimeout(
            this.claudeAnalyzer.analyzeProject(context, projectId),
            this.config.timeout,
            'AI analysis timeout'
          );
        },
        {
          onRetry: (attempt, error) => {
            logger.warn(`Retry attempt ${attempt}: ${error.message}`);
          },
        }
      );

      // 7. Cache result
      await this.updateProgress(job, {
        projectId,
        status: 'caching',
        progress: 80,
        message: 'Caching results',
      });

      await this.cacheManager.set(projectPath, lastModified, result);

      // 8. Save to database
      await this.updateProgress(job, {
        projectId,
        status: 'caching',
        progress: 90,
        message: 'Saving to database',
      });

      await this.saveToDatabase(result);

      // 9. Emit completion
      await this.wsEmitter.emitCompleted(result);
      await this.updateProgress(job, {
        projectId,
        status: 'completed',
        progress: 100,
        message: 'Analysis complete',
      });

      // Update stats
      this.updateStats(Date.now() - startTime, result.metadata.tokensUsed);

      logger.info(
        `✅ Job ${job.id} completed in ${Date.now() - startTime}ms ` +
        `(${result.metadata.tokensUsed} tokens)`
      );
    } catch (error: any) {
      this.stats.jobsFailed++;

      logger.error(
        `❌ Job ${job.id} failed: ${error.message}`,
        error.stack
      );

      // Emit failure event
      await this.wsEmitter.emitFailed(projectId, error.message);
      await this.updateProgress(job, {
        projectId,
        status: 'failed',
        progress: 0,
        error: error.message,
      });

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  /**
   * Validate project path exists and is accessible
   */
  private async validateProjectPath(projectPath: string): Promise<void> {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${projectPath}`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Project path does not exist: ${projectPath}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing: ${projectPath}`);
      }
      throw error;
    }
  }

  /**
   * Update job progress
   */
  private async updateProgress(
    job: Job<AnalysisJobData>,
    progress: JobProgress
  ): Promise<void> {
    await job.updateProgress(progress);
    await this.wsEmitter.emitProgress(progress);
  }

  /**
   * Execute function with timeout
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Save analysis result to database
   */
  private async saveToDatabase(result: AnalysisResult): Promise<void> {
    try {
      await this.prisma.projectAnalysis.create({
        data: {
          projectId: result.projectId,
          summary: result.summary,
          techStack: result.techStack as any,
          complexity: result.complexity,
          recommendations: result.recommendations as any,
          completionScore: result.completionScore,
          maturityLevel: result.maturityLevel,
          productionGaps: result.productionGaps as any,
          estimatedValue: result.estimatedValue as any,
          model: result.metadata.model,
          tokensUsed: result.metadata.tokensUsed,
          cacheHit: result.metadata.cacheHit,
        },
      });

      // Update project status
      await this.prisma.project.update({
        where: { id: result.projectId },
        data: {
          status: 'ANALYZED',
          analyzedAt: new Date(),
        },
      });

      logger.debug(`Saved analysis to database for project ${result.projectId}`);
    } catch (error) {
      logger.error(`Failed to save to database: ${error}`);
      throw error;
    }
  }

  /**
   * Update worker statistics
   */
  private updateStats(duration: number, tokensUsed: number): void {
    this.stats.jobsProcessed++;
    this.stats.totalTokensUsed += tokensUsed;

    // Calculate rolling average duration
    const totalDuration = this.stats.averageDuration * (this.stats.jobsProcessed - 1) + duration;
    this.stats.averageDuration = totalDuration / this.stats.jobsProcessed;
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime,
    };
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const [cacheHealthy, wsHealthy, dbHealthy] = await Promise.all([
        this.cacheManager.isHealthy(),
        this.wsEmitter.isHealthy(),
        this.prisma.$queryRaw`SELECT 1`,
      ]);

      return cacheHealthy && wsHealthy && !!dbHealthy;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up worker processor...');

    this.contextExtractor.destroy();
    await this.cacheManager.close();
    await this.wsEmitter.close();
    await this.prisma.$disconnect();

    logger.info('✅ Cleanup complete');
  }
}
