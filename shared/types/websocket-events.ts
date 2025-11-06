/**
 * WebSocket Event Types
 * Real-time communication between backend and frontend
 */

import { SerializedProject, SerializedProjectAnalysis, ProjectStatus } from './index';

// ============================================================================
// Event Names
// ============================================================================

/**
 * All possible WebSocket event types
 */
export enum WebSocketEventType {
  // Client → Server events
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  PING = 'ping',

  // Server → Client events
  PROJECT_DISCOVERED = 'project:discovered',
  PROJECT_UPDATED = 'project:updated',
  PROJECT_DELETED = 'project:deleted',
  ANALYSIS_STARTED = 'analysis:started',
  ANALYSIS_COMPLETED = 'analysis:completed',
  ANALYSIS_FAILED = 'analysis:failed',
  PONG = 'pong',
  ERROR = 'error',
  CONNECTED = 'connected',
}

// ============================================================================
// Base Event Structure
// ============================================================================

/**
 * Base WebSocket message structure
 */
export interface BaseWebSocketMessage<T = any> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
  id?: string;  // Message ID for tracking
}

// ============================================================================
// Client → Server Events
// ============================================================================

/**
 * Subscribe to specific project updates
 */
export interface SubscribeEvent {
  projectIds?: string[];  // Empty = subscribe to all
  eventTypes?: WebSocketEventType[];
}

/**
 * Unsubscribe from updates
 */
export interface UnsubscribeEvent {
  projectIds?: string[];
}

/**
 * Ping to keep connection alive
 */
export interface PingEvent {
  timestamp: string;
}

// ============================================================================
// Server → Client Events
// ============================================================================

/**
 * New project discovered by file watcher
 */
export interface ProjectDiscoveredEvent {
  project: SerializedProject;
}

/**
 * Project metadata updated
 */
export interface ProjectUpdatedEvent {
  project: SerializedProject;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

/**
 * Project deleted/archived
 */
export interface ProjectDeletedEvent {
  projectId: string;
  archived: boolean;  // true = archived, false = hard deleted
}

/**
 * AI analysis started for a project
 */
export interface AnalysisStartedEvent {
  projectId: string;
  jobId: string;
  estimatedDuration?: number;  // seconds
}

/**
 * AI analysis completed successfully
 */
export interface AnalysisCompletedEvent {
  projectId: string;
  analysis: SerializedProjectAnalysis;
  duration: number;  // actual duration in seconds
}

/**
 * AI analysis failed
 */
export interface AnalysisFailedEvent {
  projectId: string;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Pong response to ping
 */
export interface PongEvent {
  timestamp: string;
}

/**
 * Connection established
 */
export interface ConnectedEvent {
  clientId: string;
  serverTime: string;
}

/**
 * Error event
 */
export interface ErrorEvent {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for WebSocket messages
 */
export function isWebSocketMessage(data: any): data is BaseWebSocketMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'payload' in data &&
    'timestamp' in data
  );
}

/**
 * Type guard for specific event types
 */
export function isEventType<T extends WebSocketEventType>(
  message: BaseWebSocketMessage,
  type: T
): message is BaseWebSocketMessage<
  T extends WebSocketEventType.PROJECT_DISCOVERED ? ProjectDiscoveredEvent :
  T extends WebSocketEventType.PROJECT_UPDATED ? ProjectUpdatedEvent :
  T extends WebSocketEventType.PROJECT_DELETED ? ProjectDeletedEvent :
  T extends WebSocketEventType.ANALYSIS_STARTED ? AnalysisStartedEvent :
  T extends WebSocketEventType.ANALYSIS_COMPLETED ? AnalysisCompletedEvent :
  T extends WebSocketEventType.ANALYSIS_FAILED ? AnalysisFailedEvent :
  T extends WebSocketEventType.CONNECTED ? ConnectedEvent :
  T extends WebSocketEventType.ERROR ? ErrorEvent :
  any
> {
  return message.type === type;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a WebSocket message
 */
export function createWebSocketMessage<T>(
  type: WebSocketEventType,
  payload: T,
  id?: string
): BaseWebSocketMessage<T> {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
    id: id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

/**
 * Parse WebSocket message from string
 */
export function parseWebSocketMessage(data: string): BaseWebSocketMessage | null {
  try {
    const parsed = JSON.parse(data);
    return isWebSocketMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Serialize WebSocket message to string
 */
export function serializeWebSocketMessage(message: BaseWebSocketMessage): string {
  return JSON.stringify(message);
}
