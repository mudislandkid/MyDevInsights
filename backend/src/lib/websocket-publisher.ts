/**
 * WebSocket Event Publisher
 * Publishes events to Redis for WebSocket broadcasting
 */

import Redis from 'ioredis'
import logger from '../utils/logger'

export interface WebSocketEvent {
  type: 'project:added' | 'project:updated' | 'project:removed' | 'analysis:started' | 'analysis:progress' | 'analysis:completed' | 'analysis:failed'
  projectId: string
  data?: any
  timestamp: Date
}

export class WebSocketPublisher {
  private publisher: Redis
  private isConnected: boolean = false

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3,
    })

    this.publisher.on('connect', () => {
      logger.info('✅ WebSocket publisher connected to Redis')
      this.isConnected = true
    })

    this.publisher.on('error', (error) => {
      logger.error('❌ WebSocket publisher Redis error:', error.message)
      this.isConnected = false
    })

    this.publisher.on('close', () => {
      logger.warn('⚠️  WebSocket publisher Redis connection closed')
      this.isConnected = false
    })
  }

  /**
   * Publish WebSocket event
   */
  async publish(event: Omit<WebSocketEvent, 'timestamp'>): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, cannot publish WebSocket event')
        return false
      }

      const fullEvent: WebSocketEvent = {
        ...event,
        timestamp: new Date(),
      }

      const message = JSON.stringify(fullEvent)
      const result = await this.publisher.publish('websocket:events', message)

      logger.debug(`Published WebSocket event: ${event.type} (${result} subscribers)`)
      return result >= 0
    } catch (error) {
      logger.error('Failed to publish WebSocket event:', error)
      return false
    }
  }

  /**
   * Publish project added event
   */
  async publishProjectAdded(projectId: string, data?: any): Promise<boolean> {
    return this.publish({
      type: 'project:added',
      projectId,
      data,
    })
  }

  /**
   * Publish project updated event
   */
  async publishProjectUpdated(projectId: string, data?: any): Promise<boolean> {
    return this.publish({
      type: 'project:updated',
      projectId,
      data,
    })
  }

  /**
   * Publish project removed event
   */
  async publishProjectRemoved(projectId: string): Promise<boolean> {
    return this.publish({
      type: 'project:removed',
      projectId,
    })
  }

  /**
   * Publish analysis started event
   */
  async publishAnalysisStarted(projectId: string, data?: any): Promise<boolean> {
    return this.publish({
      type: 'analysis:started',
      projectId,
      data,
    })
  }

  /**
   * Publish analysis progress event
   */
  async publishAnalysisProgress(projectId: string, data?: any): Promise<boolean> {
    return this.publish({
      type: 'analysis:progress',
      projectId,
      data,
    })
  }

  /**
   * Publish analysis completed event
   */
  async publishAnalysisCompleted(projectId: string, data?: any): Promise<boolean> {
    return this.publish({
      type: 'analysis:completed',
      projectId,
      data,
    })
  }

  /**
   * Publish analysis failed event
   */
  async publishAnalysisFailed(projectId: string, data?: any): Promise<boolean> {
    return this.publish({
      type: 'analysis:failed',
      projectId,
      data,
    })
  }

  /**
   * Check if publisher is ready
   */
  isReady(): boolean {
    return this.isConnected && this.publisher.status === 'ready'
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.publisher.quit()
  }
}

// Create singleton instance
export const websocketPublisher = new WebSocketPublisher(
  process.env.REDIS_URL || 'redis://redis:6379'
)
