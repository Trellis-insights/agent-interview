# Deployment Guide

## Overview

This guide covers deployment options for the Temporal Agent TypeScript application, from development to production environments.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher  
- **Temporal Server**: Local or cloud instance
- **Docker**: For containerized deployments
- **Docker Compose**: For multi-service deployments

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Application
NODE_ENV=production
PORT=8000
LOG_LEVEL=info

# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TASK_QUEUE=agent-task-queue

# LLM Providers
OPENAI_API_KEY=sk-your-openai-api-key-here

# File Upload
TRELLIS_API_KEY=your-trellis-api-key-here

# Security (Production only)
JWT_SECRET=your-secure-jwt-secret
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Database (if using persistence)
DATABASE_URL=postgresql://user:password@localhost:5432/temporal_agent

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn-here
NEW_RELIC_LICENSE_KEY=your-new-relic-key-here
```

### Environment-Specific Configurations

#### Development
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
TEMPORAL_ADDRESS=localhost:7233
```

#### Staging
```env
NODE_ENV=staging
PORT=8000
LOG_LEVEL=info
TEMPORAL_ADDRESS=temporal.staging.example.com:7233
```

#### Production
```env
NODE_ENV=production
PORT=8000
LOG_LEVEL=warn
TEMPORAL_ADDRESS=temporal.production.example.com:7233
```

## Development Deployment

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Start Temporal Server:**
```bash
temporal server start-dev --port 7233
```

3. **Start the application:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Docker Development

1. **Build development image:**
```bash
docker build -t temporal-agent-ts:dev .
```

2. **Run with Docker Compose:**
```bash
docker-compose -f docker-compose.dev.yml up
```

## Production Deployment

### Docker Deployment

1. **Build production image:**
```bash
docker build --target production -t temporal-agent-ts:prod .
```

2. **Run production container:**
```bash
docker run -d \
  --name temporal-agent-prod \
  -p 8000:8000 \
  -e NODE_ENV=production \
  -e OPENAI_API_KEY=your-key \
  -e TEMPORAL_ADDRESS=your-temporal-server:7233 \
  --restart unless-stopped \
  temporal-agent-ts:prod
```

### Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - TEMPORAL_ADDRESS=temporal:7233
    env_file:
      - .env.production
    depends_on:
      - temporal
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  temporal:
    image: temporalio/auto-setup:1.22.0
    ports:
      - "7233:7233"
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgres
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: temporal
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: temporal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  worker:
    build:
      context: .
      target: production
    command: npm run temporal:worker
    environment:
      - NODE_ENV=production
      - TEMPORAL_ADDRESS=temporal:7233
    env_file:
      - .env.production
    depends_on:
      - temporal
    restart: unless-stopped

volumes:
  postgres_data:
```

Deploy with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

#### Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: temporal-agent
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: temporal-agent-config
  namespace: temporal-agent
data:
  NODE_ENV: "production"
  PORT: "8000"
  TEMPORAL_ADDRESS: "temporal-frontend.temporal:7233"
  TEMPORAL_NAMESPACE: "default"
  TASK_QUEUE: "agent-task-queue"
```

#### Secret Management

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: temporal-agent-secrets
  namespace: temporal-agent
type: Opaque
data:
  OPENAI_API_KEY: <base64-encoded-key>
  TRELLIS_API_KEY: <base64-encoded-key>
  JWT_SECRET: <base64-encoded-secret>
```

#### Application Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-agent-app
  namespace: temporal-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: temporal-agent-app
  template:
    metadata:
      labels:
        app: temporal-agent-app
    spec:
      containers:
      - name: app
        image: temporal-agent-ts:prod
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: temporal-agent-config
        - secretRef:
            name: temporal-agent-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi" 
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: temporal-agent-service
  namespace: temporal-agent
spec:
  selector:
    app: temporal-agent-app
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: temporal-agent-ingress
  namespace: temporal-agent
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: temporal-agent-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: temporal-agent-service
            port:
              number: 80
```

#### Worker Deployment

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-agent-worker
  namespace: temporal-agent
spec:
  replicas: 2
  selector:
    matchLabels:
      app: temporal-agent-worker
  template:
    metadata:
      labels:
        app: temporal-agent-worker
    spec:
      containers:
      - name: worker
        image: temporal-agent-ts:prod
        command: ["npm", "run", "temporal:worker"]
        envFrom:
        - configMapRef:
            name: temporal-agent-config
        - secretRef:
            name: temporal-agent-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Deploy to Kubernetes:
```bash
kubectl apply -f k8s/
```

### AWS ECS Deployment

#### Task Definition

```json
{
  "family": "temporal-agent-ts",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "temporal-agent-app",
      "image": "your-ecr-repo/temporal-agent-ts:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "8000"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:openai-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/temporal-agent",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

## Monitoring and Observability

### Health Checks

The application provides several health check endpoints:

```bash
# Basic health check
GET /health

# Detailed health with dependencies
GET /health/detailed

# Readiness probe
GET /ready

# Liveness probe  
GET /alive
```

### Logging Configuration

Configure structured logging:

```javascript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Metrics Collection

Configure Prometheus metrics:

```javascript
// src/utils/metrics.ts
import promClient from 'prom-client';

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

export const agentExecutionDuration = new promClient.Histogram({
  name: 'agent_execution_duration_seconds', 
  help: 'Duration of agent executions in seconds',
  labelNames: ['agent_name', 'success']
});
```

### Alerting

Example Prometheus alerts:

```yaml
# alerts.yml
groups:
- name: temporal-agent
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
```

## Security Considerations

### Production Security Checklist

- [ ] **Environment Variables**: Never commit sensitive data
- [ ] **HTTPS**: Use TLS/SSL certificates in production
- [ ] **CORS**: Configure appropriate CORS origins
- [ ] **Rate Limiting**: Implement request rate limiting
- [ ] **Input Validation**: Validate all inputs server-side
- [ ] **Error Handling**: Don't expose internal errors to clients
- [ ] **Logging**: Sanitize logs to avoid sensitive data exposure
- [ ] **Dependencies**: Regularly update dependencies for security patches
- [ ] **Container Security**: Use minimal base images and non-root users

### Dockerfile Security

```dockerfile
# Use specific Node.js version
FROM node:18-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --chown=nodeuser:nodejs . .

# Build application
RUN npm run build

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 8000

# Start application
CMD ["npm", "start"]
```

## Scaling and Performance

### Horizontal Scaling

Configure multiple replicas:

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: temporal-agent-hpa
  namespace: temporal-agent
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: temporal-agent-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Load Balancing

Configure load balancer:

```nginx
# nginx.conf
upstream temporal_agent {
    least_conn;
    server app1:8000;
    server app2:8000;
    server app3:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://temporal_agent;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

## Backup and Recovery

### Database Backups

```bash
# Backup Temporal database
pg_dump -h temporal-db -U temporal temporal > temporal_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -h temporal-db -U temporal temporal < temporal_backup_20240101_120000.sql
```

### Application State

```bash
# Backup application logs
tar -czf logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz logs/

# Backup configuration
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

## Troubleshooting

### Common Issues

1. **Temporal Connection Issues**
   ```bash
   # Check Temporal server status
   temporal server status
   
   # Verify connection
   telnet temporal-server 7233
   ```

2. **High Memory Usage**
   ```bash
   # Check memory usage
   docker stats temporal-agent-app
   
   # Increase memory limit
   docker run --memory="1g" temporal-agent-ts:prod
   ```

3. **Performance Issues**
   ```bash
   # Check application metrics
   curl http://localhost:8000/metrics
   
   # Monitor resource usage
   kubectl top pods -n temporal-agent
   ```

### Log Analysis

```bash
# Filter error logs
docker logs temporal-agent-app | grep ERROR

# Monitor real-time logs
docker logs -f temporal-agent-app

# Search for specific patterns
kubectl logs -f deployment/temporal-agent-app | grep "workflow"
```

## Rollback Procedures

### Docker Rollback

```bash
# Tag current version
docker tag temporal-agent-ts:prod temporal-agent-ts:backup

# Deploy previous version
docker run -d temporal-agent-ts:previous

# Verify rollback
curl http://localhost:8000/health
```

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/temporal-agent-app -n temporal-agent

# Rollback to previous version
kubectl rollout undo deployment/temporal-agent-app -n temporal-agent

# Verify rollback
kubectl get pods -n temporal-agent
```

---

**Deployment Guide Version**: v1.0  
**Last Updated**: 2024-01-01  
**Compatible with**: temporal-agent-ts v1.0.0