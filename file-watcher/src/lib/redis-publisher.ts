/**
 * Redis Publisher
 * Publishes project events to Redis pub/sub channels
 */

import Redis from 'ioredis';
import { ProjectEvent } from '../types';
import logger from '../utils/logger';

export class RedisPublisher {
  private client: Redis;
  private isConnected: boolean = false;
  private eventQueue: ProjectEvent[] = [];
  private maxQueueSize: number = 1000;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNREFUSED'];
        return targetErrors.some((targetError) => err.message.includes(targetError));
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
      this.flushQueue();
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  /**
   * Publish project added event
   */
  async publishProjectAdded(event: Omit<ProjectEvent, 'type' | 'timestamp'>): Promise<boolean> {
    const fullEvent: ProjectEvent = {
      ...event,
      type: 'added',
      timestamp: new Date(),
    };

    return await this.publish('project:added', fullEvent);
  }

  /**
   * Publish project removed event
   */
  async publishProjectRemoved(event: Omit<ProjectEvent, 'type' | 'timestamp'>): Promise<boolean> {
    const fullEvent: ProjectEvent = {
      ...event,
      type: 'removed',
      timestamp: new Date(),
    };

    return await this.publish('project:removed', fullEvent);
  }

  /**
   * Publish event to Redis channel
   */
  private async publish(channel: string, event: ProjectEvent): Promise<boolean> {
    try {
      if (!this.isConnected) {
        // Queue event if not connected
        this.queueEvent(event);
        return false;
      }

      const message = JSON.stringify(event);
      const result = await this.client.publish(channel, message);

      // result is the number of subscribers that received the message
      return result >= 0;
    } catch (error) {
      logger.error(`Failed to publish to ${channel}:`, error);
      this.queueEvent(event);
      return false;
    }
  }

  /**
   * Queue event for later processing when connection is restored
   */
  private queueEvent(event: ProjectEvent): void {
    if (this.eventQueue.length >= this.maxQueueSize) {
      // Remove oldest event to make room
      this.eventQueue.shift();
      logger.warn('Event queue full, dropping oldest event');
    }

    this.eventQueue.push(event);
  }

  /**
   * Flush queued events after reconnection
   */
  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    logger.info(`Flushing ${this.eventQueue.length} queued events...`);

    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      const channel = event.type === 'added' ? 'project:added' : 'project:removed';
      await this.publish(channel, event);
    }

    logger.info('Queue flushed');
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Force disconnect (for emergencies)
   */
  disconnect(): void {
    this.client.disconnect();
  }
}
