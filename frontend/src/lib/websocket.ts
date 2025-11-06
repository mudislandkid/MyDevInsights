import type { WebSocketMessage } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'
const isDev = import.meta.env.DEV

// Development-only logging helper
const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}

const devError = (...args: unknown[]) => {
  if (isDev) console.error(...args)
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> =
    new Map()

  connect() {
    // Don't reconnect if already open or connecting
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    try {
      this.ws = new WebSocket(WS_URL)
      devLog('Connecting to WebSocket:', WS_URL)

      this.ws.onopen = () => {
        devLog('WebSocket connected')
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.emit(message.type, message)
        } catch (error) {
          devError('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        devError('WebSocket error:', error)
      }

      this.ws.onclose = (event) => {
        devLog('WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        })
        this.attemptReconnect()
      }
    } catch (error) {
      devError('Failed to connect to WebSocket:', error)
      this.attemptReconnect()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      devError('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    devLog(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    )

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  on(event: string, callback: (message: WebSocketMessage) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    return () => {
      this.off(event, callback)
    }
  }

  off(event: string, callback: (message: WebSocketMessage) => void) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  private emit(event: string, message: WebSocketMessage) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(message))
    }

    // Also emit to wildcard listeners
    const wildcardCallbacks = this.listeners.get('*')
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach((callback) => callback(message))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const wsClient = new WebSocketClient()
