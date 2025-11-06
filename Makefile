# Project Viewer - Makefile
# Common Docker Compose commands for development

.PHONY: help up down restart logs ps build clean verify test

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "Project Viewer - Available Commands"
	@echo "===================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Start all services in detached mode
	docker compose up -d
	@echo "Services starting... Run 'make logs' to view output"

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## Follow logs from all services
	docker compose logs -f

logs-backend: ## Follow backend logs only
	docker compose logs -f backend

logs-frontend: ## Follow frontend logs only
	docker compose logs -f frontend

logs-worker: ## Follow worker logs only
	docker compose logs -f analyzer-worker

logs-watcher: ## Follow file watcher logs only
	docker compose logs -f file-watcher

ps: ## Show running services
	docker compose ps

build: ## Build all Docker images
	docker compose build

build-no-cache: ## Build all images without cache
	docker compose build --no-cache

clean: ## Stop services and remove containers
	docker compose down --remove-orphans

clean-volumes: ## Stop services and remove containers + volumes (WARNING: deletes data!)
	docker compose down -v --remove-orphans
	@echo "WARNING: All volumes have been removed!"

verify: ## Run setup verification script
	@./scripts/verify-setup.sh

shell-backend: ## Open shell in backend container
	docker compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker compose exec frontend sh

shell-postgres: ## Open PostgreSQL shell
	docker compose exec postgres psql -U postgres -d projectviewer

shell-redis: ## Open Redis CLI
	docker compose exec redis redis-cli

db-migrate: ## Run database migrations (once backend is implemented)
	docker compose exec backend npm run migrate

db-seed: ## Seed database with test data (once backend is implemented)
	docker compose exec backend npm run seed

install: ## Install dependencies in all services
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing file-watcher dependencies..."
	cd file-watcher && npm install
	@echo "Installing shared types dependencies..."
	cd shared && npm install

dev: ## Start services and follow logs
	docker compose up

dev-build: ## Rebuild and start services
	docker compose up --build

test: verify ## Alias for verify

status: ps ## Alias for ps

restart-backend: ## Restart backend only
	docker compose restart backend

restart-frontend: ## Restart frontend only
	docker compose restart frontend

restart-worker: ## Restart worker only
	docker compose restart analyzer-worker

health: ## Check health of all services
	@echo "Checking service health..."
	@docker compose ps --format json | jq -r '.[] | "\(.Name): \(.State)"' 2>/dev/null || docker compose ps

network-inspect: ## Inspect Docker network
	docker network inspect project-viewer-network

volumes-inspect: ## List Docker volumes
	docker volume ls | grep project-viewer

prune: ## Remove unused Docker resources (images, containers, volumes)
	@echo "This will remove unused Docker resources. Continue? [y/N]"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		docker system prune -a --volumes; \
	fi
