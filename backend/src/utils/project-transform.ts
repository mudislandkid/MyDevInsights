/**
 * Project Data Transformation Utilities
 * Transforms database project format to frontend API format
 */

/**
 * Transform a project with analyses to frontend format
 */
export function transformProjectForFrontend(project: any) {
  const latestAnalysis = project.analyses?.[0];

  return {
    id: project.id,
    name: project.name,
    path: project.path,
    description: project.description,
    status: project.status,

    // Map framework/language to primary fields
    primaryFramework: project.framework,
    primaryLanguage: project.language,

    // Legacy fields for compatibility
    framework: project.framework,
    language: project.language,
    frameworks: project.framework ? [project.framework] : [],

    packageManager: project.packageManager,
    fileCount: project.fileCount,
    linesOfCode: project.linesOfCode,
    totalSize: project.size ? Number(project.size) : undefined,
    lastModified: project.lastModified,

    // Analysis data from latest analysis
    aiSummary: latestAnalysis?.summary,
    techStack: latestAnalysis?.techStack,
    complexity: latestAnalysis?.complexity,
    recommendations: latestAnalysis?.recommendations,
    completionScore: latestAnalysis?.completionScore,
    maturityLevel: latestAnalysis?.maturityLevel,
    productionGaps: latestAnalysis?.productionGaps,
    estimatedValue: latestAnalysis?.estimatedValue,

    // Metadata
    createdAt: project.discoveredAt,
    updatedAt: project.updatedAt,
    lastAnalyzedAt: project.analyzedAt,

    // Relations
    tags: project.tags || [],
    analyses: project.analyses || [],

    // Calculated fields
    isActive: project.isActive,
    favorite: project.isFavorite || false,
  };
}

/**
 * Transform array of projects
 */
export function transformProjectsForFrontend(projects: any[]) {
  return projects.map(transformProjectForFrontend);
}
