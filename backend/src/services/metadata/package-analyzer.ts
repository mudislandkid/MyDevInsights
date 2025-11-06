/**
 * Package Analyzer
 * Parses package.json and analyzes dependencies
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface PackageInfo {
  name?: string;
  version?: string;
  description?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts?: Record<string, string>;
  main?: string;
  type?: string;
  engines?: Record<string, string>;
}

export interface DependencyAnalysis {
  totalDependencies: number;
  productionDeps: number;
  devDeps: number;
  frameworks: string[];
  libraries: string[];
  buildTools: string[];
  testingTools: string[];
}

export class PackageAnalyzer {
  /**
   * Parse package.json from project directory
   */
  async parsePackageJson(projectPath: string): Promise<PackageInfo | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        scripts: pkg.scripts,
        main: pkg.main,
        type: pkg.type,
        engines: pkg.engines,
      };
    } catch (error) {
      // No package.json or parse error
      return null;
    }
  }

  /**
   * Analyze dependencies to identify frameworks and tools
   */
  analyzeDependencies(packageInfo: PackageInfo): DependencyAnalysis {
    const allDeps = {
      ...packageInfo.dependencies,
      ...packageInfo.devDependencies,
    };

    const frameworks: string[] = [];
    const libraries: string[] = [];
    const buildTools: string[] = [];
    const testingTools: string[] = [];

    // Framework detection
    const frameworkMap: Record<string, string> = {
      'react': 'React',
      'next': 'Next.js',
      'vue': 'Vue',
      'nuxt': 'Nuxt',
      '@angular/core': 'Angular',
      'svelte': 'Svelte',
      'solid-js': 'Solid',
      'preact': 'Preact',
      'express': 'Express',
      'fastify': 'Fastify',
      'koa': 'Koa',
      '@nestjs/core': 'NestJS',
      'hono': 'Hono',
      'remix': 'Remix',
      'gatsby': 'Gatsby',
      'astro': 'Astro',
      'qwik': 'Qwik',
    };

    // Build tools
    const buildToolMap: Record<string, string> = {
      'vite': 'Vite',
      'webpack': 'Webpack',
      'rollup': 'Rollup',
      'parcel': 'Parcel',
      'esbuild': 'esbuild',
      'turbopack': 'Turbopack',
      'swc': 'SWC',
      '@babel/core': 'Babel',
      'typescript': 'TypeScript',
    };

    // Testing tools
    const testingToolMap: Record<string, string> = {
      'jest': 'Jest',
      'vitest': 'Vitest',
      '@playwright/test': 'Playwright',
      'cypress': 'Cypress',
      'mocha': 'Mocha',
      'chai': 'Chai',
      'jasmine': 'Jasmine',
      '@testing-library/react': 'React Testing Library',
      '@testing-library/vue': 'Vue Testing Library',
    };

    // Notable libraries
    const libraryMap: Record<string, string> = {
      'react-router-dom': 'React Router',
      'react-query': 'React Query',
      '@tanstack/react-query': 'TanStack Query',
      'redux': 'Redux',
      '@reduxjs/toolkit': 'Redux Toolkit',
      'zustand': 'Zustand',
      'jotai': 'Jotai',
      'recoil': 'Recoil',
      'mobx': 'MobX',
      'axios': 'Axios',
      'socket.io': 'Socket.IO',
      'graphql': 'GraphQL',
      '@apollo/client': 'Apollo Client',
      'prisma': 'Prisma',
      'mongoose': 'Mongoose',
      'sequelize': 'Sequelize',
      'typeorm': 'TypeORM',
      'drizzle-orm': 'Drizzle',
      'tailwindcss': 'Tailwind CSS',
      '@emotion/react': 'Emotion',
      'styled-components': 'Styled Components',
      'framer-motion': 'Framer Motion',
    };

    // Scan dependencies
    for (const dep of Object.keys(allDeps)) {
      if (frameworkMap[dep]) {
        frameworks.push(frameworkMap[dep]);
      } else if (buildToolMap[dep]) {
        buildTools.push(buildToolMap[dep]);
      } else if (testingToolMap[dep]) {
        testingTools.push(testingToolMap[dep]);
      } else if (libraryMap[dep]) {
        libraries.push(libraryMap[dep]);
      }
    }

    return {
      totalDependencies: Object.keys(allDeps).length,
      productionDeps: Object.keys(packageInfo.dependencies).length,
      devDeps: Object.keys(packageInfo.devDependencies).length,
      frameworks: [...new Set(frameworks)],
      libraries: [...new Set(libraries)],
      buildTools: [...new Set(buildTools)],
      testingTools: [...new Set(testingTools)],
    };
  }

  /**
   * Get npm scripts available
   */
  getAvailableScripts(packageInfo: PackageInfo): string[] {
    if (!packageInfo.scripts) return [];
    return Object.keys(packageInfo.scripts);
  }

  /**
   * Check if project uses TypeScript
   */
  hasTypeScript(packageInfo: PackageInfo): boolean {
    const allDeps = {
      ...packageInfo.dependencies,
      ...packageInfo.devDependencies,
    };
    return 'typescript' in allDeps;
  }

  /**
   * Detect if project is a monorepo
   */
  isMonorepo(packageInfo: PackageInfo): boolean {
    const workspaceIndicators = [
      'workspaces',
      'lerna',
      'nx',
      'turborepo',
    ];

    // Check for workspace field
    if ((packageInfo as any).workspaces) return true;

    // Check for monorepo tools
    const allDeps = {
      ...packageInfo.dependencies,
      ...packageInfo.devDependencies,
    };

    return workspaceIndicators.some((indicator) => indicator in allDeps);
  }
}
