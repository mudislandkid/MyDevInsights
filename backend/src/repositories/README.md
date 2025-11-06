# Repository Layer

Data access layer for MyDevInsights database operations using Prisma ORM.

## Structure

- `ProjectRepository.ts` - CRUD operations for projects
- `AnalysisRepository.ts` - CRUD operations for project analyses
- `TagRepository.ts` - CRUD operations for tags and project-tag relationships

## Usage Examples

### ProjectRepository

```typescript
import { getPrismaClient } from '../lib/db';
import { ProjectRepository, ProjectStatus } from './repositories';

const prisma = getPrismaClient();
const projectRepo = new ProjectRepository(prisma);

// Create a new project
const project = await projectRepo.createProject({
  name: 'My Awesome Project',
  path: '/projects/my-awesome-project',
  framework: 'React',
  language: 'TypeScript',
  packageManager: 'npm',
});

// Find project by path
const found = await projectRepo.findProjectByPath('/projects/my-awesome-project');

// Update project status
await projectRepo.updateProjectStatus(project.id, ProjectStatus.ANALYZING);

// List projects with filters and pagination
const { data, pagination } = await projectRepo.listProjects(
  {
    status: ProjectStatus.ANALYZED,
    framework: 'React',
    search: 'awesome',
  },
  { page: 1, pageSize: 20 }
);

// Get project with all related data
const withAnalysis = await projectRepo.getProjectWithAnalysis(project.id);

// Delete project
await projectRepo.deleteProject(project.id);
```

### AnalysisRepository

```typescript
import { AnalysisRepository } from './repositories';

const analysisRepo = new AnalysisRepository(prisma);

// Save analysis result
const analysis = await analysisRepo.saveAnalysis({
  projectId: project.id,
  summary: 'This is a React application built with TypeScript...',
  techStack: {
    frontend: ['React', 'TypeScript', 'Vite'],
    backend: [],
    database: [],
  },
  complexity: 'moderate',
  recommendations: ['Add tests', 'Improve documentation'],
  model: 'claude-3-5-sonnet-20241022',
  tokensUsed: 1500,
  cacheHit: false,
});

// Get latest analysis
const latest = await analysisRepo.getLatestAnalysis(project.id);

// Get all analyses for a project
const all = await analysisRepo.getAnalysesByProjectId(project.id);

// Get cache hit rate statistics
const stats = await analysisRepo.getCacheHitRate();
console.log(`Cache hit rate: ${stats.hitRate.toFixed(2)}%`);
```

### TagRepository

```typescript
import { TagRepository } from './repositories';

const tagRepo = new TagRepository(prisma);

// Create tags
const reactTag = await tagRepo.createTag({
  name: 'React',
  color: '#61DAFB',
});

const frontendTag = await tagRepo.createTag({
  name: 'Frontend',
  color: '#FF6B6B',
});

// Add tags to project
await tagRepo.addTagsToProject(project.id, [reactTag.id, frontendTag.id]);

// Get projects by tag
const reactProjects = await tagRepo.getProjectsByTag(reactTag.id);

// Get popular tags
const popular = await tagRepo.getPopularTags(10);

// Find or create (idempotent)
const tag = await tagRepo.findOrCreateTag('TypeScript', '#3178C6');
```

## Transaction Support

For operations that modify multiple tables, use Prisma transactions:

```typescript
import { getPrismaClient } from '../lib/db';

const prisma = getPrismaClient();

const result = await prisma.$transaction(async (tx) => {
  // Create project
  const project = await tx.project.create({
    data: {
      name: 'Test Project',
      path: '/test',
    },
  });

  // Create analysis
  const analysis = await tx.projectAnalysis.create({
    data: {
      projectId: project.id,
      summary: 'Test summary',
      model: 'claude-3-5-sonnet',
    },
  });

  // Update project status
  await tx.project.update({
    where: { id: project.id },
    data: {
      status: 'ANALYZED',
      analyzedAt: new Date(),
    },
  });

  return { project, analysis };
});
```

## Error Handling

All repositories use custom error classes:

```typescript
import {
  NotFoundError,
  DuplicateError,
  ValidationError,
  TransactionError,
} from './repositories';

try {
  const project = await projectRepo.findProjectById('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Project not found:', error.message);
  } else if (error instanceof DuplicateError) {
    console.error('Duplicate entry:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Always use repositories** instead of direct Prisma calls for consistency
2. **Handle errors** with try-catch blocks
3. **Use transactions** for multi-table operations
4. **Validate inputs** before calling repository methods
5. **Use pagination** for list operations to avoid memory issues
6. **Close connections** properly (handled by singleton in `db.ts`)

## Testing

Repository methods can be tested using:

1. **Unit tests** with mocked Prisma client
2. **Integration tests** with test database
3. **Docker containers** for PostgreSQL in tests

Example test setup:

```typescript
import { PrismaClient } from '@prisma/client';
import { ProjectRepository } from './ProjectRepository';

describe('ProjectRepository', () => {
  let prisma: PrismaClient;
  let repo: ProjectRepository;

  beforeAll(async () => {
    prisma = new PrismaClient();
    repo = new ProjectRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a project', async () => {
    const project = await repo.createProject({
      name: 'Test',
      path: '/test',
    });

    expect(project.name).toBe('Test');
    expect(project.status).toBe('DISCOVERED');
  });
});
```
