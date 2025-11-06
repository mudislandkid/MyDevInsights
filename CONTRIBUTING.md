# Contributing to Project Viewer

First off, thank you for considering contributing to Project Viewer! It's people like you that make Project Viewer such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS 14.0, Ubuntu 22.04]
 - Docker version: [e.g. 24.0.6]
 - Node version: [e.g. 20.10.0]
 - Browser [e.g. chrome, safari]

**Logs**
Attach relevant logs from:
- `docker compose logs backend`
- `docker compose logs frontend`
- `docker compose logs analyzer-worker`
- Browser console errors

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any similar features in other applications**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following the code style guidelines
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Write clear commit messages**
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Git
- Anthropic API key

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/project-viewer.git
cd project-viewer

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/project-viewer.git

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend E2E tests
cd frontend
npm run test:e2e
```

### Database Changes

If you modify the database schema:

```bash
cd backend

# Create a migration
npx prisma migrate dev --name your_migration_name

# Generate Prisma Client
npm run prisma:generate
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Avoid `any` types when possible
- Use interfaces for object shapes
- Use type aliases for unions and complex types

**Example:**

```typescript
// Good
interface Project {
  id: string
  name: string
  status: ProjectStatus
}

type ProjectStatus = 'DISCOVERED' | 'ANALYZING' | 'ANALYZED'

// Avoid
const project: any = { ... }
```

### React Components

- Use functional components with hooks
- Keep components under 500 lines
- Extract reusable logic into custom hooks
- Use meaningful component and prop names

**Example:**

```typescript
// Good
export function ProjectCard({ project, onAnalyze }: ProjectCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    await onAnalyze(project.id)
    setIsAnalyzing(false)
  }, [project.id, onAnalyze])
  
  return (...)
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow the existing color system (OKLCH)
- Use custom utilities in `index.css` for complex styles
- Maintain responsive design

**Example:**

```tsx
<div className="glass card-glow-border hover:scale-[1.02] transition-all">
  <Card className="h-full flex flex-col">
    {/* Card content */}
  </Card>
</div>
```

### API Routes

- Use RESTful conventions
- Include error handling
- Validate input with Zod schemas
- Return consistent response formats

**Example:**

```typescript
fastify.get<{ Params: { id: string } }>(
  '/projects/:id',
  async (request, reply) => {
    try {
      const { id } = request.params
      const project = await projectRepo.findById(id)
      
      if (!project) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Project not found'
        })
      }
      
      return reply.send({ data: project })
    } catch (error) {
      logger.error('Failed to fetch project:', error)
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch project'
      })
    }
  }
)
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(frontend): add project value estimation display

Add estimated SaaS and IP value to project cards.
Shows monthly SaaS revenue range and IP sale value.

Closes #123

---

fix(backend): prevent duplicate project creation race condition

Add transaction isolation and unique constraint handling
to prevent race conditions when multiple workers try to
create the same project simultaneously.

Fixes #456

---

docs: update installation guide with Windows instructions

Add specific instructions for Windows users including
path format examples and Docker Desktop configuration.
```

## Project Structure Guidelines

### Frontend

```
frontend/src/
├── components/       # Reusable UI components
│   ├── ui/          # Base UI primitives (shadcn)
│   └── projects/    # Project-specific components
├── pages/           # Page components
├── lib/             # Utilities and helpers
│   ├── api.ts       # API client
│   └── utils.ts     # Helper functions
├── types/           # TypeScript types
└── hooks/           # Custom React hooks
```

### Backend

```
backend/src/
├── routes/          # API route handlers
├── services/        # Business logic
├── repositories/    # Database access layer
├── workers/         # Background job processors
└── types/           # TypeScript types
```

### Keep Files Small

- Components: < 500 lines
- Services: < 300 lines
- Utilities: < 200 lines

If a file grows too large, refactor into smaller modules.

## Testing Guidelines

### Unit Tests

Write unit tests for:
- Utility functions
- Business logic
- Data transformations

```typescript
describe('formatProjectName', () => {
  it('converts kebab-case to Title Case', () => {
    expect(formatProjectName('my-cool-project')).toBe('My Cool Project')
  })
  
  it('handles single words', () => {
    expect(formatProjectName('project')).toBe('Project')
  })
})
```

### Integration Tests

Write integration tests for:
- API endpoints
- Database operations
- Worker jobs

### E2E Tests

Write E2E tests with Playwright for:
- Critical user flows
- Complex interactions
- Multi-step processes

```typescript
test('user can analyze a project', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await page.click('[data-testid="project-card-analyze"]')
  await expect(page.locator('.toast-success')).toBeVisible()
  await expect(page.locator('[data-status="ANALYZING"]')).toBeVisible()
})
```

## Documentation

Update documentation when:
- Adding new features
- Changing APIs
- Modifying configuration
- Updating dependencies

## Review Process

All pull requests require:
1. ✅ Passing CI/CD checks
2. ✅ Code review approval
3. ✅ Documentation updates
4. ✅ Test coverage

## Questions?

- Open a GitHub Discussion
- Open a GitHub Issue for bug reports and feature requests

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.

## Recognition

Contributors will be recognized in:
- README.md Contributors section
- CHANGELOG.md for significant contributions
- GitHub Contributors page

Thank you for contributing! 🎉
