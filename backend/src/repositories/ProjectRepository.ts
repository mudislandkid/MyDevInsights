/**
 * Project Repository
 * Data access layer for Project model with comprehensive CRUD operations
 */

import { PrismaClient, Project, ProjectStatus, Prisma } from '@prisma/client';
import { NotFoundError, DuplicateError, ValidationError } from '../utils/errors';
import {
  PaginationParams,
  PaginationResult,
  calculatePagination,
  getPaginationSkipTake,
  validatePaginationParams,
} from '../utils/pagination';

export interface ProjectCreateInput {
  name: string;
  path: string;
  description?: string;
  framework?: string;
  language?: string;
  packageManager?: string;
  fileCount?: number;
  lastModified?: Date;
  size?: bigint;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  framework?: string;
  language?: string;
  packageManager?: string;
  fileCount?: number;
  lastModified?: Date;
  size?: bigint;
  status?: ProjectStatus;
  isActive?: boolean;
  analyzedAt?: Date;
}

export interface ProjectFilters {
  status?: ProjectStatus | ProjectStatus[];
  framework?: string | string[];
  language?: string | string[];
  tags?: string[]; // Tag IDs
  search?: string;
  isActive?: boolean;
}

export interface ProjectWithRelations extends Project {
  analyses?: any[];
  tags?: any[];
}

export class ProjectRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new project
   */
  async createProject(data: ProjectCreateInput): Promise<Project> {
    try {
      // Check if project with same path already exists
      const existing = await this.prisma.project.findUnique({
        where: { path: data.path },
      });

      if (existing) {
        throw new DuplicateError('Project', 'path', data.path);
      }

      return await this.prisma.project.create({
        data: {
          ...data,
          status: ProjectStatus.DISCOVERED,
        },
      });
    } catch (error) {
      if (error instanceof DuplicateError) throw error;
      throw new ValidationError(`Failed to create project: ${error}`);
    }
  }

  /**
   * Find project by path
   */
  async findProjectByPath(path: string): Promise<Project | null> {
    return await this.prisma.project.findUnique({
      where: { path },
    });
  }

  /**
   * Find project by ID
   */
  async findProjectById(id: string): Promise<Project | null> {
    return await this.prisma.project.findUnique({
      where: { id },
    });
  }

  /**
   * Get project with all related data (analyses and tags)
   */
  async getProjectWithAnalysis(id: string): Promise<ProjectWithRelations> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Latest 5 analyses
        },
        tags: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    return project;
  }

  /**
   * Update project status
   */
  async updateProjectStatus(
    id: string,
    status: ProjectStatus,
    analyzedAt?: Date
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    return await this.prisma.project.update({
      where: { id },
      data: {
        status,
        ...(analyzedAt && { analyzedAt }),
      },
    });
  }

  /**
   * Update project
   */
  async updateProject(id: string, data: ProjectUpdateInput): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    return await this.prisma.project.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete project (cascade deletes analyses)
   */
  async deleteProject(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    return await this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Archive project (soft delete)
   */
  async archiveProject(id: string): Promise<Project> {
    return await this.updateProjectStatus(id, ProjectStatus.ARCHIVED);
  }

  /**
   * List projects with filters and pagination
   */
  async listProjects(
    filters: ProjectFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginationResult<ProjectWithRelations>> {
    const { page, pageSize } = validatePaginationParams(
      pagination.page,
      pagination.pageSize
    );
    const { skip, take } = getPaginationSkipTake(page, pageSize);

    // Build where clause
    const where: Prisma.ProjectWhereInput = {
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    };

    // Status filter
    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }

    // Framework filter
    if (filters.framework) {
      where.framework = Array.isArray(filters.framework)
        ? { in: filters.framework }
        : filters.framework;
    }

    // Language filter
    if (filters.language) {
      where.language = Array.isArray(filters.language)
        ? { in: filters.language }
        : filters.language;
    }

    // Tags filter (projects that have ANY of the specified tags)
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        some: {
          id: { in: filters.tags },
        },
      };
    }

    // Search filter (name or description contains search term)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await this.prisma.project.count({ where });

    // Get paginated data
    const data = await this.prisma.project.findMany({
      where,
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Latest analysis only for list view
        },
        tags: true,
      },
      orderBy: { discoveredAt: 'desc' },
      skip,
      take,
    });

    return {
      data,
      pagination: calculatePagination(total, page, pageSize),
    };
  }

  /**
   * Bulk create projects
   */
  async bulkCreateProjects(
    projects: ProjectCreateInput[]
  ): Promise<Prisma.BatchPayload> {
    return await this.prisma.project.createMany({
      data: projects.map((p) => ({
        ...p,
        status: ProjectStatus.DISCOVERED,
      })),
      skipDuplicates: true, // Skip if path already exists
    });
  }

  /**
   * Get projects by status
   */
  async getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
    return await this.prisma.project.findMany({
      where: { status },
      orderBy: { discoveredAt: 'desc' },
    });
  }

  /**
   * Count projects by status
   */
  async countByStatus(): Promise<Record<ProjectStatus, number>> {
    const counts = await this.prisma.project.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: any = {};
    Object.values(ProjectStatus).forEach((status) => {
      result[status] = 0;
    });

    counts.forEach((item) => {
      result[item.status] = item._count;
    });

    return result;
  }

  /**
   * Get recently discovered projects
   */
  async getRecentlyDiscovered(limit: number = 10): Promise<Project[]> {
    return await this.prisma.project.findMany({
      where: { isActive: true },
      orderBy: { discoveredAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get recently analyzed projects
   */
  async getRecentlyAnalyzed(limit: number = 10): Promise<Project[]> {
    return await this.prisma.project.findMany({
      where: {
        isActive: true,
        status: ProjectStatus.ANALYZED,
        analyzedAt: { not: null },
      },
      orderBy: { analyzedAt: 'desc' },
      take: limit,
    });
  }
}
