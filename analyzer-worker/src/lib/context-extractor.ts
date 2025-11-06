/**
 * Project Context Extractor
 * Extracts relevant project information while respecting token limits
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { encoding_for_model } from 'tiktoken';
import { ProjectContext, FileContent } from '../types';
import logger from '../utils/logger';
import { countProjectLines } from '../utils/line-counter';

// File extensions to analyze by language
const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py'],
  rust: ['.rs'],
  go: ['.go'],
  java: ['.java'],
  php: ['.php'],
  ruby: ['.rb'],
  csharp: ['.cs'],
  cpp: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
  c: ['.c', '.h'],
};

// Files to prioritize for analysis
const PRIORITY_FILES = [
  'README.md',
  'README.txt',
  'CLAUDE.md',
  'claude.md',
  'PRD.md',
  'prd.md',
  'ARCHITECTURE.md',
  'architecture.md',
  'package.json',
  'requirements.txt',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'composer.json',
  'Gemfile',
  '.csproj',
  'tsconfig.json',
  'vite.config.ts',
  'next.config.js',
  'nuxt.config.ts',
];

// Directories to skip
const SKIP_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '__pycache__',
  '.next',
  'out',
  'target',
  'vendor',
  '.vscode',
  '.idea',
];

export class ContextExtractor {
  private encoder: any;
  private maxTokens: number;

  constructor(maxTokens: number = 10000) {
    this.maxTokens = maxTokens;
    // Use cl100k_base encoding (used by GPT-4 and Claude)
    this.encoder = encoding_for_model('gpt-4');
  }

  /**
   * Extract project context with token limiting
   */
  async extractContext(projectPath: string, projectName: string): Promise<ProjectContext> {
    const startTime = Date.now();
    logger.info(`📂 Extracting context for project: ${projectName}`);

    const context: ProjectContext = {
      name: projectName,
      path: projectPath,
      mainFiles: [],
      fileCount: 0,
      linesOfCode: 0,
      totalSize: 0,
      estimatedTokens: 0,
    };

    try {
      // 1. Extract README
      context.readme = await this.extractReadme(projectPath);
      if (context.readme) {
        context.estimatedTokens += this.countTokens(context.readme);
      }

      // 2. Extract package.json or equivalent
      context.packageJson = await this.extractPackageInfo(projectPath);
      if (context.packageJson) {
        context.estimatedTokens += this.countTokens(JSON.stringify(context.packageJson));
      }

      // 3. Get file list and stats
      const allFiles = await this.getAllFiles(projectPath);
      context.fileCount = allFiles.length;

      // 4. Count lines of code
      logger.debug('📊 Counting lines of code...');
      context.linesOfCode = await countProjectLines(projectPath);

      // 5. Extract main source files (prioritized and token-limited)
      // Pass remaining tokens after README and package.json
      const tokensUsed = context.estimatedTokens;
      context.mainFiles = await this.extractMainFiles(projectPath, allFiles, tokensUsed);

      // Calculate total size
      context.totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      const duration = Date.now() - startTime;
      logger.info(
        `✅ Context extracted: ${context.fileCount} files, ${context.linesOfCode} LOC, ~${context.estimatedTokens} tokens (${duration}ms)`
      );

      return context;
    } catch (error) {
      logger.error(`Failed to extract context: ${error}`);
      throw error;
    }
  }

  /**
   * Extract README content
   */
  private async extractReadme(projectPath: string): Promise<string | undefined> {
    const readmeFiles = ['README.md', 'README.txt', 'README', 'readme.md'];

    for (const filename of readmeFiles) {
      try {
        const filePath = path.join(projectPath, filename);
        const content = await fs.readFile(filePath, 'utf-8');

        // Limit README to 2000 tokens
        return this.truncateToTokens(content, 2000);
      } catch (error) {
        // Try next filename
      }
    }

    return undefined;
  }

  /**
   * Extract package.json or equivalent metadata
   */
  private async extractPackageInfo(
    projectPath: string
  ): Promise<Record<string, any> | undefined> {
    const metadataFiles = [
      'package.json',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'composer.json',
      'Gemfile',
      'pyproject.toml',
    ];

    for (const filename of metadataFiles) {
      try {
        const filePath = path.join(projectPath, filename);
        const content = await fs.readFile(filePath, 'utf-8');

        if (filename === 'package.json' || filename === 'composer.json') {
          return JSON.parse(content);
        } else {
          // Return as object with content
          return { [filename]: content };
        }
      } catch (error) {
        // Try next file
      }
    }

    return undefined;
  }

  /**
   * Get all files in project (recursively, respecting skip list)
   */
  private async getAllFiles(
    dirPath: string,
    files: Array<{ path: string; size: number; ext: string }> = []
  ): Promise<Array<{ path: string; size: number; ext: string }>> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!SKIP_DIRECTORIES.includes(entry.name) && !entry.name.startsWith('.')) {
            await this.getAllFiles(fullPath, files);
          }
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            size: stats.size,
            ext: path.extname(entry.name),
          });
        }
      }
    } catch (error) {
      logger.warn(`Error reading directory ${dirPath}: ${error}`);
    }

    return files;
  }

  /**
   * Extract main source files with prioritization and token limiting
   */
  private async extractMainFiles(
    projectPath: string,
    allFiles: Array<{ path: string; size: number; ext: string }>,
    tokensAlreadyUsed: number = 0
  ): Promise<FileContent[]> {
    const mainFiles: FileContent[] = [];
    let currentTokens = 0;
    const remainingTokens = this.maxTokens - tokensAlreadyUsed;

    // Sort files by priority
    const sortedFiles = this.prioritizeFiles(projectPath, allFiles);

    for (const file of sortedFiles) {
      // Stop if we're approaching token limit
      if (currentTokens >= remainingTokens * 0.9) {
        logger.debug(`Token limit reached, stopping file extraction`);
        break;
      }

      // Skip large files (>100KB)
      if (file.size > 100 * 1024) {
        continue;
      }

      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const tokens = this.countTokens(content);

        // Check if adding this file would exceed limit
        if (currentTokens + tokens > remainingTokens) {
          // Try to truncate file
          const truncated = this.truncateToTokens(
            content,
            remainingTokens - currentTokens
          );
          if (truncated) {
            mainFiles.push({
              path: path.relative(projectPath, file.path),
              content: truncated,
              language: this.getLanguageFromExtension(file.ext),
              size: file.size,
            });
            currentTokens += this.countTokens(truncated);
          }
          break;
        }

        mainFiles.push({
          path: path.relative(projectPath, file.path),
          content,
          language: this.getLanguageFromExtension(file.ext),
          size: file.size,
        });

        currentTokens += tokens;
      } catch (error) {
        // Skip files that can't be read (binary, permission issues, etc.)
        logger.debug(`Skipping file ${file.path}: ${error}`);
      }
    }

    logger.debug(`Extracted ${mainFiles.length} files (~${currentTokens} tokens)`);
    return mainFiles;
  }

  /**
   * Prioritize files for analysis
   */
  private prioritizeFiles(
    projectPath: string,
    files: Array<{ path: string; size: number; ext: string }>
  ): Array<{ path: string; size: number; ext: string }> {
    return files.sort((a, b) => {
      const aName = path.basename(a.path);
      const bName = path.basename(b.path);

      // Priority files first
      const aPriority = PRIORITY_FILES.includes(aName);
      const bPriority = PRIORITY_FILES.includes(bName);
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;

      // Then by depth (shallower first)
      const aDepth = path.relative(projectPath, a.path).split(path.sep).length;
      const bDepth = path.relative(projectPath, b.path).split(path.sep).length;
      if (aDepth !== bDepth) return aDepth - bDepth;

      // Then by size (smaller first)
      return a.size - b.size;
    });
  }

  /**
   * Count tokens in text
   */
  private countTokens(text: string): number {
    try {
      const tokens = this.encoder.encode(text);
      return tokens.length;
    } catch (error) {
      // Fallback: rough estimate (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Truncate text to token limit
   */
  private truncateToTokens(text: string, maxTokens: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= maxTokens) {
      return text;
    }

    const truncatedTokens = tokens.slice(0, maxTokens);
    return this.encoder.decode(truncatedTokens) + '\n\n[... truncated ...]';
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(ext: string): string {
    for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
      if (extensions.includes(ext)) {
        return language;
      }
    }
    return 'plaintext';
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.encoder.free();
  }
}
