/**
 * Package Manager Detector
 * Detects package manager from lock files and config
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'cargo' | 'go' | 'pip' | 'poetry' | 'maven' | 'gradle' | 'composer' | 'bundler' | 'unknown';

export interface PackageManagerDetectionResult {
  packageManager: PackageManager;
  version?: string;
  lockFile?: string;
  confidence: number;
}

export class PackageManagerDetector {
  /**
   * Detect package manager from lock files
   */
  async detectPackageManager(projectPath: string): Promise<PackageManagerDetectionResult> {
    // Check for lock files in priority order
    const checks: Array<{
      file: string;
      manager: PackageManager;
      confidence: number;
    }> = [
      { file: 'bun.lockb', manager: 'bun', confidence: 1.0 },
      { file: 'pnpm-lock.yaml', manager: 'pnpm', confidence: 1.0 },
      { file: 'yarn.lock', manager: 'yarn', confidence: 1.0 },
      { file: 'package-lock.json', manager: 'npm', confidence: 1.0 },
      { file: 'Cargo.lock', manager: 'cargo', confidence: 1.0 },
      { file: 'go.sum', manager: 'go', confidence: 1.0 },
      { file: 'poetry.lock', manager: 'poetry', confidence: 1.0 },
      { file: 'Pipfile.lock', manager: 'pip', confidence: 0.9 },
      { file: 'requirements.txt', manager: 'pip', confidence: 0.7 },
      { file: 'pom.xml', manager: 'maven', confidence: 0.9 },
      { file: 'build.gradle', manager: 'gradle', confidence: 0.9 },
      { file: 'build.gradle.kts', manager: 'gradle', confidence: 0.9 },
      { file: 'composer.lock', manager: 'composer', confidence: 1.0 },
      { file: 'Gemfile.lock', manager: 'bundler', confidence: 1.0 },
    ];

    for (const check of checks) {
      try {
        const filePath = path.join(projectPath, check.file);
        await fs.access(filePath);

        // Try to get version info
        let version: string | undefined;
        if (check.manager === 'npm' || check.manager === 'yarn' || check.manager === 'pnpm') {
          version = await this.getNodePackageManagerVersion(projectPath, check.manager);
        }

        return {
          packageManager: check.manager,
          version,
          lockFile: check.file,
          confidence: check.confidence,
        };
      } catch {
        // File doesn't exist, try next
      }
    }

    // Check for package.json without lock file (default to npm)
    try {
      await fs.access(path.join(projectPath, 'package.json'));
      return {
        packageManager: 'npm',
        confidence: 0.5,
      };
    } catch {
      // No Node.js project
    }

    return {
      packageManager: 'unknown',
      confidence: 0,
    };
  }

  /**
   * Get package manager version from package.json engines or packageManager field
   */
  private async getNodePackageManagerVersion(
    projectPath: string,
    manager: PackageManager
  ): Promise<string | undefined> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      // Check packageManager field (newer standard)
      if (pkg.packageManager) {
        const match = pkg.packageManager.match(new RegExp(`${manager}@([\\d.]+)`));
        if (match) return match[1];
      }

      // Check engines field
      if (pkg.engines && pkg.engines[manager]) {
        return pkg.engines[manager];
      }
    } catch {
      // Error reading package.json
    }

    return undefined;
  }

  /**
   * Detect if project uses workspaces (monorepo)
   */
  async detectWorkspaces(projectPath: string): Promise<boolean> {
    try {
      // Check for pnpm workspace
      await fs.access(path.join(projectPath, 'pnpm-workspace.yaml'));
      return true;
    } catch {
      // Not a pnpm workspace
    }

    try {
      // Check for yarn/npm workspace in package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      if (pkg.workspaces) {
        return true;
      }
    } catch {
      // Error reading package.json
    }

    // Check for monorepo tools
    const monorepoFiles = [
      'lerna.json',
      'nx.json',
      'turbo.json',
      'rush.json',
    ];

    for (const file of monorepoFiles) {
      try {
        await fs.access(path.join(projectPath, file));
        return true;
      } catch {
        // File doesn't exist
      }
    }

    return false;
  }

  /**
   * Get all package managers used in project (for monorepos)
   */
  async getAllPackageManagers(projectPath: string): Promise<PackageManager[]> {
    const managers: PackageManager[] = [];

    const checks: Array<[string, PackageManager]> = [
      ['package-lock.json', 'npm'],
      ['yarn.lock', 'yarn'],
      ['pnpm-lock.yaml', 'pnpm'],
      ['bun.lockb', 'bun'],
      ['Cargo.lock', 'cargo'],
      ['go.sum', 'go'],
      ['poetry.lock', 'poetry'],
      ['Pipfile.lock', 'pip'],
      ['requirements.txt', 'pip'],
      ['pom.xml', 'maven'],
      ['build.gradle', 'gradle'],
      ['composer.lock', 'composer'],
      ['Gemfile.lock', 'bundler'],
    ];

    for (const [file, manager] of checks) {
      try {
        await fs.access(path.join(projectPath, file));
        if (!managers.includes(manager)) {
          managers.push(manager);
        }
      } catch {
        // File doesn't exist
      }
    }

    return managers;
  }

  /**
   * Get suggested package manager based on project type
   */
  suggestPackageManager(
    hasTypeScript: boolean,
    isMonorepo: boolean,
    framework?: string
  ): PackageManager {
    // Bun for modern TypeScript projects
    if (hasTypeScript && !isMonorepo) {
      return 'bun';
    }

    // pnpm for monorepos
    if (isMonorepo) {
      return 'pnpm';
    }

    // Yarn for specific frameworks
    if (framework === 'Gatsby' || framework === 'Remix') {
      return 'yarn';
    }

    // Default to npm
    return 'npm';
  }
}
