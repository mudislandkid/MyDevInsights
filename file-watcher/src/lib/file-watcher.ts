/**
 * File Watcher Service
 * Main service that monitors directories for project changes
 */

import chokidar, { FSWatcher } from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { WatcherConfig, ProjectMetadata } from '../types';
import { validateProject, isSystemDirectory } from './validator';
import { Debouncer } from '../utils/debounce';
import { RedisPublisher } from './redis-publisher';
import logger from '../utils/logger';

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private config: WatcherConfig;
  private redisPublisher: RedisPublisher;
  private addDebouncer: Debouncer<string>;
  private removeDebouncer: Debouncer<string>;
  private isRunning: boolean = false;
  private errorCount: number = 0;
  private maxErrorCount: number = 100;

  constructor(config: WatcherConfig, redisUrl: string) {
    this.config = config;
    this.redisPublisher = new RedisPublisher(redisUrl);

    // Create debouncers for add and remove events
    this.addDebouncer = new Debouncer<string>(
      (event) => this.handleDebouncedAdd(event.data),
      config.debounceDelay
    );

    this.removeDebouncer = new Debouncer<string>(
      (event) => this.handleDebouncedRemove(event.data),
      config.debounceDelay
    );
  }

  /**
   * Start watching the directory
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('File watcher is already running');
      return;
    }

    try {
      // Verify watch path exists and is accessible
      await this.verifyWatchPath();

      logger.info(`🔍 Starting file watcher on: ${this.config.watchPath}`);

      this.watcher = chokidar.watch(this.config.watchPath, {
        // Watch only immediate subdirectories
        depth: this.config.depth,

        // Ignore patterns
        ignored: [
          /(^|[\/\\])\../,  // Ignore dotfiles
          ...this.config.ignorePatterns.map((pattern) => `**/${pattern}/**`),
        ],

        // Performance options
        persistent: true,
        ignoreInitial: true, // Skip existing directories on startup (prevents duplicate database errors on restart)
        followSymlinks: false, // Don't follow symbolic links

        // Stability options
        awaitWriteFinish: {
          stabilityThreshold: this.config.stabilityThreshold,
          pollInterval: 100,
        },

        // Error handling
        ignorePermissionErrors: true,
      });

      this.setupEventHandlers();
      this.isRunning = true;

      logger.info('✅ File watcher started successfully');
    } catch (error) {
      logger.error('Failed to start file watcher:', error);
      throw error;
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('File watcher is not running');
      return;
    }

    logger.info('🛑 Stopping file watcher...');

    // Flush pending debounced events
    this.addDebouncer.flushAll();
    this.removeDebouncer.flushAll();

    // Close watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Clean up
    this.addDebouncer.destroy();
    this.removeDebouncer.destroy();
    await this.redisPublisher.close();

    this.isRunning = false;
    logger.info('✅ File watcher stopped');
  }

  /**
   * Verify watch path exists and is accessible
   */
  private async verifyWatchPath(): Promise<void> {
    try {
      const stats = await fs.stat(this.config.watchPath);

      if (!stats.isDirectory()) {
        throw new Error(`Watch path is not a directory: ${this.config.watchPath}`);
      }

      // Try to read directory to verify permissions
      await fs.access(this.config.watchPath, fs.constants.R_OK);

      logger.info(`✅ Watch path verified: ${this.config.watchPath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Watch path does not exist: ${this.config.watchPath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied for watch path: ${this.config.watchPath}`);
      }
      throw error;
    }
  }

  /**
   * Set up Chokidar event handlers
   */
  private setupEventHandlers(): void {
    if (!this.watcher) return;

    // Handle new directories
    this.watcher.on('addDir', (dirPath: string) => {
      // Skip root directory and system directories
      if (dirPath === this.config.watchPath || isSystemDirectory(dirPath)) {
        return;
      }

      // Only process immediate subdirectories (depth 1)
      const relativePath = path.relative(this.config.watchPath, dirPath);
      const depth = relativePath.split(path.sep).length;

      if (depth === 1) {
        logger.debug(`📁 Directory added: ${dirPath}`);
        this.addDebouncer.debounce(dirPath, dirPath);
      }
    });

    // Handle removed directories
    this.watcher.on('unlinkDir', (dirPath: string) => {
      if (dirPath === this.config.watchPath || isSystemDirectory(dirPath)) {
        return;
      }

      const relativePath = path.relative(this.config.watchPath, dirPath);
      const depth = relativePath.split(path.sep).length;

      if (depth === 1) {
        logger.debug(`🗑️  Directory removed: ${dirPath}`);
        this.removeDebouncer.debounce(dirPath, dirPath);
      }
    });

    // Handle errors
    this.watcher.on('error', (error: unknown) => {
      this.handleError(error as Error);
    });

    // Ready event
    this.watcher.on('ready', () => {
      logger.info('👀 File watcher is ready and watching...');
    });
  }

  /**
   * Handle debounced directory addition
   */
  private async handleDebouncedAdd(dirPath: string): Promise<void> {
    try {
      logger.debug(`🔍 Validating project: ${dirPath}`);

      // Validate if this is a valid project
      const validation = await validateProject(dirPath);

      if (!validation.isValid) {
        logger.debug(`❌ Not a valid project: ${dirPath} (confidence: ${validation.confidence})`);
        return;
      }

      logger.info(`✅ Valid project detected: ${dirPath} (type: ${validation.projectType})`);

      // Extract metadata
      const metadata = await this.extractMetadata(dirPath, validation);

      // Publish event to Redis
      const published = await this.redisPublisher.publishProjectAdded({
        path: dirPath,
        metadata,
      });

      if (published) {
        logger.info(`📤 Published project:added event for ${metadata.name}`);
      } else {
        logger.warn(`⚠️  Failed to publish event (queued for retry): ${metadata.name}`);
      }

      // Reset error count on success
      this.errorCount = 0;
    } catch (error: any) {
      this.handleError(error, dirPath);
    }
  }

  /**
   * Handle debounced directory removal
   */
  private async handleDebouncedRemove(dirPath: string): Promise<void> {
    try {
      const projectName = path.basename(dirPath);
      logger.info(`🗑️  Project removed: ${projectName}`);

      // Publish event to Redis
      const published = await this.redisPublisher.publishProjectRemoved({
        path: dirPath,
      });

      if (published) {
        logger.info(`📤 Published project:removed event for ${projectName}`);
      } else {
        logger.warn(`⚠️  Failed to publish event (queued for retry): ${projectName}`);
      }

      this.errorCount = 0;
    } catch (error: any) {
      this.handleError(error, dirPath);
    }
  }

  /**
   * Extract project metadata
   */
  private async extractMetadata(
    dirPath: string,
    validation: any
  ): Promise<ProjectMetadata> {
    const name = path.basename(dirPath);

    try {
      // Get file count and size
      const stats = await this.getDirectoryStats(dirPath);

      return {
        path: dirPath,
        name,
        type: validation.projectType,
        framework: validation.framework,
        language: validation.language,
        packageManager: validation.packageManager,
        fileCount: stats.fileCount,
        size: stats.size,
      };
    } catch (error) {
      logger.warn(`Failed to extract full metadata for ${name}:`, error);

      // Return minimal metadata
      return {
        path: dirPath,
        name,
        type: validation.projectType,
        framework: validation.framework,
        language: validation.language,
        packageManager: validation.packageManager,
      };
    }
  }

  /**
   * Get directory statistics (file count and size)
   */
  private async getDirectoryStats(
    dirPath: string
  ): Promise<{ fileCount: number; size: number }> {
    let fileCount = 0;
    let size = 0;

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        // Skip system directories
        if (file.isDirectory() && isSystemDirectory(file.name)) {
          continue;
        }

        if (file.isFile()) {
          fileCount++;
          try {
            const filePath = path.join(dirPath, file.name);
            const stats = await fs.stat(filePath);
            size += stats.size;
          } catch {
            // Ignore individual file errors
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to get directory stats for ${dirPath}:`, error);
    }

    return { fileCount, size };
  }

  /**
   * Handle errors with retry logic
   */
  private handleError(error: Error, context?: string): void {
    this.errorCount++;

    const errorMessage = context
      ? `Error processing ${context}: ${error.message}`
      : `Watcher error: ${error.message}`;

    if (this.errorCount > this.maxErrorCount) {
      logger.error(`❌ Too many errors (${this.errorCount}), stopping watcher`);
      this.stop();
      return;
    }

    // Log error based on severity
    if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
      logger.warn(`⚠️  Permission denied: ${context || 'unknown path'}`);
    } else if (error.message.includes('ENOENT')) {
      logger.debug(`Path no longer exists: ${context || 'unknown path'}`);
    } else {
      logger.error(errorMessage);
    }
  }

  /**
   * Get watcher status
   */
  getStatus(): {
    isRunning: boolean;
    isRedisConnected: boolean;
    pendingEvents: number;
    errorCount: number;
  } {
    return {
      isRunning: this.isRunning,
      isRedisConnected: this.redisPublisher.isReady(),
      pendingEvents:
        this.addDebouncer.getPendingCount() +
        this.removeDebouncer.getPendingCount() +
        this.redisPublisher.getQueueSize(),
      errorCount: this.errorCount,
    };
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return (
      this.isRunning &&
      this.errorCount < this.maxErrorCount &&
      this.watcher !== null
    );
  }
}
