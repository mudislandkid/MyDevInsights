# File Watcher Service Dockerfile
# Development build with hot reload

FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Expose port (if needed for health checks)
EXPOSE 3002

# Start development server with hot reload
CMD ["npm", "run", "dev"]
