/**
 * Shared TypeScript types for Project Viewer
 * These types are shared across all services (frontend, backend, worker, file-watcher)
 */

// ============================================================================
// Core Domain Models (matching Prisma schema)
// ============================================================================

/**
 * Project status lifecycle
 */
export enum ProjectStatus {
  DISCOVERED = 'DISCOVERED',   // Just found by file watcher
  QUEUED = 'QUEUED',           // Queued for AI analysis
  ANALYZING = 'ANALYZING',      // Currently being analyzed by Claude
  ANALYZED = 'ANALYZED',        // Analysis complete
  ERROR = 'ERROR',              // Analysis failed
  ARCHIVED = 'ARCHIVED',        // User archived the project
}

/**
 * Main Project model
 * Represents a development project discovered on the file system
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string | null;

  // Metadata
  framework?: string | null;      // e.g., "React", "Next.js", "Vue"
  language?: string | null;       // e.g., "TypeScript", "JavaScript", "Python"
  packageManager?: string | null; // e.g., "npm", "yarn", "pnpm"

  // File stats
  fileCount?: number | null;
  lastModified?: Date | null;
  size?: bigint | null;  // bytes

  // Status
  status: ProjectStatus;
  isActive: boolean;

  // Timestamps
  discoveredAt: Date;
  analyzedAt?: Date | null;
  updatedAt: Date;

  // Relations (may be populated or not depending on query)
  analyses?: ProjectAnalysis[];
  tags?: Tag[];
}

/**
 * Tech stack breakdown structure
 */
export interface TechStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  devops?: string[];
  testing?: string[];
  other?: string[];
}

/**
 * AI-generated analysis of a project
 */
export interface ProjectAnalysis {
  id: string;
  projectId: string;

  // Claude analysis results
  summary: string;
  techStack: TechStack;
  complexity?: string | null;  // "simple", "moderate", "complex"
  recommendations?: Record<string, any> | null;

  // Metadata about the analysis
  model: string;           // e.g., "claude-3-5-sonnet-20241022"
  tokensUsed?: number | null;
  cacheHit: boolean;       // Was this served from cache?

  // Timestamps
  createdAt: Date;

  // Relations
  project?: Project;
}

/**
 * Tag for organizing projects
 */
export interface Tag {
  id: string;
  name: string;
  color?: string | null;  // hex color for UI

  // Relations
  projects?: Project[];
}

// ============================================================================
// Serialization helpers
// ============================================================================

/**
 * Project with serialized dates (for JSON transmission)
 */
export type SerializedProject = Omit<Project, 'discoveredAt' | 'analyzedAt' | 'updatedAt' | 'lastModified' | 'size'> & {
  discoveredAt: string;
  analyzedAt?: string | null;
  updatedAt: string;
  lastModified?: string | null;
  size?: string | null;  // bigint as string
};

/**
 * Analysis with serialized dates
 */
export type SerializedProjectAnalysis = Omit<ProjectAnalysis, 'createdAt'> & {
  createdAt: string;
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Filter options for projects
 */
export interface ProjectFilters {
  status?: ProjectStatus | ProjectStatus[];
  framework?: string | string[];
  language?: string | string[];
  tags?: string[];  // tag IDs or names
  search?: string;  // full-text search
}

/**
 * Sort options for projects
 */
export interface ProjectSort {
  field: 'name' | 'discoveredAt' | 'analyzedAt' | 'updatedAt' | 'fileCount' | 'size';
  order: SortOrder;
}
