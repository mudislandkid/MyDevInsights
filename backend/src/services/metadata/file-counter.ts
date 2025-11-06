/**
 * File Counter
 * Recursively counts files with configurable exclusions
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileCountResult {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number; // bytes
  filesByExtension: Record<string, number>;
  largestFiles: Array<{ path: string; size: number }>;
  averageFileSize: number;
}

const DEFAULT_EXCLUSIONS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  'target',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  'coverage',
  '.cache',
  '.parcel-cache',
  '.turbo',
  '.vercel',
  '.netlify',
  'public/build',
];

export class FileCounter {
  private exclusions: string[];

  constructor(exclusions: string[] = DEFAULT_EXCLUSIONS) {
    this.exclusions = exclusions;
  }

  /**
   * Count all files in project recursively
   */
  async countFiles(projectPath: string, maxDepth: number = 10): Promise<FileCountResult> {
    const result: FileCountResult = {
      totalFiles: 0,
      totalDirectories: 0,
      totalSize: 0,
      filesByExtension: {},
      largestFiles: [],
      averageFileSize: 0,
    };

    await this.scanDirectory(projectPath, result, 0, maxDepth);

    // Calculate average
    if (result.totalFiles > 0) {
      result.averageFileSize = result.totalSize / result.totalFiles;
    }

    // Sort largest files
    result.largestFiles.sort((a, b) => b.size - a.size).splice(10); // Keep top 10

    return result;
  }

  /**
   * Recursively scan directory
   */
  private async scanDirectory(
    dirPath: string,
    result: FileCountResult,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth >= maxDepth) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }

          result.totalDirectories++;
          await this.scanDirectory(fullPath, result, depth + 1, maxDepth);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);

            result.totalFiles++;
            result.totalSize += stats.size;

            // Track by extension
            const ext = path.extname(entry.name).toLowerCase() || '.none';
            result.filesByExtension[ext] = (result.filesByExtension[ext] || 0) + 1;

            // Track large files
            if (result.largestFiles.length < 10 || stats.size > result.largestFiles[9].size) {
              result.largestFiles.push({
                path: relativePath,
                size: stats.size,
              });
              if (result.largestFiles.length > 10) {
                result.largestFiles.sort((a, b) => b.size - a.size).splice(10);
              }
            }
          } catch (error) {
            // Permission error or file disappeared, skip
          }
        }
      }
    } catch (error) {
      // Permission denied or directory doesn't exist
    }
  }

  /**
   * Check if directory should be skipped
   */
  private shouldSkipDirectory(dirName: string): boolean {
    // Skip hidden directories
    if (dirName.startsWith('.') && dirName !== '.github') {
      return true;
    }

    // Skip explicitly excluded directories
    return this.exclusions.includes(dirName);
  }

  /**
   * Count files by type (source, config, docs, etc.)
   */
  async countByType(projectPath: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {
      source: 0,
      test: 0,
      config: 0,
      documentation: 0,
      assets: 0,
      other: 0,
    };

    const result = await this.countFiles(projectPath);

    const typeMap: Record<string, string> = {
      // Source files
      '.ts': 'source',
      '.tsx': 'source',
      '.js': 'source',
      '.jsx': 'source',
      '.py': 'source',
      '.rs': 'source',
      '.go': 'source',
      '.java': 'source',
      '.php': 'source',
      '.rb': 'source',
      '.cs': 'source',
      '.cpp': 'source',
      '.c': 'source',
      '.swift': 'source',
      '.kt': 'source',
      '.scala': 'source',

      // Test files (this is approximate - better detection would parse filenames)
      '.test.ts': 'test',
      '.test.js': 'test',
      '.spec.ts': 'test',
      '.spec.js': 'test',

      // Config files
      '.json': 'config',
      '.yaml': 'config',
      '.yml': 'config',
      '.toml': 'config',
      '.xml': 'config',
      '.ini': 'config',
      '.env': 'config',

      // Documentation
      '.md': 'documentation',
      '.txt': 'documentation',
      '.rst': 'documentation',
      '.adoc': 'documentation',

      // Assets
      '.png': 'assets',
      '.jpg': 'assets',
      '.jpeg': 'assets',
      '.gif': 'assets',
      '.svg': 'assets',
      '.ico': 'assets',
      '.woff': 'assets',
      '.woff2': 'assets',
      '.ttf': 'assets',
      '.eot': 'assets',
      '.mp4': 'assets',
      '.webm': 'assets',
      '.mp3': 'assets',
      '.wav': 'assets',
    };

    for (const [ext, count] of Object.entries(result.filesByExtension)) {
      const type = typeMap[ext] || 'other';
      counts[type] += count;
    }

    return counts;
  }

  /**
   * Get quick stats (fast, less detailed)
   */
  async getQuickStats(projectPath: string): Promise<{
    fileCount: number;
    directoryCount: number;
    estimatedSize: number;
  }> {
    let fileCount = 0;
    let directoryCount = 0;
    let estimatedSize = 0;

    const scanQuick = async (dirPath: string, depth: number): Promise<void> => {
      if (depth >= 3) return; // Shallow scan

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
            directoryCount++;
            await scanQuick(path.join(dirPath, entry.name), depth + 1);
          } else if (entry.isFile()) {
            fileCount++;
            estimatedSize += 50000; // Estimate 50KB per file
          }
        }
      } catch {
        // Skip on error
      }
    };

    await scanQuick(projectPath, 0);

    return {
      fileCount,
      directoryCount,
      estimatedSize,
    };
  }

  /**
   * Format file size to human readable string
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }
}
