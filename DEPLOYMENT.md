# MyDevInsights - Production Deployment Guide

## Prerequisites

- Docker 24.0+ and Docker Compose 2.20+
- At least 4GB RAM available
- 10GB disk space
- Linux/macOS/Windows with WSL2
- Anthropic API key for AI analysis

## Quick Start

### 1. Environment Configuration

Create a `.env` file in the project root:

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key_here
POSTGRES_PASSWORD=your_secure_password_here

# Optional - Database
POSTGRES_DB=mydevinsights
POSTGRES_USER=postgres

# Optional - Directories
WATCH_DIRECTORIES=/path/to/your/projects

# Optional - Performance
ANALYZER_REPLICAS=2
MAX_TOKENS=4096
CACHE_TTL=86400000

# Optional - Network
HTTP_PORT=80
CORS_ORIGIN=*

# Optional - Logging
LOG_LEVEL=info
```

### 2. Start Production Services

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Initialize Database

```bash
# Run Prisma migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# (Optional) Seed initial data
docker-compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

### 4. Verify Deployment

- **Frontend**: http://localhost
- **API Health**: http://localhost/api/health
- **API Metrics**: http://localhost/api/health/metrics
- **WebSocket**: ws://localhost/ws

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                      │
│  ┌───────────────────┐          ┌─────────────────────────┐ │
│  │   Frontend        │          │      Backend API        │ │
│  │   (React SPA)     │          │      (Fastify)          │ │
│  └───────────────────┘          └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
        ┌─────▼────┐          ┌─────▼────┐       ┌───────▼──────┐
        │PostgreSQL│          │  Redis   │       │File Watcher  │
        │    DB    │          │  Cache   │       │  Service     │
        └──────────┘          └──────────┘       └──────────────┘
                                    │
                              ┌─────▼─────┐
                              │ Analyzer  │
                              │  Workers  │
                              │ (x2 pods) │
                              └───────────┘
```

## Service Details

### Frontend (React + Vite)
- **Port**: Internal 80
- **Resources**: 256MB RAM, 0.5 CPU
- **Features**:
  - Code-split bundles (6 chunks)
  - Static asset caching (1 year)
  - SPA routing with Nginx
  - Gzip compression

### Backend (Fastify)
- **Port**: Internal 3000
- **Resources**: 1GB RAM, 1 CPU
- **Features**:
  - RESTful API
  - WebSocket support
  - Winston logging with rotation
  - Performance monitoring
  - Rate limiting (100 req/min)

### Database (PostgreSQL 17)
- **Port**: Internal 5432
- **Resources**: 512MB RAM, 1 CPU
- **Persistence**: Docker volume `postgres_data_prod`

### Redis Cache
- **Port**: Internal 6379
- **Resources**: 256MB RAM, 0.5 CPU
- **Persistence**: Docker volume `redis_data_prod`
- **Eviction**: LRU when 256MB exceeded

### File Watcher
- **Resources**: 256MB RAM, 0.5 CPU
- **Function**: Monitors directories for new projects
- **Interval**: 30 seconds (configurable)

### Analyzer Workers
- **Resources**: 1GB RAM per worker, 1 CPU
- **Replicas**: 2 (configurable)
- **Function**: AI-powered project analysis
- **Queue**: BullMQ with Redis

### Nginx Reverse Proxy
- **Port**: 80 (exposed)
- **Resources**: 128MB RAM, 0.5 CPU
- **Features**:
  - Single-port deployment
  - WebSocket proxying
  - Static asset caching
  - Gzip compression

## Configuration

### Environment Variables

#### Required
- `ANTHROPIC_API_KEY`: Anthropic API key for AI analysis
- `POSTGRES_PASSWORD`: Secure PostgreSQL password

#### Database
- `POSTGRES_DB`: Database name (default: `mydevinsights`)
- `POSTGRES_USER`: Database user (default: `postgres`)
- `DATABASE_URL`: Auto-generated connection string

#### Directories
- `WATCH_DIRECTORIES`: Comma-separated paths to watch (default: `/projects`)

#### Performance
- `ANALYZER_REPLICAS`: Number of analyzer workers (default: `2`)
- `MAX_TOKENS`: Max tokens per AI request (default: `4096`)
- `CACHE_TTL`: Cache time-to-live in ms (default: `86400000` = 24h)
- `SCAN_INTERVAL`: File watch interval in ms (default: `30000`)

#### Network
- `HTTP_PORT`: External HTTP port (default: `80`)
- `CORS_ORIGIN`: CORS allowed origins (default: `*`)

#### Rate Limiting
- `RATE_LIMIT_MAX`: Max requests per window (default: `100`)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in ms (default: `60000`)

#### Logging
- `LOG_LEVEL`: Log level (default: `info`, options: `debug|info|warn|error`)

### Resource Limits

Total system requirements:
- **CPU**: ~5 cores (4 reserved + 1.5 limit overhead)
- **RAM**: ~3.5 GB (2.5 GB reserved + 1 GB overhead)
- **Disk**: ~10 GB (5 GB for data + 5 GB for logs/cache)

Adjust `docker-compose.prod.yml` for your hardware:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

## Monitoring

### Health Checks

All services include health checks:

```bash
# Check all service health
docker-compose -f docker-compose.prod.yml ps

# Check specific service
curl http://localhost/api/health
curl http://localhost/api/health/detailed
```

### Performance Metrics

```bash
# Get performance metrics (JSON)
curl http://localhost/api/health/metrics

# Get performance summary (text)
curl http://localhost/api/health/summary
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f analyzer-worker

# View log files (Winston logs)
docker-compose -f docker-compose.prod.yml exec backend ls -lh logs/
docker-compose -f docker-compose.prod.yml exec backend tail -f logs/combined-*.log
```

### Alerts

The performance monitor automatically logs alerts for:
- High memory usage (>80% = warning, >90% = critical)
- High error rate (>10%)
- Slow requests (>1 second)

Check alerts:
```bash
curl http://localhost/api/health/metrics | jq '.alerts'
```

## Scaling

### Horizontal Scaling

Scale analyzer workers:

```bash
# Scale to 4 workers
docker-compose -f docker-compose.prod.yml up -d --scale analyzer-worker=4

# Scale back to 2
docker-compose -f docker-compose.prod.yml up -d --scale analyzer-worker=2
```

Or set in `.env`:
```bash
ANALYZER_REPLICAS=4
```

### Vertical Scaling

Increase service resources in `docker-compose.prod.yml`:

```yaml
analyzer-worker:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres mydevinsights > backup.sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres mydevinsights < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v mydevinsights_postgres_data_prod:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
docker run --rm -v mydevinsights_redis_data_prod:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# 1. Missing ANTHROPIC_API_KEY - set in .env
# 2. Port 80 in use - change HTTP_PORT in .env
# 3. Insufficient memory - increase Docker memory limit
```

### Database Connection Errors

```bash
# Verify database is running
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Run migrations manually
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Increase limits in docker-compose.prod.yml
# Or reduce ANALYZER_REPLICAS in .env
```

### Slow Performance

```bash
# Check performance metrics
curl http://localhost/api/health/metrics

# Increase analyzer workers
docker-compose -f docker-compose.prod.yml up -d --scale analyzer-worker=4

# Check Redis cache hit rate
docker-compose -f docker-compose.prod.yml exec redis redis-cli info stats
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Clean Up

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.prod.yml down -v

# Clean up Docker system
docker system prune -a
```

## Security

### Best Practices

1. **Change default passwords**: Set strong `POSTGRES_PASSWORD`
2. **Restrict CORS**: Set specific domains in `CORS_ORIGIN`
3. **Use HTTPS**: Configure SSL certificates (see nginx/nginx.conf)
4. **Limit ports**: Only expose port 80 (or 443 with SSL)
5. **Run as non-root**: All services use non-root users
6. **Keep updated**: Regularly update base images

### SSL/TLS Configuration

Uncomment HTTPS block in `nginx/nginx.conf` and mount certificates:

```yaml
nginx:
  volumes:
    - ./certs:/etc/nginx/ssl:ro
  ports:
    - "443:443"
```

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Review metrics: `curl http://localhost/api/health/metrics`
