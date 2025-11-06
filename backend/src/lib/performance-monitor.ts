/**
 * Performance Monitoring System
 * Tracks response times, memory usage, and system health metrics
 */

import logger, { logPerformance } from '../utils/logger'

interface PerformanceMetrics {
  requests: {
    total: number
    success: number
    errors: number
    averageResponseTime: number
    slowRequests: number // Requests over 1s
  }
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  system: {
    uptime: number
    nodeVersion: string
    platform: string
  }
  alerts: Alert[]
}

interface Alert {
  type: 'memory' | 'response_time' | 'error_rate'
  severity: 'warning' | 'critical'
  message: string
  timestamp: Date
  value: number
  threshold: number
}

interface RequestMetric {
  path: string
  method: string
  responseTime: number
  statusCode: number
  timestamp: Date
}

export class PerformanceMonitor {
  private requestMetrics: RequestMetric[] = []
  private maxMetricsHistory = 1000 // Keep last 1000 requests
  private alerts: Alert[] = []
  private maxAlerts = 100

  // Thresholds
  private readonly SLOW_REQUEST_THRESHOLD = 1000 // 1 second
  private readonly MEMORY_WARNING_THRESHOLD = 0.85 // 85% of heap
  private readonly MEMORY_CRITICAL_THRESHOLD = 0.95 // 95% of heap
  private readonly ERROR_RATE_THRESHOLD = 0.1 // 10% error rate
  private readonly MIN_HEAP_SIZE_MB = 50 // Only alert if heap is larger than 50MB

  constructor() {
    // Start periodic monitoring
    this.startMonitoring()
  }

  /**
   * Record a request
   */
  recordRequest(
    path: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): void {
    const metric: RequestMetric = {
      path,
      method,
      responseTime,
      statusCode,
      timestamp: new Date(),
    }

    this.requestMetrics.push(metric)

    // Keep only recent metrics
    if (this.requestMetrics.length > this.maxMetricsHistory) {
      this.requestMetrics.shift()
    }

    // Log slow requests
    if (responseTime > this.SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        path,
        method,
        responseTime: `${responseTime}ms`,
        statusCode,
      })

      logPerformance(`Slow ${method} ${path}`, responseTime, {
        statusCode,
        threshold: this.SLOW_REQUEST_THRESHOLD,
      })
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    const recentRequests = this.requestMetrics.slice(-100) // Last 100 requests

    const totalRequests = recentRequests.length
    const successRequests = recentRequests.filter(
      (r) => r.statusCode >= 200 && r.statusCode < 400
    ).length
    const errorRequests = recentRequests.filter(
      (r) => r.statusCode >= 400
    ).length
    const slowRequests = recentRequests.filter(
      (r) => r.responseTime > this.SLOW_REQUEST_THRESHOLD
    ).length

    const averageResponseTime =
      totalRequests > 0
        ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) /
          totalRequests
        : 0

    const memory = process.memoryUsage()

    return {
      requests: {
        total: this.requestMetrics.length,
        success: successRequests,
        errors: errorRequests,
        averageResponseTime: Math.round(averageResponseTime),
        slowRequests,
      },
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
        external: Math.round(memory.external / 1024 / 1024), // MB
        rss: Math.round(memory.rss / 1024 / 1024), // MB
      },
      system: {
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
      },
      alerts: this.alerts.slice(-10), // Last 10 alerts
    }
  }

  /**
   * Check health and generate alerts
   */
  private checkHealth(): void {
    const memory = process.memoryUsage()
    const heapUsageRatio = memory.heapUsed / memory.heapTotal
    const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024)

    // Only check memory usage if heap is large enough to be meaningful
    // Small initial heaps (< 50MB) will naturally have high usage ratios
    if (heapTotalMB >= this.MIN_HEAP_SIZE_MB) {
      // Check memory usage
      if (heapUsageRatio > this.MEMORY_CRITICAL_THRESHOLD) {
        this.addAlert({
          type: 'memory',
          severity: 'critical',
          message: 'Critical memory usage',
          value: heapUsageRatio,
          threshold: this.MEMORY_CRITICAL_THRESHOLD,
        })
        logger.error('Critical memory usage', {
          heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${heapTotalMB}MB`,
          percentage: `${Math.round(heapUsageRatio * 100)}%`,
        })
      } else if (heapUsageRatio > this.MEMORY_WARNING_THRESHOLD) {
        this.addAlert({
          type: 'memory',
          severity: 'warning',
          message: 'High memory usage',
          value: heapUsageRatio,
          threshold: this.MEMORY_WARNING_THRESHOLD,
        })
        logger.warn('High memory usage', {
          heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${heapTotalMB}MB`,
          percentage: `${Math.round(heapUsageRatio * 100)}%`,
        })
      }
    }

    // Check error rate
    const recentRequests = this.requestMetrics.slice(-100)
    if (recentRequests.length >= 10) {
      const errorRate =
        recentRequests.filter((r) => r.statusCode >= 400).length /
        recentRequests.length

      if (errorRate > this.ERROR_RATE_THRESHOLD) {
        this.addAlert({
          type: 'error_rate',
          severity: 'warning',
          message: 'High error rate',
          value: errorRate,
          threshold: this.ERROR_RATE_THRESHOLD,
        })
        logger.warn('High error rate detected', {
          errorRate: `${Math.round(errorRate * 100)}%`,
          threshold: `${Math.round(this.ERROR_RATE_THRESHOLD * 100)}%`,
        })
      }
    }

    // Check for slow requests
    const slowCount = recentRequests.filter(
      (r) => r.responseTime > this.SLOW_REQUEST_THRESHOLD
    ).length

    if (slowCount > recentRequests.length * 0.1 && recentRequests.length >= 10) {
      this.addAlert({
        type: 'response_time',
        severity: 'warning',
        message: 'High number of slow requests',
        value: slowCount / recentRequests.length,
        threshold: 0.1,
      })
    }
  }

  /**
   * Add alert
   */
  private addAlert(
    alert: Omit<Alert, 'timestamp'>
  ): void {
    this.alerts.push({
      ...alert,
      timestamp: new Date(),
    })

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift()
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Check health every 30 seconds
    setInterval(() => {
      this.checkHealth()
    }, 30000)

    // Log metrics every 5 minutes
    setInterval(() => {
      const metrics = this.getMetrics()
      logger.info('Performance metrics', {
        requests: metrics.requests,
        memory: metrics.memory,
        uptime: `${metrics.system.uptime}s`,
      })
    }, 300000)

    logger.info('Performance monitoring started')
  }

  /**
   * Get performance summary
   */
  getSummary(): string {
    const metrics = this.getMetrics()

    const lines: string[] = [
      '=== Performance Summary ===',
      '',
      'Requests:',
      `  Total: ${metrics.requests.total}`,
      `  Success: ${metrics.requests.success}`,
      `  Errors: ${metrics.requests.errors}`,
      `  Avg Response Time: ${metrics.requests.averageResponseTime}ms`,
      `  Slow Requests: ${metrics.requests.slowRequests}`,
      '',
      'Memory:',
      `  Heap Used: ${metrics.memory.heapUsed}MB / ${metrics.memory.heapTotal}MB`,
      `  RSS: ${metrics.memory.rss}MB`,
      `  External: ${metrics.memory.external}MB`,
      '',
      'System:',
      `  Uptime: ${metrics.system.uptime}s`,
      `  Node: ${metrics.system.nodeVersion}`,
      `  Platform: ${metrics.system.platform}`,
      '',
      `Active Alerts: ${metrics.alerts.length}`,
    ]

    return lines.join('\n')
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.requestMetrics = []
    this.alerts = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()
