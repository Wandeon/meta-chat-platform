# Port Allocations

This document lists all ports used by services in the Meta Chat Platform.

## Application Services

| Port | Service | Description |
|------|---------|-------------|
| 3000 | API Server | Main REST API and WebSocket server |
| 3001 | Dashboard | Admin dashboard web application |
| 3002 | Web Widget | Embeddable chat widget (dev server) |

## Infrastructure Services

| Port | Service | Description |
|------|---------|-------------|
| 5432 | PostgreSQL | Primary database with pgvector extension |
| 6379 | Redis | Cache, session storage, and Socket.IO adapter |
| 5672 | RabbitMQ | AMQP message queue |
| 15672 | RabbitMQ Management | Web-based management interface |

## Monitoring & Observability

| Port | Service | Description |
|------|---------|-------------|
| 9090 | Prometheus | Metrics collection (if enabled) |
| 3000/metrics | Metrics Endpoint | Prometheus metrics exposed by API |

## Development Notes

- All ports can be customized via environment variables
- Default ports are defined in `docker-compose.yml`
- API port: `API_PORT` (default: 3000)
- Dashboard port: `VITE_PORT` (default: 3001)
- Ensure no port conflicts with existing services when deploying

## Health Check Endpoints

- API: `http://localhost:3000/health`
- RabbitMQ: `http://localhost:15672` (default credentials: guest/guest)
- Prometheus (if enabled): `http://localhost:9090/-/healthy`
