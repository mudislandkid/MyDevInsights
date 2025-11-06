/**
 * Project routes
 */

import { FastifyInstance } from 'fastify';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { AnalysisRepository } from '../repositories/AnalysisRepository';
import { TagRepository } from '../repositories/TagRepository';
import { ProjectStatus } from '@prisma/client';
import {
  ProjectListQuerySchema,
  ProjectSearchQuerySchema,
  ProjectIdParamSchema,
  UpdateProjectBodySchema,
  OpenProjectBodySchema,
  TriggerAnalysisBodySchema,
} from '../schemas';
import { validatePath, sanitizeCommand } from '../middleware/security';
import { db } from '../lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../utils/logger';
import { transformProjectsForFrontend, transformProjectForFrontend } from '../utils/project-transform';
import { MetadataExtractor, DatabaseService } from '../services/metadata';

const execAsync = promisify(exec);

export async function projectRoutes(fastify: FastifyInstance) {
  const projectRepo = new ProjectRepository(db);
  const analysisRepo = new AnalysisRepository(db);
  const tagRepo = new TagRepository(db);

  /**
   * GET /projects - List projects with pagination and filtering
   */
  fastify.get('/', async (_request, reply) => {
    const query = ProjectListQuerySchema.parse(_request.query);

    const filters: any = {};
    if (query.status) filters.status = query.status;
    if (query.framework) filters.framework = query.framework;
    if (query.language) filters.language = query.language;

    const result = await projectRepo.listProjects(filters, {
      page: query.page,
      pageSize: query.limit,
    });

    return reply.send({
      data: transformProjectsForFrontend(result.data),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      },
    });
  });

  /**
   * GET /projects/search - Search projects
   */
  fastify.get('/search', async (_request, reply) => {
    const query = ProjectSearchQuerySchema.parse(_request.query);

    const filters: any = { search: query.q };
    if (query.framework) filters.framework = query.framework;
    if (query.language) filters.language = query.language;
    if (query.status) filters.status = query.status;

    const result = await projectRepo.listProjects(filters, {
      page: query.page,
      pageSize: query.limit,
    });

    return reply.send({
      data: transformProjectsForFrontend(result.data),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      },
    });
  });

  /**
   * GET /projects/:id - Get project details
   */
  fastify.get('/:id', async (_request, reply) => {
    const params = ProjectIdParamSchema.parse(_request.params);

    const project = await projectRepo.getProjectWithAnalysis(params.id);
    if (!project) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    return reply.send({
      data: transformProjectForFrontend(project),
    });
  });

  /**
   * PUT /projects/:id - Update project
   */
  fastify.put('/:id', async (_request, reply) => {
    const params = ProjectIdParamSchema.parse(_request.params);
    const body = UpdateProjectBodySchema.parse(_request.body);

    // Check if project exists
    const existing = await projectRepo.findProjectById(params.id);
    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Update project
    const updates: any = {};
    if (body.status !== undefined) {
      // Map lowercase to uppercase enum
      if (body.status === 'active') {
        updates.status = ProjectStatus.DISCOVERED;
      } else if (body.status === 'archived' || body.status === 'removed') {
        updates.status = ProjectStatus.ARCHIVED;
      }
    }
    if (body.notes !== undefined) updates.description = body.notes;

    await projectRepo.updateProject(params.id, updates);

    // Handle tags if provided
    if (body.tags !== undefined) {
      // Find or create tags
      const tagPromises = body.tags.map(tagName =>
        tagRepo.findOrCreateTag(tagName)
      );
      const tags = await Promise.all(tagPromises);
      const tagIds = tags.map(t => t.id);

      // Get current tag IDs
      const projectWithTags = await projectRepo.getProjectWithAnalysis(params.id);
      const currentTagIds = projectWithTags.tags?.map(t => t.id) || [];

      // Remove old tags
      if (currentTagIds.length > 0) {
        await tagRepo.removeTagsFromProject(params.id, currentTagIds);
      }

      // Add new tags
      if (tagIds.length > 0) {
        await tagRepo.addTagsToProject(params.id, tagIds);
      }
    }

    // Get updated project with tags
    const updatedProject = await projectRepo.getProjectWithAnalysis(params.id);

    return reply.send({
      data: transformProjectForFrontend(updatedProject),
    });
  });

  /**
   * DELETE /projects/:id - Archive/delete project
   */
  fastify.delete('/:id', async (_request, reply) => {
    const params = ProjectIdParamSchema.parse(_request.params);

    const project = await projectRepo.findProjectById(params.id);
    if (!project) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Archive instead of delete
    await projectRepo.updateProjectStatus(params.id, ProjectStatus.ARCHIVED);

    return reply.status(204).send();
  });

  /**
   * POST /projects/:id/reveal - Get project path for clipboard
   */
  fastify.post('/:id/reveal', async (_request, reply) => {
    const params = ProjectIdParamSchema.parse(_request.params);

    const project = await projectRepo.findProjectById(params.id);
    if (!project) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Validate path
    const isValid = await validatePath(project.path);
    if (!isValid) {
      return reply.status(400).send({
        error: 'Invalid Path',
        message: 'Project path is invalid or inaccessible',
      });
    }

    // Return path for frontend to copy to clipboard
    logger.info(`Provided path for project: ${project.name}`);

    return reply.send({
      success: true,
      path: project.path,
      message: 'Project path copied to clipboard',
    });
  });

  /**
   * POST /projects/:id/open - Open project in editor
   */
  fastify.post('/:id/open', async (_request, reply) => {
    const params = ProjectIdParamSchema.parse(_request.params);
    const body = OpenProjectBodySchema.parse(_request.body);

    const project = await projectRepo.findProjectById(params.id);
    if (!project) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Validate path
    const isValid = await validatePath(project.path);
    if (!isValid) {
      return reply.status(400).send({
        error: 'Invalid Path',
        message: 'Project path is invalid or inaccessible',
      });
    }

    try {
      const sanitizedPath = sanitizeCommand(project.path);

      if (body.action === 'open') {
        // Open in editor
        const editor = body.editor || 'vscode';
        let command: string;

        switch (editor) {
          case 'vscode':
            command = `code "${sanitizedPath}"`;
            break;
          case 'cursor':
            command = `cursor "${sanitizedPath}"`;
            break;
          default:
            command = `open "${sanitizedPath}"`;
        }

        await execAsync(command);
        logger.info(`Opened project in ${editor}: ${project.name}`);

        return reply.send({
          success: true,
          message: `Project opened in ${editor}`,
        });
      } else if (body.action === 'terminal') {
        // Open in terminal
        await execAsync(`open -a Terminal "${sanitizedPath}"`);
        logger.info(`Opened project in Terminal: ${project.name}`);

        return reply.send({
          success: true,
          message: 'Project opened in Terminal',
        });
      } else {
        // Reveal (same as /reveal endpoint)
        await execAsync(`open "${sanitizedPath}"`);
        return reply.send({
          success: true,
          message: 'Project opened in Finder',
        });
      }
    } catch (error: any) {
      logger.error(`Failed to open project: ${error.message}`);
      return reply.status(500).send({
        error: 'System Error',
        message: 'Failed to open project',
      });
    }
  });

  /**
   * POST /projects/:id/analyze - Trigger AI analysis
   */
  fastify.post('/:id/analyze', async (_request, reply) => {
    const params = ProjectIdParamSchema.parse(_request.params);
    const body = TriggerAnalysisBodySchema.parse(_request.body);

    const project = await projectRepo.findProjectById(params.id);
    if (!project) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Check if recent analysis exists (optional force check)
    if (!body.force) {
      const existing = await analysisRepo.getLatestAnalysis(params.id);
      if (existing) {
        const ageMinutes = (Date.now() - existing.createdAt.getTime()) / 1000 / 60;
        if (ageMinutes < 60) {
          return reply.status(409).send({
            error: 'Analysis Too Recent',
            message: 'An analysis was run less than 1 hour ago. Use force=true to re-analyze.',
          });
        }
      }
    }

    try {
      // Import queue client
      const { getAnalysisQueue } = await import('../lib/analysis-queue');
      const queueClient = await getAnalysisQueue();

      // Update project status to ANALYZING
      await projectRepo.updateProjectStatus(params.id, ProjectStatus.ANALYZING);

      // Queue the analysis job
      const jobId = await queueClient.addAnalysisJob({
        projectId: params.id,
        projectPath: project.path,
        projectName: project.name,
        priority: 'normal',
        forceRefresh: body.force,
      });

      logger.info(`Analysis job ${jobId} queued for project: ${project.name}`);

      return reply.status(202).send({
        success: true,
        message: 'Analysis job queued',
        projectId: params.id,
        jobId,
      });
    } catch (error: any) {
      logger.error(`Failed to queue analysis job: ${error.message}`);

      // Reset status on error
      await projectRepo.updateProjectStatus(params.id, ProjectStatus.DISCOVERED);

      return reply.status(500).send({
        error: 'Queue Error',
        message: 'Failed to queue analysis job',
      });
    }
  });

  /**
   * GET /projects/:id/analysis - Get analysis history
   */
  fastify.get('/:id/analysis', async (_request, reply) => {
    const params = ProjectIdParamSchema.parse(_request.params);

    const project = await projectRepo.findProjectById(params.id);
    if (!project) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    const analyses = await analysisRepo.getAnalysesByProjectId(params.id);

    return reply.send({
      data: analyses,
    });
  });

  /**
   * POST /projects/scan - Manually scan for projects
   * Query params:
   *   - resetDeleted: boolean (default: false) - Clear ignore flags for deleted projects
   */
  fastify.post('/scan', async (_request, reply) => {
    const query = _request.query as { resetDeleted?: string };
    const resetDeleted = query.resetDeleted === 'true';

    logger.info('🔍 Starting manual project scan...', { resetDeleted });

    try {
      // Get watch path from environment
      const watchPath = process.env.WATCH_PATH || '/projects';

      // Verify watch path exists
      try {
        await fs.access(watchPath);
      } catch {
        return reply.status(400).send({
          error: 'Invalid Configuration',
          message: `Watch path does not exist: ${watchPath}`,
        });
      }

      // Reset deleted projects if requested
      if (resetDeleted) {
        logger.info('🔄 Resetting deleted projects...');
        const resetCount = await db.project.updateMany({
          where: { isActive: false },
          data: { isActive: true, status: ProjectStatus.DISCOVERED },
        });
        logger.info(`✅ Reset ${resetCount.count} deleted projects`);
      }

      // Read directory contents
      const entries = await fs.readdir(watchPath, { withFileTypes: true });
      const directories = entries
        .filter((entry) => entry.isDirectory())
        .filter((entry) => !entry.name.startsWith('.')) // Skip hidden directories
        .map((entry) => path.join(watchPath, entry.name));

      logger.info(`📁 Found ${directories.length} directories to scan`);

      const metadataExtractor = new MetadataExtractor();
      const databaseService = new DatabaseService(db);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;

      // Process each directory
      for (const dirPath of directories) {
        try {
          // Use same validation logic as file-watcher
          const isValid = await metadataExtractor.isValidProject(dirPath);

          if (!isValid) {
            logger.debug(`⏭️  Skipping non-project directory: ${dirPath}`);
            skipped++;
            continue;
          }

          // Extract metadata
          const metadata = await metadataExtractor.extractMetadata(dirPath);

          // Check if project already exists
          const existing = await projectRepo.findProjectByPath(dirPath);

          if (existing) {
            // Update existing project
            await projectRepo.updateProject(existing.id, {
              name: metadata.name,
              description: metadata.description,
              framework: metadata.framework,
              language: metadata.language,
              packageManager: metadata.packageManager,
              fileCount: metadata.fileCount,
              size: metadata.size,
              lastModified: metadata.lastModified,
              isActive: true,
            });
            logger.info(`♻️  Updated project: ${metadata.name}`);
            updated++;
          } else {
            // Create new project using safe method
            const result = await databaseService.createProjectSafe(metadata);
            if (result.created) {
              logger.info(`✅ Created project: ${metadata.name}`);
              created++;
            } else {
              logger.info(`♻️  Project already exists: ${metadata.name}`);
              updated++;
            }
          }
        } catch (error) {
          logger.error(`❌ Failed to process ${dirPath}:`, error);
          failed++;
        }
      }

      const summary = {
        scanned: directories.length,
        created,
        updated,
        skipped,
        failed,
        resetDeleted: resetDeleted ? true : false,
      };

      logger.info('✅ Manual scan complete', summary);

      return reply.send({
        success: true,
        message: 'Scan completed successfully',
        ...summary,
      });
    } catch (error) {
      logger.error('❌ Manual scan failed:', error);
      return reply.status(500).send({
        error: 'Scan Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /projects/reset-stuck - Reset stuck analyzing projects and clear queues
   */
  fastify.post('/reset-stuck', async (_request, reply) => {
    logger.info('🔧 Resetting stuck projects and clearing queues...');

    try {
      // Reset all projects stuck in ANALYZING state
      const result = await db.project.updateMany({
        where: { status: ProjectStatus.ANALYZING },
        data: {
          status: ProjectStatus.DISCOVERED,
          analyzedAt: null,
        },
      });

      logger.info(`✅ Reset ${result.count} stuck projects`);

      // Clear analysis queues
      let clearedJobs = 0;
      try {
        const { getAnalysisQueue } = await import('../lib/analysis-queue');
        const queueClient = await getAnalysisQueue();
        clearedJobs = await queueClient.clearAllJobs();
      } catch (error) {
        logger.warn('⚠️  Failed to clear queues:', error);
        // Continue even if queue clearing fails
      }

      return reply.send({
        success: true,
        message: 'Reset completed successfully',
        projectsReset: result.count,
        jobsCleared: clearedJobs,
      });
    } catch (error) {
      logger.error('❌ Reset failed:', error);
      return reply.status(500).send({
        error: 'Reset Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
