/**
 * Metadata Extractor
 * Orchestrates all metadata detection services
 */

import * as fs from 'fs/promises';
import { PackageAnalyzer } from './package-analyzer';
import { FrameworkDetector } from './framework-detector';
import { LanguageDetector } from './language-detector';
import { PackageManagerDetector } from './package-manager-detector';
import { FileCounter } from './file-counter';

export interface ProjectMetadata {
  name: string;
  path: string;
  description?: string;
  framework?: string;
  language: string;
  packageManager?: string;
  fileCount: number;
  size: bigint;
  lastModified: Date;
  dependencies?: number;
  hasTypeScript: boolean;
  hasTests: boolean;
  isMonorepo: boolean;
  frameworks: string[];
  languages: string[];
  buildTool?: string;
}

export class MetadataExtractor {
  private packageAnalyzer: PackageAnalyzer;
  private frameworkDetector: FrameworkDetector;
  private languageDetector: LanguageDetector;
  private packageManagerDetector: PackageManagerDetector;
  private fileCounter: FileCounter;

  constructor() {
    this.packageAnalyzer = new PackageAnalyzer();
    this.frameworkDetector = new FrameworkDetector();
    this.languageDetector = new LanguageDetector();
    this.packageManagerDetector = new PackageManagerDetector();
    this.fileCounter = new FileCounter();
  }

  /**
   * Extract complete metadata from project
   */
  async extractMetadata(projectPath: string): Promise<ProjectMetadata> {
    // Verify project exists
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      throw new Error('Project path is not a directory');
    }

    // Extract package info
    const packageInfo = await this.packageAnalyzer.parsePackageJson(projectPath);

    // Detect framework
    const frameworkResult = await this.frameworkDetector.detectFramework(
      projectPath,
      packageInfo
    );

    // Detect languages
    const languageResult = await this.languageDetector.detectLanguages(projectPath);

    // Detect package manager
    const packageManagerResult = await this.packageManagerDetector.detectPackageManager(
      projectPath
    );

    // Count files (quick stats for initial discovery)
    const fileStats = await this.fileCounter.getQuickStats(projectPath);

    // Check if monorepo
    const isMonorepo = await this.packageManagerDetector.detectWorkspaces(projectPath);

    // Detect build tool
    const buildTool = await this.frameworkDetector.detectBuildTool(projectPath);

    // Check for tests
    const hasTests = await this.hasTestDirectory(projectPath);

    // Get project name
    const name = packageInfo?.name || this.getProjectNameFromPath(projectPath);

    // Get last modified time
    const lastModified = stats.mtime;

    return {
      name,
      path: projectPath,
      description: packageInfo?.description,
      framework: frameworkResult.framework,
      language: languageResult.primary,
      packageManager: packageManagerResult.packageManager,
      fileCount: fileStats.fileCount,
      size: BigInt(fileStats.estimatedSize),
      lastModified,
      dependencies: packageInfo
        ? Object.keys(packageInfo.dependencies).length +
          Object.keys(packageInfo.devDependencies).length
        : undefined,
      hasTypeScript: languageResult.hasTypeScript,
      hasTests,
      isMonorepo,
      frameworks: frameworkResult.frameworks,
      languages: languageResult.languages,
      buildTool: buildTool || undefined,
    };
  }

  /**
   * Extract detailed metadata (slower, for full analysis)
   */
  async extractDetailedMetadata(projectPath: string): Promise<ProjectMetadata & {
    fileCountResult: any;
    dependencyAnalysis?: any;
  }> {
    const basicMetadata = await this.extractMetadata(projectPath);

    // Get detailed file count
    const fileCountResult = await this.fileCounter.countFiles(projectPath);

    // Get dependency analysis if package.json exists
    const packageInfo = await this.packageAnalyzer.parsePackageJson(projectPath);
    const dependencyAnalysis = packageInfo
      ? this.packageAnalyzer.analyzeDependencies(packageInfo)
      : undefined;

    return {
      ...basicMetadata,
      fileCount: fileCountResult.totalFiles,
      size: BigInt(fileCountResult.totalSize),
      fileCountResult,
      dependencyAnalysis,
    };
  }

  /**
   * Quick validation check
   */
  async isValidProject(projectPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) return false;

      // Check for any project markers
      const markers = [
        'package.json',
        'requirements.txt',
        'Cargo.toml',
        'go.mod',
        'pom.xml',
        'build.gradle',
        'composer.json',
        'Gemfile',
        'mix.exs',
      ];

      for (const marker of markers) {
        try {
          await fs.access(`${projectPath}/${marker}`);
          return true;
        } catch {
          // File doesn't exist
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if project has test directory
   */
  private async hasTestDirectory(projectPath: string): Promise<boolean> {
    const testDirs = ['test', 'tests', '__tests__', 'spec', 'specs'];

    for (const dir of testDirs) {
      try {
        const stats = await fs.stat(`${projectPath}/${dir}`);
        if (stats.isDirectory()) return true;
      } catch {
        // Directory doesn't exist
      }
    }

    // Check for test files in root
    try {
      const files = await fs.readdir(projectPath);
      return files.some(
        (f) =>
          f.includes('.test.') ||
          f.includes('.spec.') ||
          f.includes('_test.') ||
          f.includes('_spec.')
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract project name from path
   */
  private getProjectNameFromPath(projectPath: string): string {
    const parts = projectPath.split('/');
    return parts[parts.length - 1] || 'unknown-project';
  }
}
