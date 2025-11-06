/**
 * File Watcher Types
 */

export interface WatcherConfig {
  watchPath: string;
  depth: number;
  ignorePatterns: string[];
  debounceDelay: number;
  stabilityThreshold: number;
}

export interface ProjectMetadata {
  path: string;
  name: string;
  type: ProjectType;
  framework?: string;
  language?: string;
  packageManager?: string;
  fileCount?: number;
  size?: number;
}

export type ProjectType =
  | 'nodejs'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'php'
  | 'ruby'
  | 'csharp'
  | 'unknown';

export interface ProjectEvent {
  type: 'added' | 'removed';
  path: string;
  metadata?: ProjectMetadata;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  projectType: ProjectType;
  framework?: string;
  language?: string;
  packageManager?: string;
  confidence: number; // 0-1
}
