/**
 * Zod validation schemas for project endpoints
 */

import { z } from 'zod';

/**
 * Project status enum
 */
export const ProjectStatusSchema = z.enum([
  'active',
  'archived',
  'removed',
]);

/**
 * Query parameters for project list
 */
export const ProjectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  status: ProjectStatusSchema.optional(),
  framework: z.string().optional(),
  language: z.string().optional(),
  sortBy: z.enum(['name', 'updatedAt', 'createdAt', 'fileCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;

/**
 * Query parameters for project search
 */
export const ProjectSearchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  framework: z.string().optional(),
  language: z.string().optional(),
  status: ProjectStatusSchema.optional(),
});

export type ProjectSearchQuery = z.infer<typeof ProjectSearchQuerySchema>;

/**
 * Project ID parameter
 */
export const ProjectIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type ProjectIdParam = z.infer<typeof ProjectIdParamSchema>;

/**
 * Update project body
 */
export const UpdateProjectBodySchema = z.object({
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  favorite: z.boolean().optional(),
});

export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>;

/**
 * System action types
 */
export const SystemActionSchema = z.enum(['reveal', 'open', 'terminal']);

/**
 * Open project request body
 */
export const OpenProjectBodySchema = z.object({
  action: SystemActionSchema,
  editor: z.enum(['vscode', 'cursor', 'default']).optional(),
});

export type OpenProjectBody = z.infer<typeof OpenProjectBodySchema>;

/**
 * Trigger analysis request body
 */
export const TriggerAnalysisBodySchema = z.object({
  force: z.boolean().default(false),
});

export type TriggerAnalysisBody = z.infer<typeof TriggerAnalysisBodySchema>;
