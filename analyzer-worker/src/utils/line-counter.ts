/**
 * Line Counter Utility
 * Counts lines of code excluding blank lines and comments
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Extensions for code files we want to count
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rs', '.go', '.java', '.php', '.rb',
  '.cs', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.swift', '.kt', '.scala', '.dart', '.vue',
  '.html', '.css', '.scss', '.sass', '.less',
  '.sql', '.graphql', '.proto', '.yaml', '.yml',
  '.json', '.xml', '.sh', '.bash', '.zsh',
]);

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
  '.angular',
  'bower_components',
];

/**
 * Count lines of code in a file
 * Returns count of non-blank, non-comment-only lines
 */
function countLinesInFile(content: string, extension: string): number {
  const lines = content.split('\n');
  let count = 0;

  // Simple regex patterns for common comment styles
  const lineCommentPatterns = [
    /^\s*\/\//, // JavaScript, TypeScript, C-style
    /^\s*#/,    // Python, Ruby, Shell
    /^\s*--/,   // SQL, Lua
    /^\s*;/,    // Lisp, Assembly
    /^\s*%/,    // Erlang, LaTeX
  ];

  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip blank lines
    if (!trimmed) continue;

    // Handle block comments (/* */ style)
    if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
      inBlockComment = true;
    }
    if (inBlockComment) {
      if (trimmed.endsWith('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Skip line comments
    const isLineComment = lineCommentPatterns.some(pattern => pattern.test(trimmed));
    if (isLineComment) continue;

    // Handle Python docstrings
    if (extension === '.py') {
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        // Skip docstring lines
        continue;
      }
    }

    // This is a code line
    count++;
  }

  return count;
}

/**
 * Count lines of code in an entire project
 */
export async function countProjectLines(projectPath: string): Promise<number> {
  let totalLines = 0;

  async function walkDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!SKIP_DIRECTORIES.includes(entry.name) && !entry.name.startsWith('.')) {
            await walkDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);

          // Only count recognized code files
          if (CODE_EXTENSIONS.has(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = countLinesInFile(content, ext);
              totalLines += lines;
            } catch (error) {
              // Skip files that can't be read (binary, permission issues, etc.)
            }
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  await walkDirectory(projectPath);
  return totalLines;
}
