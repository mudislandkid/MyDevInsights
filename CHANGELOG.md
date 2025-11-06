# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release
- Comprehensive README and documentation
- GPL-3.0 license for open source release
- Contributing guidelines

## [1.0.0] - 2025-01-06

### Added
- 🎨 Apple-inspired glassmorphism UI with dark theme
- 🤖 AI-powered project analysis using Claude AI
- 🔍 Automatic project discovery with file watcher
- 💰 Project value estimation (SaaS revenue & IP sale value)
- 📊 Project maturity and complexity scoring
- 🏷️ Tag system for project organization
- ⚡ Real-time updates via WebSocket
- 🔄 Manual project scanning with deleted project restoration
- 📝 Comprehensive project detail views
- 🎯 Tech stack detection and analysis
- 📈 Lines of code counting across languages
- 🔧 Edit and delete project functionality

### Frontend Features
- React 19 with TypeScript
- Vite 7 for fast builds
- Tailwind CSS v4 with OKLCH color system
- Animated border glows on project cards
- 32px blur glassmorphism effects
- Responsive grid layout
- TanStack Query for data fetching
- Zustand state management
- Sonner toast notifications
- Radix UI components

### Backend Features
- Fastify 4 REST API
- Prisma 5 ORM with PostgreSQL
- BullMQ job queue for analysis
- Redis for caching and pub/sub
- WebSocket server for real-time events
- Winston + Pino logging
- Zod input validation
- Transaction support for race conditions

### Services
- File Watcher: Chokidar-based directory monitoring
- Analyzer Worker: Background AI analysis jobs
- Docker Compose: Multi-service orchestration
- PostgreSQL 15: Primary database
- Redis 7: Cache and job queue

### API Endpoints
- `GET /projects` - List all projects with filtering
- `GET /projects/:id` - Get single project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Soft delete project
- `POST /projects/:id/analyze` - Trigger AI analysis
- `POST /projects/scan` - Manual project discovery
- `GET /projects/:id/analysis` - Analysis history
- `GET /health` - Health check endpoint
- `WS /ws` - WebSocket for real-time updates

### Infrastructure
- Docker containerization for all services
- Hot-reload in development mode
- Health checks for all services
- Volume persistence for database
- Read-only project directory mounting
- Network isolation between services

### Security
- Read-only file system mounts
- Environment variable isolation
- Input validation on all endpoints
- CORS configuration
- No credentials in repository

### Documentation
- Comprehensive README
- API documentation
- Installation guide
- Development setup guide
- Troubleshooting guide
- Contributing guidelines
- License information

## [0.9.0] - 2025-01-05

### Added
- Initial private beta version
- Core project discovery functionality
- Basic AI analysis integration
- Simple UI with project cards

### Changed
- Migrated from REST polling to WebSocket for updates
- Improved database schema for better performance
- Enhanced error handling across services

### Fixed
- Race condition in project creation
- File watcher memory leak
- Docker container startup order issues

## [0.5.0] - 2025-01-03

### Added
- File watcher service
- Background worker for analysis
- PostgreSQL database integration
- Basic REST API

### Fixed
- Project detection accuracy
- Docker networking issues

## [0.1.0] - 2025-01-01

### Added
- Initial proof of concept
- Basic project scanning
- Simple frontend

---

## Release Types

### Major Version (x.0.0)
- Breaking API changes
- Major architectural changes
- Incompatible schema changes

### Minor Version (0.x.0)
- New features
- Non-breaking enhancements
- New API endpoints

### Patch Version (0.0.x)
- Bug fixes
- Performance improvements
- Documentation updates

---

[Unreleased]: https://github.com/PROJECT_OWNER/project-viewer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/PROJECT_OWNER/project-viewer/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/PROJECT_OWNER/project-viewer/compare/v0.5.0...v0.9.0
[0.5.0]: https://github.com/PROJECT_OWNER/project-viewer/compare/v0.1.0...v0.5.0
[0.1.0]: https://github.com/PROJECT_OWNER/project-viewer/releases/tag/v0.1.0
