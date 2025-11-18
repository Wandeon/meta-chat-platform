# Development Setup - Meta Chat Platform

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  
**Maintainer:** Development Team

## Overview

Local development environment setup guide for Meta Chat Platform.

**Tech Stack:**
- Node.js 20+, TypeScript 5
- Express.js, PostgreSQL 15+  
- Redis 7+, RabbitMQ 3.x
- Docker Compose for services

## Prerequisites

1. **Node.js 20+**
   ```bash
   node --version  # v20.x.x+
   npm --version   # 10.x.x+
   ```

2. **Docker & Docker Compose**
   ```bash
   docker --version
   docker-compose --version
   ```

3. **Git**
   ```bash
   git --version
   ```

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd meta-chat-platform

# 2. Install dependencies
npm install

# 3. Start Docker services
cd docker && docker-compose up -d

# 4. Setup environment
cp .env.example .env
# Edit .env with your settings

# 5. Setup database
npm run db:generate
npm run db:migrate

# 6. Build packages
npm run build

# 7. Start development servers
npm run dev
```

## Development Workflow

**Project Structure:**
```
meta-chat-platform/
├── apps/            # Applications
│   ├── api/         # REST API + WebSocket
│   ├── worker/      # Background jobs
│   ├── dashboard/   # Admin UI (React)
│   └── web-widget/  # Chat widget (React)
├── packages/        # Shared packages
│   ├── shared/      # Types, utilities
│   ├── database/    # Prisma schema
│   ├── events/      # Event bus
│   ├── orchestrator/# Message pipeline
│   ├── rag/         # Document processing
│   ├── llm/         # LLM providers
│   └── channels/    # Channel adapters
└── docker/          # Dev services
```

**Common Commands:**

```bash
# Development
npm run dev              # Start all apps
npm run build            # Build all
npm test                 # Run tests
npm run lint             # Lint code

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio

# Docker services
cd docker
docker-compose up -d     # Start services
docker-compose down      # Stop services
docker-compose logs -f   # View logs
```

**Development URLs:**
- API: http://localhost:3000
- Dashboard: http://localhost:5173
- Widget: http://localhost:5174
- Prisma Studio: http://localhost:5555
- RabbitMQ UI: http://localhost:15672

## Configuration

**.env file:**
```bash
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:password@localhost:5432/metachat
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672

LLM_PROVIDER=openai
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4o

LOG_LEVEL=debug
```

## Troubleshooting

**Port already in use:**
```bash
lsof -i :3000          # Find process
kill -9 <PID>          # Kill process
```

**Docker services not starting:**
```bash
docker-compose down -v # Stop and remove volumes
docker-compose up -d   # Start fresh
```

**Database connection failed:**
```bash
docker exec meta-chat-postgres pg_isready
docker restart meta-chat-postgres
```

**TypeScript errors:**
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run db:generate
npm run build
```

## Related Documentation

- [Production Deployment](./production.md)
- [Infrastructure](./infrastructure.md)
- [Architecture Overview](../../README.md)
