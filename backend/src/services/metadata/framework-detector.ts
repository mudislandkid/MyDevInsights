/**
 * Framework Detector
 * Detects frameworks from dependencies and config files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PackageInfo } from './package-analyzer';

export interface FrameworkDetectionResult {
  framework?: string; // Primary framework
  frameworks: string[]; // All detected frameworks
  meta: string[]; // Meta-frameworks (Next.js, Remix, etc.)
  backend: string[]; // Backend frameworks
  confidence: number; // 0-1
}

export class FrameworkDetector {
  /**
   * Detect framework from package.json and config files
   */
  async detectFramework(
    projectPath: string,
    packageInfo: PackageInfo | null
  ): Promise<FrameworkDetectionResult> {
    const frameworks: string[] = [];
    const meta: string[] = [];
    const backend: string[] = [];

    // Check config files
    const configFiles = await this.getConfigFiles(projectPath);

    // Next.js detection
    if (packageInfo?.dependencies?.['next'] || configFiles.includes('next.config.js') || configFiles.includes('next.config.mjs')) {
      meta.push('Next.js');
      frameworks.push('Next.js');
    }

    // Nuxt detection
    if (packageInfo?.dependencies?.['nuxt'] || configFiles.includes('nuxt.config.ts') || configFiles.includes('nuxt.config.js')) {
      meta.push('Nuxt');
      frameworks.push('Nuxt');
    }

    // Remix detection
    if (packageInfo?.dependencies?.['@remix-run/react'] || configFiles.includes('remix.config.js')) {
      meta.push('Remix');
      frameworks.push('Remix');
    }

    // Gatsby detection
    if (packageInfo?.dependencies?.['gatsby'] || configFiles.includes('gatsby-config.js')) {
      meta.push('Gatsby');
      frameworks.push('Gatsby');
    }

    // Astro detection
    if (packageInfo?.dependencies?.['astro'] || configFiles.includes('astro.config.mjs')) {
      meta.push('Astro');
      frameworks.push('Astro');
    }

    // SvelteKit detection
    if (packageInfo?.devDependencies?.['@sveltejs/kit'] || configFiles.includes('svelte.config.js')) {
      meta.push('SvelteKit');
      frameworks.push('SvelteKit');
    }

    // Qwik City detection
    if (packageInfo?.dependencies?.['@builder.io/qwik-city']) {
      meta.push('Qwik City');
      frameworks.push('Qwik City');
    }

    // React (standalone)
    if (packageInfo?.dependencies?.['react'] && meta.length === 0) {
      frameworks.push('React');
    }

    // Vue (standalone)
    if (packageInfo?.dependencies?.['vue'] && meta.length === 0) {
      frameworks.push('Vue');
    }

    // Angular
    if (packageInfo?.dependencies?.['@angular/core'] || configFiles.includes('angular.json')) {
      frameworks.push('Angular');
    }

    // Svelte (standalone)
    if (packageInfo?.dependencies?.['svelte'] && meta.length === 0) {
      frameworks.push('Svelte');
    }

    // Solid.js
    if (packageInfo?.dependencies?.['solid-js']) {
      frameworks.push('Solid.js');
    }

    // Preact
    if (packageInfo?.dependencies?.['preact']) {
      frameworks.push('Preact');
    }

    // Backend frameworks
    if (packageInfo?.dependencies?.['express']) {
      backend.push('Express');
    }

    if (packageInfo?.dependencies?.['fastify']) {
      backend.push('Fastify');
    }

    if (packageInfo?.dependencies?.['@nestjs/core']) {
      backend.push('NestJS');
    }

    if (packageInfo?.dependencies?.['koa']) {
      backend.push('Koa');
    }

    if (packageInfo?.dependencies?.['hono']) {
      backend.push('Hono');
    }

    if (packageInfo?.dependencies?.['@hapi/hapi']) {
      backend.push('Hapi');
    }

    // Determine primary framework
    let primary: string | undefined;
    if (meta.length > 0) {
      primary = meta[0]; // Meta-frameworks take priority
    } else if (frameworks.length > 0) {
      primary = frameworks[0];
    } else if (backend.length > 0) {
      primary = backend[0];
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(frameworks, meta, backend, configFiles);

    return {
      framework: primary,
      frameworks: [...new Set([...meta, ...frameworks])],
      meta,
      backend,
      confidence,
    };
  }

  /**
   * Get list of config files in project
   */
  private async getConfigFiles(projectPath: string): Promise<string[]> {
    const configFileNames = [
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
      'nuxt.config.ts',
      'nuxt.config.js',
      'remix.config.js',
      'gatsby-config.js',
      'gatsby-node.js',
      'astro.config.mjs',
      'svelte.config.js',
      'vite.config.ts',
      'vite.config.js',
      'webpack.config.js',
      'angular.json',
      'vue.config.js',
      'tsconfig.json',
      'tailwind.config.js',
      'tailwind.config.ts',
      'postcss.config.js',
      'eslint.config.js',
      '.eslintrc.js',
      'prettier.config.js',
      '.prettierrc',
    ];

    const foundFiles: string[] = [];

    for (const fileName of configFileNames) {
      try {
        const filePath = path.join(projectPath, fileName);
        await fs.access(filePath);
        foundFiles.push(fileName);
      } catch {
        // File doesn't exist, skip
      }
    }

    return foundFiles;
  }

  /**
   * Calculate confidence score based on evidence
   */
  private calculateConfidence(
    frameworks: string[],
    meta: string[],
    backend: string[],
    configFiles: string[]
  ): number {
    let score = 0;

    // Meta-frameworks have high confidence
    if (meta.length > 0) score += 0.4;

    // Framework dependencies
    if (frameworks.length > 0) score += 0.3;

    // Backend frameworks
    if (backend.length > 0) score += 0.2;

    // Config files present
    if (configFiles.length > 0) score += Math.min(configFiles.length * 0.05, 0.3);

    return Math.min(score, 1.0);
  }

  /**
   * Detect build tool from config files
   */
  async detectBuildTool(projectPath: string): Promise<string | null> {
    const buildToolMap: Record<string, string> = {
      'vite.config.ts': 'Vite',
      'vite.config.js': 'Vite',
      'webpack.config.js': 'Webpack',
      'rollup.config.js': 'Rollup',
      'turbo.json': 'Turborepo',
      'nx.json': 'Nx',
    };

    for (const [fileName, toolName] of Object.entries(buildToolMap)) {
      try {
        await fs.access(path.join(projectPath, fileName));
        return toolName;
      } catch {
        // File doesn't exist
      }
    }

    return null;
  }
}
