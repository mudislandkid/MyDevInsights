/**
 * Tag Repository
 * Data access layer for Tag model and project-tag relationships
 */

import { PrismaClient, Tag, Project } from '@prisma/client';
import { NotFoundError, DuplicateError, ValidationError } from '../utils/errors';

export interface TagCreateInput {
  name: string;
  color?: string;
}

export interface TagUpdateInput {
  name?: string;
  color?: string;
}

export interface TagWithProjects extends Tag {
  projects: Project[];
}

export class TagRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new tag
   */
  async createTag(data: TagCreateInput): Promise<Tag> {
    try {
      // Check if tag with same name already exists
      const existing = await this.prisma.tag.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new DuplicateError('Tag', 'name', data.name);
      }

      return await this.prisma.tag.create({
        data,
      });
    } catch (error) {
      if (error instanceof DuplicateError) throw error;
      throw new ValidationError(`Failed to create tag: ${error}`);
    }
  }

  /**
   * Get tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    return await this.prisma.tag.findUnique({
      where: { id },
    });
  }

  /**
   * Get tag by name
   */
  async getTagByName(name: string): Promise<Tag | null> {
    return await this.prisma.tag.findUnique({
      where: { name },
    });
  }

  /**
   * Get tag with all associated projects
   */
  async getTagWithProjects(id: string): Promise<TagWithProjects> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        projects: {
          where: { isActive: true },
          orderBy: { discoveredAt: 'desc' },
        },
      },
    });

    if (!tag) {
      throw new NotFoundError('Tag', id);
    }

    return tag;
  }

  /**
   * List all tags
   */
  async listTags(): Promise<Tag[]> {
    return await this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * List tags with project counts
   */
  async listTagsWithCounts(): Promise<
    Array<Tag & { _count: { projects: number } }>
  > {
    return await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update tag
   */
  async updateTag(id: string, data: TagUpdateInput): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });

    if (!tag) {
      throw new NotFoundError('Tag', id);
    }

    // Check for name uniqueness if name is being updated
    if (data.name && data.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new DuplicateError('Tag', 'name', data.name);
      }
    }

    return await this.prisma.tag.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete tag
   */
  async deleteTag(id: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });

    if (!tag) {
      throw new NotFoundError('Tag', id);
    }

    return await this.prisma.tag.delete({
      where: { id },
    });
  }

  /**
   * Add tags to a project
   */
  async addTagsToProject(
    projectId: string,
    tagIds: string[]
  ): Promise<Project> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Verify all tags exist
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    if (tags.length !== tagIds.length) {
      throw new NotFoundError('Tag', 'one or more tag IDs');
    }

    return await this.prisma.project.update({
      where: { id: projectId },
      data: {
        tags: {
          connect: tagIds.map((id) => ({ id })),
        },
      },
      include: {
        tags: true,
      },
    });
  }

  /**
   * Remove tags from a project
   */
  async removeTagsFromProject(
    projectId: string,
    tagIds: string[]
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    return await this.prisma.project.update({
      where: { id: projectId },
      data: {
        tags: {
          disconnect: tagIds.map((id) => ({ id })),
        },
      },
      include: {
        tags: true,
      },
    });
  }

  /**
   * Get projects by tag
   */
  async getProjectsByTag(tagId: string): Promise<Project[]> {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        projects: {
          where: { isActive: true },
          orderBy: { discoveredAt: 'desc' },
        },
      },
    });

    if (!tag) {
      throw new NotFoundError('Tag', tagId);
    }

    return tag.projects;
  }

  /**
   * Get projects by tag name
   */
  async getProjectsByTagName(tagName: string): Promise<Project[]> {
    const tag = await this.prisma.tag.findUnique({
      where: { name: tagName },
      include: {
        projects: {
          where: { isActive: true },
          orderBy: { discoveredAt: 'desc' },
        },
      },
    });

    if (!tag) {
      throw new NotFoundError('Tag', tagName);
    }

    return tag.projects;
  }

  /**
   * Get popular tags (most used)
   */
  async getPopularTags(limit: number = 10): Promise<
    Array<Tag & { _count: { projects: number } }>
  > {
    return await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: {
        projects: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  /**
   * Find or create tag by name
   */
  async findOrCreateTag(name: string, color?: string): Promise<Tag> {
    const existing = await this.prisma.tag.findUnique({
      where: { name },
    });

    if (existing) {
      return existing;
    }

    return await this.createTag({ name, color });
  }

  /**
   * Bulk create tags
   */
  async bulkCreateTags(tags: TagCreateInput[]): Promise<number> {
    const result = await this.prisma.tag.createMany({
      data: tags,
      skipDuplicates: true,
    });

    return result.count;
  }
}
