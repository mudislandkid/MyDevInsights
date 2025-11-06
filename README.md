# Project Viewer

<div align="center">

**AI-Powered Project Discovery and Analysis Platform**

A modern, full-stack application that automatically discovers, analyzes, and provides intelligent insights about your software projects using Claude AI.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

[Features](#features) • [Tech Stack](#tech-stack) • [Installation](#installation) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 📖 Overview

Project Viewer is an intelligent project management and analysis platform that automatically discovers software projects on your machine, analyzes their codebase, tech stack, and maturity level, and provides AI-generated insights including estimated project valuations.

Perfect for:
- 🚀 **Developers** managing multiple projects
- 💼 **Agencies** tracking client projects
- 📊 **Portfolio Management** understanding project value
- 🎯 **Project Prioritization** based on maturity and complexity

---

## ✨ Features

### 🔍 Intelligent Project Discovery
- **Automatic Detection**: Watches configured directories for new projects
- **Real-time Monitoring**: File watcher service detects changes instantly
- **Smart Validation**: Identifies valid projects by detecting package managers and configuration files
- **Manual Scanning**: On-demand project discovery with restore deleted projects option

### 🤖 AI-Powered Analysis
- **Deep Code Analysis**: Powered by Claude AI (Anthropic)
- **Tech Stack Detection**: Automatically identifies frameworks, languages, and tools
- **Complexity Assessment**: Rates projects from Simple to Very Complex
- **Maturity Scoring**: Categorizes as POC, MVP, Production-Ready, or Enterprise
- **Value Estimation**: Provides SaaS revenue and IP sale value estimates
- **Completion Tracking**: Calculates project completion percentage
- **Production Gap Analysis**: Identifies what's needed for production readiness

### 💎 Modern UI/UX
- **Apple-Inspired Glassmorphism**: Beautiful dark theme with translucent cards
- **Animated Border Glows**: Subtle rotating gradients on project cards
- **Real-time Updates**: WebSocket integration for live status changes
- **Responsive Design**: Works seamlessly across devices
- **Interactive Dashboard**: Sortable, filterable project grid
- **Detailed Project Views**: Modal with comprehensive project information

### 📊 Project Insights
- **Lines of Code**: Accurate LOC counting across languages
- **Language Distribution**: Percentage breakdown of languages used
- **Framework Detection**: Primary and secondary framework identification
- **File Statistics**: Total file count and project size
- **Analysis History**: Track changes over time
- **Tag System**: Categorize and organize projects

### 🔧 Developer Features
- **RESTful API**: Well-documented backend API
- **WebSocket Events**: Real-time project updates
- **Background Jobs**: Queue-based analysis with BullMQ
- **Database Migrations**: Prisma ORM with PostgreSQL
- **Docker Compose**: One-command development setup
- **TypeScript**: Full type safety across stack

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  React 19 + TypeScript + Vite + Tailwind CSS v4           │
│  (Apple-style UI with glassmorphism effects)               │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────┴───────────────────────────────────────────┐
│                      Backend API                            │
│        Fastify + WebSocket + Prisma ORM                    │
│  (REST endpoints + real-time event broadcasting)           │
└─────────────────┬─────────────┬─────────────────────────────┘
                  │             │
        ┌─────────┴────┐   ┌────┴────────┐
        │  PostgreSQL  │   │   Redis     │
        │   Database   │   │   Cache     │
        └──────────────┘   └─────┬───────┘
                                 │
        ┌────────────────────────┴───────────────────────┐
        │                                                │
┌───────┴─────────┐                        ┌─────────────┴──────┐
│  File Watcher   │                        │  Analyzer Worker   │
│   (Chokidar)    │                        │   (BullMQ + AI)    │
│  Monitors dirs  │────────────────────────│  Claude API calls  │
└─────────────────┘     Redis Pub/Sub      └────────────────────┘
```

### Service Breakdown

1. **Frontend** (`frontend/`)
   - React 19 with TypeScript
   - Vite for blazing-fast builds
   - Tailwind CSS v4 with custom theme
   - TanStack Query for data fetching
   - Zustand for state management

2. **Backend API** (`backend/`)
   - Fastify web framework
   - Prisma ORM with PostgreSQL
   - WebSocket for real-time updates
   - Winston logging

3. **Analyzer Worker** (`analyzer-worker/`)
   - Background job processing
   - Claude AI integration
   - BullMQ job queue
   - Automatic retry logic

4. **File Watcher** (`file-watcher/`)
   - Chokidar directory monitoring
   - Debounced event handling
   - Redis pub/sub notifications
   - Project validation

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS v4, Custom OKLCH color system
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **State Management**: Zustand
- **Data Fetching**: TanStack Query v5
- **Routing**: React Router v7
- **Animations**: Framer Motion
- **Notifications**: Sonner (toast)
- **Testing**: Playwright

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify 4
- **Language**: TypeScript 5.3
- **Database**: PostgreSQL 15
- **ORM**: Prisma 5
- **Cache/Queue**: Redis 7, BullMQ
- **WebSockets**: @fastify/websocket
- **Validation**: Zod
- **Logging**: Winston + Pino
- **AI Integration**: Anthropic SDK (Claude)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15 Alpine
- **Cache**: Redis 7 Alpine
- **File Watching**: Chokidar
- **Job Queue**: BullMQ

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Docker** and **Docker Compose** installed
- **Node.js** 20+ (for local development)
- **Anthropic API Key** (for Claude AI analysis)
  - Get one at: https://console.anthropic.com/
- **Git** for version control

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mudislandkid/project-viewer.git
cd project-viewer
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Anthropic API Key (Required)
ANTHROPIC_API_KEY=sk-ant-xxx

# Projects Directory (Customize to your projects folder)
PROJECTS_PATH=/path/to/your/projects

# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/projectviewer

# Redis Configuration
REDIS_URL=redis://redis:6379

# Backend Configuration
BACKEND_PORT=3000
NODE_ENV=development

# Worker Configuration
WORKER_CONCURRENCY=1

# File Watcher Configuration
WATCH_PATH=/projects
STARTUP_DELAY=5000
```

**Important Configuration:**
- Replace `ANTHROPIC_API_KEY` with your actual API key
- Set `PROJECTS_PATH` to the directory containing your projects
  - Example: `/Users/yourname/Projects` or `C:\Users\yourname\Projects`

### 3. Start with Docker Compose

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Using Makefile (if available):**
```bash
make up      # Start services
make logs    # View logs
make down    # Stop services
make restart # Restart services
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health

---

## 📖 Documentation

### API Endpoints

#### Projects

```http
# Get all projects
GET /projects?page=1&limit=20&status=ANALYZED&search=query

# Get single project
GET /projects/:id

# Update project
PUT /projects/:id
Content-Type: application/json
{
  "name": "New Name",
  "description": "Updated description"
}

# Delete project (soft delete)
DELETE /projects/:id

# Trigger analysis
POST /projects/:id/analyze
Content-Type: application/json
{ "force": true }

# Manual project scan
POST /projects/scan?resetDeleted=true

# Get analysis history
GET /projects/:id/analysis
```

#### WebSocket Events

Connect to `ws://localhost:3000/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log(message.type) // Event types:
  // - project:added
  // - project:updated
  // - project:removed
  // - analysis:started
  // - analysis:progress
  // - analysis:completed
  // - analysis:failed
}
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude AI API key | - | ✅ Yes |
| `PROJECTS_PATH` | Host path to projects directory | - | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection string | postgresql://postgres:postgres@postgres:5432/projectviewer | No |
| `REDIS_URL` | Redis connection string | redis://redis:6379 | No |
| `BACKEND_PORT` | Backend server port | 3000 | No |
| `WORKER_CONCURRENCY` | Number of concurrent analysis jobs | 1 | No |
| `WATCH_PATH` | Container path for file watcher | /projects | No |
| `NODE_ENV` | Environment mode | development | No |

---

## 🎨 UI Customization

The application uses Tailwind CSS v4 with a custom OKLCH color system. Customize the theme in `frontend/src/index.css`:

```css
@theme {
  /* Colors use OKLCH for perceptually uniform gradients */
  --color-background: oklch(0.20 0.015 264);
  --color-primary: oklch(0.72 0.24 250);
  --color-accent: oklch(0.68 0.20 200);
  /* ... more colors */
}
```

Key design features:
- **Glassmorphism**: 32px blur with 180% saturation
- **Animated Borders**: Rotating conic gradients
- **Smooth Transitions**: Cubic-bezier easing
- **Responsive Grid**: Auto-fitting project cards

---

## 🔧 Development

### Local Development (Without Docker)

#### Prerequisites
```bash
# Install dependencies for all services
npm install --workspaces
```

#### Start Services Individually

**Terminal 1 - Database & Redis:**
```bash
docker compose up postgres redis
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Worker:**
```bash
cd analyzer-worker
npm run dev
```

**Terminal 4 - File Watcher:**
```bash
cd file-watcher
npm run dev
```

**Terminal 5 - Frontend:**
```bash
cd frontend
npm run dev
```

### Database Management

```bash
# Run migrations
cd backend
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Reset database
npm run db:reset

# Generate Prisma Client
npm run prisma:generate
```

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend E2E tests
cd frontend
npm run test:e2e
npm run test:e2e:ui  # With Playwright UI
```

### Project Structure

```
project-viewer/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities and API client
│   │   ├── types/         # TypeScript types
│   │   └── index.css      # Tailwind theme
│   └── Dockerfile.dev
├── backend/               # Fastify API server
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Database access layer
│   │   └── server.ts      # Application entry
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── Dockerfile
├── analyzer-worker/       # Background job processor
│   ├── src/
│   │   ├── workers/       # Job handlers
│   │   ├── services/      # AI integration
│   │   └── index.ts       # Worker entry
│   └── Dockerfile.dev
├── file-watcher/          # Directory monitoring service
│   ├── src/
│   │   ├── lib/           # Watcher logic
│   │   └── index.ts       # Service entry
│   └── Dockerfile
├── docker-compose.yml     # Multi-service orchestration
├── .env.example           # Environment template
└── README.md              # This file
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Ways to Contribute

1. **🐛 Report Bugs**: Open an issue with details
2. **💡 Suggest Features**: Share your ideas
3. **📝 Improve Docs**: Help others understand the project
4. **🔧 Submit PRs**: Fix bugs or add features
5. **⭐ Star the Repo**: Show your support!

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style
4. **Test thoroughly**: Ensure nothing breaks
5. **Commit with clear messages**: `git commit -m 'Add amazing feature'`
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**: Describe your changes

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow the configured rules
- **Prettier**: Format before committing
- **Commit Messages**: Use conventional commits format
  - `feat:` New features
  - `fix:` Bug fixes
  - `docs:` Documentation changes
  - `refactor:` Code refactoring
  - `test:` Adding tests
  - `chore:` Maintenance tasks

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

### What this means:

✅ **You CAN:**
- Use this software for any purpose
- Study and modify the source code
- Share the software
- Share your modifications

❌ **You CANNOT:**
- Use this software in proprietary applications without releasing your source code
- Distribute modified versions under a different license
- Remove or modify license notices
- Sell this software or derivatives without sharing the source code

⚠️ **You MUST:**
- Share your modifications under GPL-3.0
- Keep the source code open
- Include the original license and copyright notice
- Provide source code to anyone you distribute binaries to

### Why GPL-3.0?

This license ensures the software remains free and open-source, preventing commercial entities from taking the code and selling it as proprietary software. Any derivative works must also be open-sourced under the same license.

If you need to use this software in a proprietary project, please contact the maintainers to discuss alternative licensing options.

**Full License**: See [LICENSE](./LICENSE) file

---

## 🔒 Security

### Reporting Vulnerabilities

If you discover a security vulnerability, please open a private security advisory on GitHub instead of opening a public issue. We take security seriously and will respond promptly.

### Security Features

- **Read-only Project Mounts**: Docker containers have read-only access to project directories
- **Environment Isolation**: Secrets stored in .env files (not committed to git)
- **Input Validation**: Zod schema validation on all API inputs
- **Rate Limiting**: Protection against abuse (configurable)
- **CORS Configuration**: Restricted origins in production

---

## 🐛 Troubleshooting

### Common Issues

#### Docker Containers Won't Start

```bash
# Check logs
docker compose logs backend

# Restart services
docker compose restart

# Rebuild from scratch
docker compose down -v
docker compose up --build
```

#### Frontend Can't Connect to Backend

1. Check that backend is running: `docker compose ps`
2. Verify `VITE_API_URL` in `.env` matches backend port
3. Check browser console for CORS errors
4. Ensure backend health check passes: `curl http://localhost:3000/health`

#### Analysis Jobs Not Processing

1. Check Redis is running: `docker compose ps redis`
2. View worker logs: `docker compose logs analyzer-worker -f`
3. Verify `ANTHROPIC_API_KEY` is set correctly
4. Check worker container is healthy: `docker compose ps`

#### Projects Not Being Discovered

1. Check file-watcher logs: `docker compose logs file-watcher -f`
2. Verify `PROJECTS_PATH` is mounted correctly in docker-compose.yml
3. Ensure projects have valid markers (package.json, Cargo.toml, go.mod, pyproject.toml)
4. Check Docker Desktop file sharing permissions (macOS/Windows)
5. Try manual scan: Click "Scan Projects" button in UI

#### Database Connection Errors

```bash
# Check PostgreSQL is healthy
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Reset database (WARNING: deletes all data)
cd backend
npm run db:reset

# Rerun migrations
npm run prisma:migrate
```

#### Port Conflicts

If ports are already in use, edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "3001:3000"  # Change host port (left side)

  frontend:
    ports:
      - "5174:5173"  # Change host port (left side)
```

### Getting Help

- **Issues**: https://github.com/mudislandkid/project-viewer/issues
- **Discussions**: https://github.com/mudislandkid/project-viewer/discussions

---

## 🗺️ Roadmap

### Planned Features

- [ ] **Multi-user Support**: Team collaboration features
- [ ] **GitHub Integration**: Sync with GitHub repositories
- [ ] **Custom AI Models**: Support for other LLMs (OpenAI, Gemini, local models)
- [ ] **Project Templates**: Quick-start templates for new projects
- [ ] **CI/CD Integration**: Connect to pipelines
- [ ] **Export Reports**: PDF/Markdown project reports
- [ ] **API Rate Limiting**: Enhanced security
- [ ] **Project Comparison**: Side-by-side project analysis
- [ ] **Time Tracking**: Integration with time tracking tools
- [ ] **Custom Tags**: User-defined project categorization
- [ ] **Advanced Search**: Elasticsearch integration
- [ ] **Dark/Light Themes**: User preference toggle
- [ ] **Mobile App**: Native iOS/Android apps
- [ ] **Docker Registry**: Pre-built images
- [ ] **Helm Charts**: Kubernetes deployment

### Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

---

## 📊 Project Stats

- **Languages**: TypeScript, CSS, Dockerfile
- **Total Services**: 5 (Frontend, Backend, Worker, Watcher, Database)
- **API Endpoints**: 10+
- **UI Components**: 20+
- **Database Tables**: 5
- **Docker Images**: 5

---

## 🙏 Acknowledgments

Built with these amazing technologies:

- [React](https://react.dev/) - UI framework
- [Fastify](https://www.fastify.io/) - Web framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Anthropic Claude](https://www.anthropic.com/) - AI analysis
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - UI primitives
- [BullMQ](https://docs.bullmq.io/) - Job queue
- [Chokidar](https://github.com/paulmillr/chokidar) - File watching

Special thanks to all contributors and the open-source community!

---

## 📧 Contact

**Project Link**: https://github.com/mudislandkid/project-viewer

For inquiries, please open a GitHub issue or discussion.

---

<div align="center">

**[⬆ Back to Top](#project-viewer)**

Made with ❤️ by developers, for developers

</div>
