/**
 * Database Service
 * Handles project persistence with transaction support
 */

import { PrismaClient, Project, ProjectStatus, Prisma } from '@prisma/client';
import { ProjectMetadata } from './metadata-extractor';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import logger from '../../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;
  private projectRepo: ProjectRepository;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.projectRepo = new ProjectRepository(this.prisma);
  }

  /**
   * Save or update project with metadata
   */
  async saveProject(metadata: ProjectMetadata): Promise<Project> {
    // Check if project already exists
    const existing = await this.projectRepo.findProjectByPath(metadata.path);

    if (existing) {
      // Update existing project
      return await this.updateProject(existing.id, metadata);
    } else {
      // Create new project
      return await this.createProject(metadata);
    }
  }

  /**
   * Create new project
   */
  private async createProject(metadata: ProjectMetadata): Promise<Project> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create project
        const project = await tx.project.create({
          data: {
            name: metadata.name,
            path: metadata.path,
            description: metadata.description,
            framework: metadata.framework,
            language: metadata.language,
            packageManager: metadata.packageManager,
            fileCount: metadata.fileCount,
            lastModified: metadata.lastModified,
            size: metadata.size,
            status: ProjectStatus.DISCOVERED,
            isActive: true,
          },
        });

        return project;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation - project path already exists
          // This can happen in race conditions, fetch and return existing
          const existing = await this.projectRepo.findProjectByPath(metadata.path);
          if (existing) return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Update existing project
   */
  private async updateProject(projectId: string, metadata: ProjectMetadata): Promise<Project> {
    return await this.prisma.$transaction(async (tx) => {
      return await tx.project.update({
        where: { id: projectId },
        data: {
          name: metadata.name,
          description: metadata.description,
          framework: metadata.framework,
          language: metadata.language,
          packageManager: metadata.packageManager,
          fileCount: metadata.fileCount,
          lastModified: metadata.lastModified,
          size: metadata.size,
          isActive: true,
        },
      });
    });
  }

  /**
   * Batch create or update projects (for bulk discovery)
   */
  async batchSaveProjects(
    metadataList: ProjectMetadata[]
  ): Promise<{ created: number; updated: number; failed: number }> {
    let created = 0;
    let updated = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming database
    const batchSize = 10;
    for (let i = 0; i < metadataList.length; i += batchSize) {
      const batch = metadataList.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (metadata) => {
          try {
            const existing = await this.projectRepo.findProjectByPath(metadata.path);
            if (existing) {
              await this.updateProject(existing.id, metadata);
              updated++;
            } else {
              await this.createProject(metadata);
              created++;
            }
          } catch (error) {
            logger.error(`Failed to save project ${metadata.name}:`, error);
            failed++;
          }
        })
      );
    }

    return { created, updated, failed };
  }

  /**
   * Mark project as removed
   */
  async markProjectRemoved(projectPath: string): Promise<Project | null> {
    return await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { path: projectPath },
      });

      if (project) {
        return await tx.project.update({
          where: { id: project.id },
          data: {
            isActive: false,
            status: ProjectStatus.ARCHIVED,
          },
        });
      }

      return null;
    });
  }

  /**
   * Update project status
   */
  async updateProjectStatus(
    projectPath: string,
    status: ProjectStatus
  ): Promise<Project | null> {
    const project = await this.projectRepo.findProjectByPath(projectPath);
    if (!project) return null;

    return await this.projectRepo.updateProjectStatus(
      project.id,
      status,
      status === ProjectStatus.ANALYZED ? new Date() : undefined
    );
  }

  /**
   * Get or create project (idempotent)
   */
  async getOrCreateProject(metadata: ProjectMetadata): Promise<Project> {
    const existing = await this.projectRepo.findProjectByPath(metadata.path);
    if (existing) return existing;

    return await this.createProject(metadata);
  }

  /**
   * Concurrent-safe project creation
   * Handles race conditions where multiple workers try to create same project
   */
  async createProjectSafe(metadata: ProjectMetadata): Promise<{
    project: Project;
    created: boolean;
  }> {
    try {
      // Try to create
      const project = await this.createProject(metadata);
      return { project, created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Race condition - another worker created it
          // Wait a bit and fetch
          await new Promise((resolve) => setTimeout(resolve, 100));
          const existing = await this.projectRepo.findProjectByPath(metadata.path);
          if (existing) {
            return { project: existing, created: false };
          }
        }
      }
      throw error;
    }
  }

  /**
   * Update project with optimistic locking
   */
  async updateProjectWithLock(
    projectPath: string,
    updates: Partial<ProjectMetadata>
  ): Promise<Project | null> {
    return await this.prisma.$transaction(
      async (tx) => {
        // Lock the row for update
        const project = await tx.project.findUnique({
          where: { path: projectPath },
        });

        if (!project) return null;

        // Apply updates
        return await tx.project.update({
          where: {
            id: project.id,
            // Optimistic lock: only update if not changed
            updatedAt: project.updatedAt,
          },
          data: {
            ...(updates.name && { name: updates.name }),
            ...(updates.description && { description: updates.description }),
            ...(updates.framework && { framework: updates.framework }),
            ...(updates.language && { language: updates.language }),
            ...(updates.packageManager && { packageManager: updates.packageManager }),
            ...(updates.fileCount && { fileCount: updates.fileCount }),
            ...(updates.size && { size: updates.size }),
            ...(updates.lastModified && { lastModified: updates.lastModified }),
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }

  /**
   * Clean up inactive projects older than specified days
   */
  async cleanupInactiveProjects(days: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.project.deleteMany({
      where: {
        isActive: false,
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get database health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
