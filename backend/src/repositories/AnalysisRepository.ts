/**
 * Analysis Repository
 * Data access layer for ProjectAnalysis model
 */

import { PrismaClient, ProjectAnalysis, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface AnalysisCreateInput {
  projectId: string;
  summary: string;
  techStack: Record<string, string[]>;
  complexity?: string;
  recommendations?: any[];
  model: string;
  tokensUsed?: number;
  cacheHit?: boolean;
}

export interface AnalysisUpdateInput {
  summary?: string;
  techStack?: Record<string, string[]>;
  complexity?: string;
  recommendations?: any[];
  tokensUsed?: number;
  cacheHit?: boolean;
}

export class AnalysisRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Save new analysis for a project
   */
  async saveAnalysis(data: AnalysisCreateInput): Promise<ProjectAnalysis> {
    try {
      // Verify project exists
      const project = await this.prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw new NotFoundError('Project', data.projectId);
      }

      return await this.prisma.projectAnalysis.create({
        data: {
          ...data,
          techStack: data.techStack as Prisma.JsonObject,
          recommendations: (data.recommendations || []) as Prisma.JsonArray,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new ValidationError(`Failed to save analysis: ${error}`);
    }
  }

  /**
   * Get analysis by ID
   */
  async getAnalysisById(id: string): Promise<ProjectAnalysis | null> {
    return await this.prisma.projectAnalysis.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });
  }

  /**
   * Get all analyses for a project
   */
  async getAnalysesByProjectId(projectId: string): Promise<ProjectAnalysis[]> {
    return await this.prisma.projectAnalysis.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get latest analysis for a project
   */
  async getLatestAnalysis(projectId: string): Promise<ProjectAnalysis | null> {
    return await this.prisma.projectAnalysis.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update analysis
   */
  async updateAnalysis(
    id: string,
    data: AnalysisUpdateInput
  ): Promise<ProjectAnalysis> {
    const analysis = await this.prisma.projectAnalysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    return await this.prisma.projectAnalysis.update({
      where: { id },
      data: {
        ...data,
        ...(data.techStack && { techStack: data.techStack as Prisma.JsonObject }),
        ...(data.recommendations && {
          recommendations: data.recommendations as Prisma.JsonArray,
        }),
      },
    });
  }

  /**
   * Delete analysis
   */
  async deleteAnalysis(id: string): Promise<ProjectAnalysis> {
    const analysis = await this.prisma.projectAnalysis.findUnique({
      where: { id },
    });

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    return await this.prisma.projectAnalysis.delete({
      where: { id },
    });
  }

  /**
   * Delete all analyses for a project
   */
  async deleteAnalysesByProjectId(
    projectId: string
  ): Promise<Prisma.BatchPayload> {
    return await this.prisma.projectAnalysis.deleteMany({
      where: { projectId },
    });
  }

  /**
   * Check if project has cached analysis
   */
  async hasCachedAnalysis(projectId: string): Promise<boolean> {
    const count = await this.prisma.projectAnalysis.count({
      where: {
        projectId,
        cacheHit: true,
      },
    });

    return count > 0;
  }

  /**
   * Get cache hit rate statistics
   */
  async getCacheHitRate(): Promise<{
    total: number;
    cacheHits: number;
    hitRate: number;
  }> {
    const total = await this.prisma.projectAnalysis.count();
    const cacheHits = await this.prisma.projectAnalysis.count({
      where: { cacheHit: true },
    });

    return {
      total,
      cacheHits,
      hitRate: total > 0 ? (cacheHits / total) * 100 : 0,
    };
  }

  /**
   * Get total tokens used across all analyses
   */
  async getTotalTokensUsed(): Promise<number> {
    const result = await this.prisma.projectAnalysis.aggregate({
      _sum: {
        tokensUsed: true,
      },
    });

    return result._sum.tokensUsed || 0;
  }

  /**
   * Get analyses by complexity level
   */
  async getAnalysesByComplexity(
    complexity: string
  ): Promise<ProjectAnalysis[]> {
    return await this.prisma.projectAnalysis.findMany({
      where: { complexity },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get projects grouped by complexity
   */
  async getComplexityDistribution(): Promise<
    Record<string, number>
  > {
    const result = await this.prisma.projectAnalysis.groupBy({
      by: ['complexity'],
      _count: true,
    });

    const distribution: Record<string, number> = {};
    result.forEach((item) => {
      if (item.complexity) {
        distribution[item.complexity] = item._count;
      }
    });

    return distribution;
  }
}
