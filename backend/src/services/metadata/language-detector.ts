/**
 * Language Detector
 * Detects programming languages from file extensions and config files
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface LanguageDetectionResult {
  primary: string; // Primary language
  languages: string[]; // All detected languages
  percentages: Record<string, number>; // Language distribution
  hasTypeScript: boolean;
  hasJavaScript: boolean;
}

const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  TypeScript: ['.ts', '.tsx', '.mts', '.cts'],
  JavaScript: ['.js', '.jsx', '.mjs', '.cjs'],
  Python: ['.py', '.pyw', '.pyi'],
  Rust: ['.rs'],
  Go: ['.go'],
  Java: ['.java'],
  Kotlin: ['.kt', '.kts'],
  Swift: ['.swift'],
  'C++': ['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.h'],
  C: ['.c', '.h'],
  'C#': ['.cs'],
  PHP: ['.php'],
  Ruby: ['.rb'],
  Dart: ['.dart'],
  Scala: ['.scala'],
  Elixir: ['.ex', '.exs'],
  Clojure: ['.clj', '.cljs', '.cljc'],
  Haskell: ['.hs'],
  Lua: ['.lua'],
  R: ['.r', '.R'],
  Shell: ['.sh', '.bash', '.zsh'],
  SQL: ['.sql'],
  HTML: ['.html', '.htm'],
  CSS: ['.css', '.scss', '.sass', '.less'],
  Vue: ['.vue'],
  Svelte: ['.svelte'],
  Astro: ['.astro'],
  MDX: ['.mdx'],
  Markdown: ['.md'],
  JSON: ['.json'],
  YAML: ['.yml', '.yaml'],
  TOML: ['.toml'],
  XML: ['.xml'],
};

const SKIP_DIRECTORIES = [
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
  'coverage',
  '.cache',
];

export class LanguageDetector {
  /**
   * Detect languages used in project
   */
  async detectLanguages(projectPath: string): Promise<LanguageDetectionResult> {
    const fileCounts: Record<string, number> = {};

    // Scan project files
    await this.scanDirectory(projectPath, fileCounts);

    // Convert counts to languages
    const languages: string[] = [];
    let totalFiles = 0;

    for (const [ext, count] of Object.entries(fileCounts)) {
      totalFiles += count;
      const language = this.getLanguageFromExtension(ext);
      if (language) {
        languages.push(language);
      }
    }

    // Calculate percentages
    const percentages: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    for (const [ext, count] of Object.entries(fileCounts)) {
      const language = this.getLanguageFromExtension(ext);
      if (language) {
        languageCounts[language] = (languageCounts[language] || 0) + count;
      }
    }

    for (const [language, count] of Object.entries(languageCounts)) {
      percentages[language] = (count / totalFiles) * 100;
    }

    // Determine primary language (exclude markup/config)
    const codeLanguages = Object.entries(languageCounts)
      .filter(([lang]) => !['HTML', 'CSS', 'JSON', 'YAML', 'TOML', 'XML', 'Markdown', 'MDX'].includes(lang))
      .sort(([, a], [, b]) => b - a);

    const primary = codeLanguages.length > 0 ? codeLanguages[0][0] : 'Unknown';

    // Get unique languages sorted by count
    const uniqueLanguages = [...new Set(languages)].sort((a, b) =>
      (languageCounts[b] || 0) - (languageCounts[a] || 0)
    );

    const hasTypeScript = 'TypeScript' in languageCounts;
    const hasJavaScript = 'JavaScript' in languageCounts;

    return {
      primary,
      languages: uniqueLanguages,
      percentages,
      hasTypeScript,
      hasJavaScript,
    };
  }

  /**
   * Detect language from config files
   */
  async detectFromConfigFiles(projectPath: string): Promise<string | null> {
    const configChecks: Array<[string, string]> = [
      ['tsconfig.json', 'TypeScript'],
      ['go.mod', 'Go'],
      ['Cargo.toml', 'Rust'],
      ['requirements.txt', 'Python'],
      ['pyproject.toml', 'Python'],
      ['Pipfile', 'Python'],
      ['pom.xml', 'Java'],
      ['build.gradle', 'Java'],
      ['Package.swift', 'Swift'],
      ['Gemfile', 'Ruby'],
      ['composer.json', 'PHP'],
      ['mix.exs', 'Elixir'],
      ['project.clj', 'Clojure'],
      ['*.csproj', 'C#'],
      ['*.sln', 'C#'],
    ];

    for (const [fileName, language] of configChecks) {
      try {
        if (fileName.includes('*')) {
          // Glob pattern - check if any file matches
          const files = await fs.readdir(projectPath);
          const pattern = fileName.replace('*', '');
          if (files.some(f => f.endsWith(pattern))) {
            return language;
          }
        } else {
          await fs.access(path.join(projectPath, fileName));
          return language;
        }
      } catch {
        // File doesn't exist
      }
    }

    return null;
  }

  /**
   * Recursively scan directory for file extensions
   */
  private async scanDirectory(
    dirPath: string,
    fileCounts: Record<string, number>,
    depth: number = 0
  ): Promise<void> {
    // Limit depth to prevent deep recursion
    if (depth > 5) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!SKIP_DIRECTORIES.includes(entry.name) && !entry.name.startsWith('.')) {
            await this.scanDirectory(fullPath, fileCounts, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ext) {
            fileCounts[ext] = (fileCounts[ext] || 0) + 1;
          }
        }
      }
    } catch (error) {
      // Permission denied or other error, skip
    }
  }

  /**
   * Get language name from file extension
   */
  private getLanguageFromExtension(ext: string): string | null {
    for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
      if (extensions.includes(ext.toLowerCase())) {
        return language;
      }
    }
    return null;
  }

  /**
   * Check if project uses TypeScript
   */
  async hasTypeScript(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'tsconfig.json'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get TypeScript config if it exists
   */
  async getTsConfig(projectPath: string): Promise<Record<string, any> | null> {
    try {
      const content = await fs.readFile(
        path.join(projectPath, 'tsconfig.json'),
        'utf-8'
      );
      // Remove comments (simple approach)
      const cleaned = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}
