/**
 * API Request and Response Types
 * Defines the contract between frontend and backend
 */

import {
  Project,
  ProjectAnalysis,
  Tag,
  ProjectStatus,
  ProjectFilters,
  ProjectSort,
  PaginationMeta,
  SerializedProject,
  SerializedProjectAnalysis,
} from './index';

// ============================================================================
// Common Response Wrappers
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, any>;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  error?: ApiError;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;  // Only in development
}

// ============================================================================
// Project Endpoints
// ============================================================================

/**
 * GET /api/projects - List projects with filters and pagination
 */
export interface ListProjectsRequest {
  page?: number;
  pageSize?: number;
  filters?: ProjectFilters;
  sort?: ProjectSort;
}

export type ListProjectsResponse = PaginatedResponse<SerializedProject>;

/**
 * GET /api/projects/:id - Get single project with details
 */
export interface GetProjectRequest {
  id: string;
  includeAnalyses?: boolean;
  includeTags?: boolean;
}

export interface GetProjectResponse extends ApiResponse<SerializedProject & {
  analyses?: SerializedProjectAnalysis[];
  tags?: Tag[];
}> {}

/**
 * POST /api/projects - Manually add a project (edge case, usually auto-discovered)
 */
export interface CreateProjectRequest {
  path: string;
  name?: string;
  description?: string;
}

export type CreateProjectResponse = ApiResponse<SerializedProject>;

/**
 * PUT /api/projects/:id - Update project metadata
 */
export interface UpdateProjectRequest {
  id: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  tags?: string[];  // tag IDs
}

export type UpdateProjectResponse = ApiResponse<SerializedProject>;

/**
 * DELETE /api/projects/:id - Archive/delete a project
 */
export interface DeleteProjectRequest {
  id: string;
  hardDelete?: boolean;  // true = delete, false = archive (default)
}

export type DeleteProjectResponse = ApiResponse<{ deleted: boolean }>;

/**
 * POST /api/projects/:id/analyze - Trigger manual analysis
 */
export interface AnalyzeProjectRequest {
  id: string;
  forceRefresh?: boolean;  // Bypass cache
}

export type AnalyzeProjectResponse = ApiResponse<{ queued: boolean; jobId?: string }>;

// ============================================================================
// System Integration Endpoints (macOS)
// ============================================================================

/**
 * POST /api/projects/:id/reveal - Open in Finder
 */
export interface RevealProjectRequest {
  id: string;
}

export type RevealProjectResponse = ApiResponse<{ revealed: boolean }>;

/**
 * POST /api/projects/:id/open - Open in VSCode
 */
export interface OpenProjectRequest {
  id: string;
  editor?: 'vscode' | 'cursor' | 'zed';  // Future: support multiple editors
}

export type OpenProjectResponse = ApiResponse<{ opened: boolean }>;

// ============================================================================
// Search Endpoints
// ============================================================================

/**
 * GET /api/search - Full-text search across projects
 */
export interface SearchRequest {
  query: string;
  filters?: ProjectFilters;
  page?: number;
  pageSize?: number;
}

export type SearchResponse = PaginatedResponse<SerializedProject>;

// ============================================================================
// Tags Endpoints
// ============================================================================

/**
 * GET /api/tags - List all tags
 */
export type ListTagsResponse = ApiResponse<Tag[]>;

/**
 * POST /api/tags - Create a new tag
 */
export interface CreateTagRequest {
  name: string;
  color?: string;
}

export type CreateTagResponse = ApiResponse<Tag>;

/**
 * PUT /api/tags/:id - Update tag
 */
export interface UpdateTagRequest {
  id: string;
  name?: string;
  color?: string;
}

export type UpdateTagResponse = ApiResponse<Tag>;

/**
 * DELETE /api/tags/:id - Delete tag
 */
export interface DeleteTagRequest {
  id: string;
}

export type DeleteTagResponse = ApiResponse<{ deleted: boolean }>;

// ============================================================================
// Analytics/Stats Endpoints
// ============================================================================

/**
 * GET /api/stats - Dashboard statistics
 */
export interface ProjectStats {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  byFramework: Record<string, number>;
  byLanguage: Record<string, number>;
  recentlyDiscovered: number;  // Last 7 days
  recentlyAnalyzed: number;    // Last 7 days
  totalSize: string;           // Total size in bytes (as string for bigint)
  averageComplexity: {
    simple: number;
    moderate: number;
    complex: number;
  };
}

export type GetStatsResponse = ApiResponse<ProjectStats>;

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /health - Service health check
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    worker: 'up' | 'down';
    fileWatcher: 'up' | 'down';
  };
  version: string;
}
