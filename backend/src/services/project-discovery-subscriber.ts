/**
 * Project Discovery Subscriber
 * Listens to Redis events from file-watcher and processes new projects
 */

import * as fs from 'fs/promises';
import Redis from 'ioredis';
import { MetadataExtractor, DatabaseService } from './metadata';
import { WebSocketPublisher } from '../lib/websocket-publisher';
import logger from '../utils/logger';

interface ProjectEvent {
  type: 'added' | 'removed';
  path: string;
  metadata?: {
    name: string;
    projectType: string;
    framework?: string;
  };
  timestamp: Date;
}

export class ProjectDiscoverySubscriber {
  private subscriber: Redis;
  private metadataExtractor: MetadataExtractor;
  private databaseService: DatabaseService;
  private websocketPublisher: WebSocketPublisher;
  private isRunning: boolean = false;

  constructor(redisUrl: string) {
    this.subscriber = new Redis(redisUrl);
    this.metadataExtractor = new MetadataExtractor();
    this.databaseService = new DatabaseService();
    this.websocketPublisher = new WebSocketPublisher(redisUrl);

    this.setupEventHandlers();
  }

  /**
   * Set up Redis event handlers
   */
  private setupEventHandlers(): void {
    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error:', error);
    });

    this.subscriber.on('connect', () => {
      logger.info('✅ Redis subscriber connected');
    });

    this.subscriber.on('ready', () => {
      logger.info('📡 Redis subscriber ready to receive events');
    });

    this.subscriber.on('reconnecting', () => {
      logger.warn('🔄 Redis subscriber reconnecting...');
    });
  }

  /**
   * Start listening to project discovery events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Subscriber already running');
      return;
    }

    logger.info('🚀 Starting project discovery subscriber...');

    // Subscribe to channels
    await this.subscriber.subscribe('project:added', 'project:removed');

    // Handle messages
    this.subscriber.on('message', async (channel, message) => {
      try {
        const event: ProjectEvent = JSON.parse(message);

        if (channel === 'project:added') {
          await this.handleProjectAdded(event);
        } else if (channel === 'project:removed') {
          await this.handleProjectRemoved(event);
        }
      } catch (error) {
        logger.error('Error processing message:', error);
      }
    });

    this.isRunning = true;
    logger.info('✅ Subscriber started and listening for events');
  }

  /**
   * Handle project added event
   */
  private async handleProjectAdded(event: ProjectEvent): Promise<void> {
    logger.info(`📦 New project discovered: ${event.path}`);

    try {
      // Trust file-watcher validation (it has enhanced detection logic)
      // Just verify the directory still exists
      try {
        await fs.access(event.path);
      } catch {
        logger.warn(`Project path no longer accessible: ${event.path}`);
        return;
      }

      // Extract metadata
      logger.info(`🔍 Extracting metadata for: ${event.path}`);
      const metadata = await this.metadataExtractor.extractMetadata(event.path);

      // Save to database
      logger.info(`💾 Saving project to database: ${metadata.name}`);
      const project = await this.databaseService.createProjectSafe(metadata);

      if (project.created) {
        logger.info(`✅ New project created: ${project.project.name} (${project.project.id})`);

        // Publish WebSocket event for new project
        await this.websocketPublisher.publishProjectAdded(project.project.id, {
          name: project.project.name,
          path: project.project.path,
          status: project.project.status,
        });
      } else {
        logger.info(`♻️  Project already exists: ${project.project.name} (${project.project.id})`);

        // Still notify about update
        await this.websocketPublisher.publishProjectUpdated(project.project.id, {
          name: project.project.name,
          path: project.project.path,
          status: project.project.status,
        });
      }

      // TODO: Optionally trigger AI analysis job here
      // await this.queueAnalysisJob(project.project.id);

    } catch (error: any) {
      logger.error(`❌ Failed to process project ${event.path}:`, error.message);
    }
  }

  /**
   * Handle project removed event
   */
  private async handleProjectRemoved(event: ProjectEvent): Promise<void> {
    logger.info(`🗑️  Project removed: ${event.path}`);

    try {
      const project = await this.databaseService.markProjectRemoved(event.path);

      if (project) {
        logger.info(`✅ Project marked as removed: ${event.path}`);

        // Publish WebSocket event for project removal
        await this.websocketPublisher.publishProjectRemoved(project.id);
      } else {
        logger.warn(`Project not found for removal: ${event.path}`);
      }
    } catch (error: any) {
      logger.error(`❌ Failed to mark project as removed ${event.path}:`, error.message);
    }
  }

  /**
   * Stop subscriber
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping project discovery subscriber...');

    this.isRunning = false;
    await this.subscriber.unsubscribe();
    await this.subscriber.quit();
    await this.databaseService.disconnect();

    logger.info('✅ Subscriber stopped');
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const redisHealthy = this.subscriber.status === 'ready';
      const dbHealthy = await this.databaseService.healthCheck();
      return redisHealthy && dbHealthy;
    } catch {
      return false;
    }
  }

  /**
   * Get subscriber status
   */
  getStatus(): {
    isRunning: boolean;
    redisStatus: string;
  } {
    return {
      isRunning: this.isRunning,
      redisStatus: this.subscriber.status,
    };
  }
}
