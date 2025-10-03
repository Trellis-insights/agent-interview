# Multi-stage Dockerfile for Temporal Agent TypeScript

# Stage 1: Base image with Node.js
FROM node:18-alpine AS base

# Install necessary system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodeuser -u 1001

# Copy package files
COPY package*.json ./

# Stage 2: Dependencies installation
FROM base AS dependencies

# Install all dependencies (including devDependencies)
RUN npm ci --include=dev && npm cache clean --force

# Stage 3: Build stage
FROM dependencies AS build

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build

# Run tests to ensure build quality
RUN npm test

# Stage 4: Production dependencies
FROM base AS production-deps

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 5: Production image
FROM base AS production

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=8000

# Copy production dependencies
COPY --from=production-deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodeuser:nodejs /app/dist ./dist

# Copy package.json for npm start command
COPY --chown=nodeuser:nodejs package*.json ./

# Create logs directory
RUN mkdir -p logs && chown nodeuser:nodejs logs

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

# Stage 6: Development image
FROM dependencies AS development

# Set NODE_ENV to development
ENV NODE_ENV=development
ENV PORT=3000

# Copy source code
COPY --chown=nodeuser:nodejs . .

# Switch to non-root user
USER nodeuser

# Expose port for development
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start development server
CMD ["npm", "run", "dev"]

# Stage 7: Testing image
FROM dependencies AS testing

# Copy source code
COPY . .

# Build application
RUN npm run build

# Switch to non-root user
USER nodeuser

# Run tests
CMD ["npm", "test"]

# Labels for metadata
LABEL maintainer="temporal-agent-team@example.com"
LABEL version="1.0.0"
LABEL description="Temporal Agent TypeScript - AI Agent Orchestration System"
LABEL org.opencontainers.image.source="https://github.com/example/temporal-agent-ts"
LABEL org.opencontainers.image.licenses="MIT"