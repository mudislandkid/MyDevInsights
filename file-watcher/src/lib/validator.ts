/**
 * Project Validator
 * Multi-language project detection and validation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectType, ValidationResult } from '../types';

/**
 * Project markers for different languages/frameworks
 */
const PROJECT_MARKERS = {
  nodejs: ['package.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
  python: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'poetry.lock'],
  rust: ['Cargo.toml', 'Cargo.lock'],
  go: ['go.mod', 'go.sum'],
  java: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'gradlew'],
  php: ['composer.json', 'composer.lock'],
  ruby: ['Gemfile', 'Gemfile.lock', '.ruby-version'],
  csharp: ['*.csproj', '*.sln', 'project.json'],
  flutter: ['pubspec.yaml', 'pubspec.lock'],
} as const;

/**
 * System directories to exclude from project detection
 */
const SYSTEM_DIRECTORIES = [
  '.git',
  'node_modules',
  '.DS_Store',
  '__pycache__',
  'dist',
  'build',
  'target',
  '.vscode',
  '.idea',
  '.next',
  'out',
  'coverage',
  '.cache',
  'vendor',
  '.svn',
  '.hg',
];

/**
 * Validate if a directory is a development project
 */
export async function validateProject(projectPath: string): Promise<ValidationResult> {
  try {
    // Check if directory exists
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      return {
        isValid: false,
        projectType: 'unknown',
        confidence: 0,
      };
    }

    // Get directory name
    const dirName = path.basename(projectPath);

    // Exclude system directories
    if (SYSTEM_DIRECTORIES.includes(dirName) || dirName.startsWith('.')) {
      return {
        isValid: false,
        projectType: 'unknown',
        confidence: 0,
      };
    }

    // Read directory contents
    const files = await fs.readdir(projectPath);

    // Check for empty directory
    if (files.length === 0) {
      return {
        isValid: false,
        projectType: 'unknown',
        confidence: 0,
      };
    }

    // Detect project type
    const detectionResult = await detectProjectType(projectPath, files);

    // Require minimum confidence threshold
    if (detectionResult.confidence < 0.5) {
      return {
        isValid: false,
        projectType: 'unknown',
        confidence: detectionResult.confidence,
      };
    }

    return {
      isValid: true,
      ...detectionResult,
    };
  } catch (error) {
    // Permission denied or other errors
    return {
      isValid: false,
      projectType: 'unknown',
      confidence: 0,
    };
  }
}

/**
 * Detect project type based on marker files
 */
async function detectProjectType(
  projectPath: string,
  files: string[]
): Promise<Omit<ValidationResult, 'isValid'>> {
  const detections: Array<{
    projectType: ProjectType;
    confidence: number;
    framework?: string;
    language?: string;
    packageManager?: string;
  }> = [];

  // Check Node.js projects
  if (files.includes('package.json')) {
    const metadata = await analyzeNodeProject(projectPath);
    detections.push({
      projectType: 'nodejs',
      confidence: 0.95,
      ...metadata,
    });
  }

  // Check Python projects
  const pythonMarkers = PROJECT_MARKERS.python.filter((marker) => files.includes(marker));
  if (pythonMarkers.length > 0) {
    const metadata = await analyzePythonProject(projectPath, pythonMarkers);
    detections.push({
      projectType: 'python',
      confidence: pythonMarkers.length >= 2 ? 0.9 : 0.7,
      ...metadata,
    });
  }

  // Check Rust projects
  if (files.includes('Cargo.toml')) {
    detections.push({
      projectType: 'rust',
      confidence: 0.95,
      language: 'Rust',
      packageManager: 'cargo',
    });
  }

  // Check Go projects
  if (files.includes('go.mod')) {
    detections.push({
      projectType: 'go',
      confidence: 0.95,
      language: 'Go',
      packageManager: 'go modules',
    });
  }

  // Check Java projects
  const javaMarkers = PROJECT_MARKERS.java.filter((marker) =>
    files.some((f) => f === marker || (marker.includes('*') && f.endsWith('.gradle')))
  );
  if (javaMarkers.length > 0) {
    const packageManager = javaMarkers.some((m) => m.includes('gradle'))
      ? 'gradle'
      : javaMarkers.some((m) => m === 'pom.xml')
        ? 'maven'
        : undefined;
    detections.push({
      projectType: 'java',
      confidence: 0.9,
      language: 'Java',
      packageManager,
    });
  }

  // Check PHP projects
  if (files.includes('composer.json')) {
    detections.push({
      projectType: 'php',
      confidence: 0.9,
      language: 'PHP',
      packageManager: 'composer',
    });
  }

  // Check Ruby projects
  if (files.includes('Gemfile')) {
    detections.push({
      projectType: 'ruby',
      confidence: 0.9,
      language: 'Ruby',
      packageManager: 'bundler',
    });
  }

  // Check Flutter/Dart projects
  if (files.includes('pubspec.yaml')) {
    detections.push({
      projectType: 'nodejs', // Map to nodejs for now
      confidence: 0.95,
      language: 'Dart',
      framework: 'Flutter',
      packageManager: 'pub',
    });
  }

  // If no strong markers found in root, check nested directories
  if (detections.length === 0) {
    const nestedDetection = await checkNestedProjects(projectPath, files);
    if (nestedDetection) {
      detections.push(nestedDetection);
    }
  }

  // If still no strong markers found, check for generic project indicators
  if (detections.length === 0) {
    const genericDetection = await detectGenericProject(projectPath, files);
    if (genericDetection.confidence > 0) {
      detections.push(genericDetection);
    }
  }

  // No valid project markers found
  if (detections.length === 0) {
    return {
      projectType: 'unknown',
      confidence: 0,
    };
  }

  // Return highest confidence detection
  detections.sort((a, b) => b.confidence - a.confidence);
  return detections[0];
}

/**
 * Check nested directories for project markers
 * Handles cases like /parent/actual-project/package.json
 */
async function checkNestedProjects(
  projectPath: string,
  rootFiles: string[]
): Promise<{
  projectType: ProjectType;
  confidence: number;
  framework?: string;
  language?: string;
  packageManager?: string;
} | null> {
  // Only check directories (not hidden ones)
  const subdirs = [];
  for (const file of rootFiles) {
    try {
      const fullPath = path.join(projectPath, file);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory() && !file.startsWith('.') && !SYSTEM_DIRECTORIES.includes(file)) {
        subdirs.push(file);
      }
    } catch {
      // Skip if can't access
    }
  }

  // Check each subdirectory for project markers
  for (const subdir of subdirs) {
    const subdirPath = path.join(projectPath, subdir);
    try {
      const subdirFiles = await fs.readdir(subdirPath);

      // Check for package.json (Node.js)
      if (subdirFiles.includes('package.json')) {
        return {
          projectType: 'nodejs',
          confidence: 0.85, // Slightly lower confidence for nested
          language: 'JavaScript',
          packageManager: 'npm',
        };
      }

      // Check for pubspec.yaml (Flutter)
      if (subdirFiles.includes('pubspec.yaml')) {
        return {
          projectType: 'nodejs', // Map to nodejs
          confidence: 0.85,
          language: 'Dart',
          framework: 'Flutter',
          packageManager: 'pub',
        };
      }

      // Check for requirements.txt (Python)
      if (subdirFiles.includes('requirements.txt') || subdirFiles.includes('pyproject.toml')) {
        return {
          projectType: 'python',
          confidence: 0.85,
          language: 'Python',
          packageManager: 'pip',
        };
      }

      // Check for Cargo.toml (Rust)
      if (subdirFiles.includes('Cargo.toml')) {
        return {
          projectType: 'rust',
          confidence: 0.85,
          language: 'Rust',
          packageManager: 'cargo',
        };
      }

      // Check for go.mod (Go)
      if (subdirFiles.includes('go.mod')) {
        return {
          projectType: 'go',
          confidence: 0.85,
          language: 'Go',
          packageManager: 'go modules',
        };
      }
    } catch {
      // Skip if can't read subdirectory
    }
  }

  return null;
}

/**
 * Detect generic project based on common indicators
 * Uses multiple weaker signals that combine for confidence score
 */
async function detectGenericProject(
  projectPath: string,
  files: string[]
): Promise<{
  projectType: ProjectType;
  confidence: number;
  framework?: string;
  language?: string;
  packageManager?: string;
}> {
  let confidence = 0;
  let language: string | undefined;

  // Check for .git directory (indicates it's a repository)
  const hasGit = files.includes('.git');
  if (hasGit) {
    confidence += 0.25;
  }

  // Check for README files
  const hasReadme = files.some((f) =>
    /^readme\.(md|txt|rst)$/i.test(f) || /^readme$/i.test(f)
  );
  if (hasReadme) {
    confidence += 0.15;
  }

  // Check for common source directories
  const commonSourceDirs = [
    'src',
    'lib',
    'app',
    'components',
    'services',
    'utils',
    'core',
    'modules',
    'backend',
    'frontend',
    'server',
    'client',
    'api',
    'web',
    'ui',
    'packages',
    'apps',
  ];
  const hasSourceDir = await checkForDirectories(projectPath, files, commonSourceDirs);
  if (hasSourceDir) {
    confidence += 0.2;
  }

  // Check for code files with common extensions
  const codeFileAnalysis = await analyzeCodeFiles(projectPath, files);
  if (codeFileAnalysis.hasCodeFiles) {
    confidence += 0.15;
    language = codeFileAnalysis.primaryLanguage;
  }

  // Check for configuration files (even without package.json)
  const configFiles = [
    'tsconfig.json',
    'jsconfig.json',
    '.eslintrc',
    '.prettierrc',
    'webpack.config.js',
    'vite.config.js',
    'rollup.config.js',
    'babel.config.js',
    '.babelrc',
    'Makefile',
    'CMakeLists.txt',
    'Dockerfile',
    'docker-compose.yml',
  ];
  const hasConfig = files.some((f) => configFiles.includes(f) || configFiles.some((c) => f.startsWith(c)));
  if (hasConfig) {
    confidence += 0.1;
  }

  // Check for documentation directories
  const docsDirs = ['docs', 'documentation', 'doc'];
  const hasDocs = await checkForDirectories(projectPath, files, docsDirs);
  if (hasDocs) {
    confidence += 0.05;
  }

  // Check for test directories
  const testDirs = ['test', 'tests', '__tests__', 'spec'];
  const hasTests = await checkForDirectories(projectPath, files, testDirs);
  if (hasTests) {
    confidence += 0.05;
  }

  return {
    projectType: 'nodejs', // Default to nodejs for generic projects
    confidence: Math.min(confidence, 0.95), // Cap at 0.95
    language,
  };
}

/**
 * Check if directory contains any of the specified subdirectories
 */
async function checkForDirectories(
  projectPath: string,
  files: string[],
  targetDirs: string[]
): Promise<boolean> {
  for (const file of files) {
    if (targetDirs.includes(file)) {
      try {
        const filePath = path.join(projectPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          return true;
        }
      } catch {
        // Ignore errors
      }
    }
  }
  return false;
}

/**
 * Analyze code files to determine if this is a code project
 */
async function analyzeCodeFiles(
  _projectPath: string,
  files: string[]
): Promise<{ hasCodeFiles: boolean; primaryLanguage?: string }> {
  const codeExtensions = {
    javascript: ['.js', '.jsx', '.mjs', '.cjs'],
    typescript: ['.ts', '.tsx'],
    python: ['.py'],
    rust: ['.rs'],
    go: ['.go'],
    java: ['.java'],
    csharp: ['.cs'],
    cpp: ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
    c: ['.c', '.h'],
    php: ['.php'],
    ruby: ['.rb'],
    swift: ['.swift'],
    kotlin: ['.kt'],
    dart: ['.dart'],
  };

  const languageCounts: Record<string, number> = {};

  // Count files by language
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    for (const [language, extensions] of Object.entries(codeExtensions)) {
      if (extensions.includes(ext)) {
        languageCounts[language] = (languageCounts[language] || 0) + 1;
      }
    }
  }

  // Find primary language
  const languages = Object.entries(languageCounts).sort((a, b) => b[1] - a[1]);
  const hasCodeFiles = languages.length > 0 && languages[0][1] >= 2; // At least 2 code files

  return {
    hasCodeFiles,
    primaryLanguage: hasCodeFiles
      ? languages[0][0].charAt(0).toUpperCase() + languages[0][0].slice(1)
      : undefined,
  };
}

/**
 * Analyze Node.js project details
 */
async function analyzeNodeProject(
  projectPath: string
): Promise<{ framework?: string; language?: string; packageManager?: string }> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);

    // Detect framework from dependencies
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    let framework: string | undefined;

    if (deps['next']) framework = 'Next.js';
    else if (deps['react']) framework = 'React';
    else if (deps['vue']) framework = 'Vue';
    else if (deps['@angular/core']) framework = 'Angular';
    else if (deps['svelte']) framework = 'Svelte';
    else if (deps['express']) framework = 'Express';
    else if (deps['fastify']) framework = 'Fastify';
    else if (deps['nestjs']) framework = 'NestJS';

    // Detect language
    const language = deps['typescript'] || packageJson.type === 'module' ? 'TypeScript' : 'JavaScript';

    // Detect package manager from lock files
    const files = await fs.readdir(projectPath);
    let packageManager: string | undefined;
    if (files.includes('pnpm-lock.yaml')) packageManager = 'pnpm';
    else if (files.includes('yarn.lock')) packageManager = 'yarn';
    else if (files.includes('bun.lockb')) packageManager = 'bun';
    else packageManager = 'npm';

    return { framework, language, packageManager };
  } catch (error) {
    return { language: 'JavaScript', packageManager: 'npm' };
  }
}

/**
 * Analyze Python project details
 */
async function analyzePythonProject(
  projectPath: string,
  markers: string[]
): Promise<{ framework?: string; language?: string; packageManager?: string }> {
  let packageManager: string | undefined;

  if (markers.includes('poetry.lock')) packageManager = 'poetry';
  else if (markers.includes('Pipfile')) packageManager = 'pipenv';
  else if (markers.includes('pyproject.toml')) packageManager = 'pip';
  else if (markers.includes('requirements.txt')) packageManager = 'pip';

  // Try to detect framework from requirements.txt or pyproject.toml
  let framework: string | undefined;
  try {
    if (markers.includes('requirements.txt')) {
      const reqPath = path.join(projectPath, 'requirements.txt');
      const content = await fs.readFile(reqPath, 'utf-8');

      if (content.includes('django')) framework = 'Django';
      else if (content.includes('flask')) framework = 'Flask';
      else if (content.includes('fastapi')) framework = 'FastAPI';
    }
  } catch {
    // Ignore errors
  }

  return { framework, language: 'Python', packageManager };
}

/**
 * Check if path is a system directory that should be ignored
 */
export function isSystemDirectory(dirPath: string): boolean {
  const dirName = path.basename(dirPath);
  return SYSTEM_DIRECTORIES.includes(dirName) || dirName.startsWith('.');
}
