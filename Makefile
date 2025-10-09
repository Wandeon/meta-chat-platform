.PHONY: help dev build test lint clean install db-migrate db-push db-studio logs deploy

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm install

dev: ## Start all services in development mode
	npm run dev

build: ## Build all packages and applications
	npm run build

test: ## Run all tests
	npm run test

test-unit: ## Run unit tests only
	npm run test:unit

test-integration: ## Run integration tests only
	npm run test:integration

lint: ## Run ESLint on all TypeScript files
	npm run lint

lint-fix: ## Run ESLint and auto-fix issues
	npm run lint:fix

clean: ## Clean all build artifacts and node_modules
	npm run clean

db-generate: ## Generate Prisma client
	npm run db:generate

db-migrate: ## Run database migrations
	npm run db:migrate

db-push: ## Push schema changes to database (dev only)
	npm run db:push

db-studio: ## Open Prisma Studio
	npm run db:studio

docker-up: ## Start all Docker services
	cd docker && docker-compose up -d

docker-down: ## Stop all Docker services
	cd docker && docker-compose down

docker-logs: ## View Docker service logs
	cd docker && docker-compose logs -f

docker-restart: ## Restart all Docker services
	cd docker && docker-compose restart

logs: ## View API server logs (requires running container)
	docker logs -f meta-chat-api

deploy: ## Build and prepare for production deployment
	@echo "Building all packages..."
	npm run build
	@echo "Running tests..."
	npm run test
	@echo "Build and tests complete. Ready for deployment."

audit: ## Run security audit
	npm audit --audit-level=high

audit-fix: ## Fix security vulnerabilities
	npm audit fix
