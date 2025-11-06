/**
 * Debounce Utility
 * Handles rapid file system changes with configurable delay
 */

export interface DebouncedEvent<T> {
  key: string;
  data: T;
  timestamp: number;
}

/**
 * Debouncer class for batching rapid events
 */
export class Debouncer<T> {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private pendingEvents: Map<string, DebouncedEvent<T>> = new Map();
  private readonly delay: number;
  private readonly callback: (event: DebouncedEvent<T>) => void;

  constructor(callback: (event: DebouncedEvent<T>) => void, delay: number = 2000) {
    this.callback = callback;
    this.delay = delay;
  }

  /**
   * Add an event to the debounce queue
   * If the same key is added multiple times, only the last one will be processed
   */
  debounce(key: string, data: T): void {
    // Clear existing timer for this key
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store the event
    this.pendingEvents.set(key, {
      key,
      data,
      timestamp: Date.now(),
    });

    // Create new timer
    const timer = setTimeout(() => {
      const event = this.pendingEvents.get(key);
      if (event) {
        this.callback(event);
        this.pendingEvents.delete(key);
        this.timers.delete(key);
      }
    }, this.delay);

    this.timers.set(key, timer);
  }

  /**
   * Force immediate processing of pending event
   */
  flush(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    const event = this.pendingEvents.get(key);
    if (event) {
      this.callback(event);
      this.pendingEvents.delete(key);
    }
  }

  /**
   * Force processing of all pending events
   */
  flushAll(): void {
    for (const key of this.pendingEvents.keys()) {
      this.flush(key);
    }
  }

  /**
   * Cancel a pending event
   */
  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.pendingEvents.delete(key);
  }

  /**
   * Cancel all pending events
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pendingEvents.clear();
  }

  /**
   * Get number of pending events
   */
  getPendingCount(): number {
    return this.pendingEvents.size;
  }

  /**
   * Check if a key has a pending event
   */
  hasPending(key: string): boolean {
    return this.pendingEvents.has(key);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cancelAll();
  }
}

/**
 * Simple debounce function for single callbacks
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}
