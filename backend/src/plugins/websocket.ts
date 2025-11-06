/**
 * WebSocket plugin for real-time updates
 */

import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import Redis from 'ioredis';
import logger from '../utils/logger';

export interface WebSocketMessage {
  type: 'project:added' | 'project:updated' | 'project:removed' | 'analysis:started' | 'analysis:progress' | 'analysis:completed' | 'analysis:failed';
  projectId: string;
  data?: any;
  timestamp: Date;
}

export async function websocketPlugin(fastify: FastifyInstance) {
  const clients: Set<WebSocket> = new Set();
  const subscriber = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

  // Subscribe to Redis events
  await subscriber.subscribe('websocket:events');

  subscriber.on('message', (channel, message) => {
    if (channel === 'websocket:events') {
      try {
        const event = JSON.parse(message);
        broadcast(event);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
      }
    }
  });

  /**
   * Broadcast message to all connected clients
   */
  function broadcast(message: WebSocketMessage) {
    const payload = JSON.stringify(message);
    let sent = 0;
    let failed = 0;

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
          sent++;
        } catch (error) {
          logger.error('Failed to send WebSocket message:', error);
          failed++;
        }
      }
    });

    if (sent > 0) {
      logger.debug(`Broadcast ${message.type} to ${sent} clients (${failed} failed)`);
    }
  }

  /**
   * WebSocket route handler
   */
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const { socket } = connection;

    // Add client to set
    clients.add(socket);
    logger.info(`WebSocket client connected from ${req.ip} (${clients.size} total)`);

    // Keep-alive ping interval
    const pingInterval = setInterval(() => {
      if (socket.readyState === 1) { // OPEN
        try {
          socket.ping();
        } catch (error) {
          logger.error('Failed to send ping:', error);
          clearInterval(pingInterval);
        }
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds

    // Send welcome message
    try {
      socket.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Project Viewer',
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('Failed to send welcome message:', error);
    }

    // Handle pong responses
    socket.on('pong', () => {
      logger.debug('Received pong from client');
    });

    // Handle messages from client (optional)
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        logger.debug('WebSocket message received:', data);

        // Echo back or handle specific client messages
        if (data.type === 'ping') {
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString(),
          }));
        }
      } catch (error) {
        logger.error('Invalid WebSocket message:', error);
      }
    });

    // Handle disconnect
    socket.on('close', (code, reason) => {
      clearInterval(pingInterval);
      clients.delete(socket);
      logger.info(`WebSocket client disconnected (${clients.size} remaining)`, {
        code,
        reason: reason.toString()
      });
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      clearInterval(pingInterval);
      logger.error('WebSocket error:', error);
      clients.delete(socket);
    });
  });

  // Cleanup on server close
  fastify.addHook('onClose', async () => {
    logger.info('Closing WebSocket connections...');

    clients.forEach((client) => {
      client.close(1000, 'Server shutting down');
    });

    await subscriber.quit();

    logger.info('WebSocket plugin cleaned up');
  });

  logger.info('WebSocket plugin registered at /ws');
}
