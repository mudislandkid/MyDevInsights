#!/bin/bash

# Project Viewer - Setup Verification Script
# Checks all services are running and healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "Project Viewer - Setup Verification"
echo "================================"
echo ""

# Check if docker compose is available
echo "Checking Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not available${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are available${NC}"
echo ""

# Validate docker-compose.yml
echo "Validating docker-compose.yml..."
if docker compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ docker-compose.yml is valid${NC}"
else
    echo -e "${RED}✗ docker-compose.yml has errors${NC}"
    exit 1
fi
echo ""

# Check if .env file exists
echo "Checking environment configuration..."
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
else
    echo -e "${YELLOW}⚠ .env file not found. Copy .env.example to .env and configure it.${NC}"
fi
echo ""

# Check if services are running
echo "Checking Docker services..."
if docker compose ps --format json > /dev/null 2>&1; then
    services=$(docker compose ps --format json 2>/dev/null | jq -r '.Name' 2>/dev/null || docker compose ps --services)
    
    if [ -z "$services" ]; then
        echo -e "${YELLOW}⚠ No services are currently running${NC}"
        echo "  Run 'docker compose up -d' to start services"
    else
        echo "Services status:"
        docker compose ps
        echo ""
    fi
else
    echo -e "${YELLOW}⚠ Unable to check service status${NC}"
fi
echo ""

# Check individual service health (if running)
check_service_health() {
    local service=$1
    local container=$2
    
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        health=$(docker inspect --format='{{.State.Health.Status}}' ${container} 2>/dev/null || echo "no-health-check")
        
        if [ "$health" = "healthy" ]; then
            echo -e "${GREEN}✓ ${service} is healthy${NC}"
            return 0
        elif [ "$health" = "starting" ]; then
            echo -e "${YELLOW}⚠ ${service} is starting...${NC}"
            return 1
        elif [ "$health" = "no-health-check" ]; then
            state=$(docker inspect --format='{{.State.Status}}' ${container})
            if [ "$state" = "running" ]; then
                echo -e "${GREEN}✓ ${service} is running${NC}"
                return 0
            else
                echo -e "${RED}✗ ${service} is not running (${state})${NC}"
                return 1
            fi
        else
            echo -e "${RED}✗ ${service} is unhealthy${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ ${service} is not running${NC}"
        return 1
    fi
}

echo "Checking service health..."
check_service_health "PostgreSQL" "project-viewer-postgres"
check_service_health "Redis" "project-viewer-redis"
check_service_health "Backend" "project-viewer-backend"
check_service_health "Worker" "project-viewer-worker"
check_service_health "File Watcher" "project-viewer-file-watcher"
check_service_health "Frontend" "project-viewer-frontend"
echo ""

# Check if ports are accessible
echo "Checking port accessibility..."
check_port() {
    local port=$1
    local service=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓ Port ${port} (${service}) is accessible${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Port ${port} (${service}) is not accessible${NC}"
        return 1
    fi
}

# Check if nc (netcat) is available
if command -v nc &> /dev/null; then
    check_port 5432 "PostgreSQL"
    check_port 6379 "Redis"
    check_port 3000 "Backend API"
    check_port 3001 "Frontend"
else
    echo -e "${YELLOW}⚠ netcat (nc) not installed - skipping port checks${NC}"
fi
echo ""

# Final summary
echo "================================"
echo "Verification Complete"
echo "================================"
echo ""
echo "Next steps:"
echo "1. If services are not running: docker compose up -d"
echo "2. View logs: docker compose logs -f"
echo "3. Stop services: docker compose down"
echo "4. Full reset: docker compose down -v"
echo ""
