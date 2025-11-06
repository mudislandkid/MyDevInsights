/**
 * WebSocket Event Emitter
 * Emits real-time updates via Redis pub/sub for WebSocket server
 */

import Redis from 'ioredis';
import { AnalysisResult, JobProgress } from '../types';
import logger from '../utils/logger';

export interface WebSocketEvent {
  type: 'analysis:started' | 'analysis:progress' | 'analysis:completed' | 'analysis:failed';
  projectId: string;
  data: any;
  timestamp: Date;
}

export class WebSocketEmitter {
  private publisher: Redis;
  private channel: string = 'websocket:events';

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl);

    this.publisher.on('error', (error) => {
      logger.error(`WebSocket emitter error: ${error.message}`);
    });

    this.publisher.on('connect', () => {
      logger.info('✅ WebSocket emitter connected to Redis');
    });
  }

  /**
   * Emit analysis started event
   */
  async emitStarted(projectId: string, projectName: string): Promise<boolean> {
    const event: WebSocketEvent = {
      type: 'analysis:started',
      projectId,
      data: { projectName, status: 'started' },
      timestamp: new Date(),
    };

    return await this.emit(event);
  }

  /**
   * Emit analysis progress event
   */
  async emitProgress(progress: JobProgress): Promise<boolean> {
    const event: WebSocketEvent = {
      type: 'analysis:progress',
      projectId: progress.projectId,
      data: progress,
      timestamp: new Date(),
    };

    return await this.emit(event);
  }

  /**
   * Emit analysis completed event
   */
  async emitCompleted(result: AnalysisResult): Promise<boolean> {
    const event: WebSocketEvent = {
      type: 'analysis:completed',
      projectId: result.projectId,
      data: {
        summary: result.summary,
        complexity: result.complexity,
        techStack: result.techStack,
        metadata: result.metadata,
      },
      timestamp: new Date(),
    };

    return await this.emit(event);
  }

  /**
   * Emit analysis failed event
   */
  async emitFailed(projectId: string, error: string): Promise<boolean> {
    const event: WebSocketEvent = {
      type: 'analysis:failed',
      projectId,
      data: { error },
      timestamp: new Date(),
    };

    return await this.emit(event);
  }

  /**
   * Emit event to Redis pub/sub
   */
  private async emit(event: WebSocketEvent): Promise<boolean> {
    try {
      const payload = JSON.stringify(event);
      const subscribers = await this.publisher.publish(this.channel, payload);

      logger.debug(
        `📡 Emitted ${event.type} for project ${event.projectId} ` +
        `(${subscribers} subscribers)`
      );

      return true;
    } catch (error) {
      logger.error(`Failed to emit event: ${error}`);
      return false;
    }
  }

  /**
   * Close publisher connection
   */
  async close(): Promise<void> {
    await this.publisher.quit();
    logger.info('WebSocket emitter closed');
  }

  /**
   * Check if emitter is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.publisher.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}
