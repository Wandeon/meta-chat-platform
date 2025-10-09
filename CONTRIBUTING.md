# Contributing to Meta Chat Platform

Thank you for your interest in contributing to Meta Chat Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker and Docker Compose (for local development)
- PostgreSQL 15+ with pgvector extension

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Wandeon/meta-chat-platform.git
   cd meta-chat-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start infrastructure services:
   ```bash
   cd docker
   docker-compose up -d postgres redis rabbitmq
   ```

5. Run database migrations:
   ```bash
   npm run db:migrate
   ```

6. Start development servers:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

Example: `feature/add-telegram-adapter`

### Commit Messages

Follow conventional commit format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(channels): add Telegram channel adapter

Implement Telegram Bot API integration with webhook support.
Includes message sending, receiving, and media handling.

Closes #123
```

### Code Style

- Use TypeScript for all code
- Follow existing code formatting (Prettier/ESLint)
- Use 2 spaces for indentation
- Maximum line length: 120 characters
- Use meaningful variable and function names

### Testing Requirements

All contributions must include appropriate tests:

1. **Unit Tests**: For isolated functions and classes
   ```bash
   npm run test:unit
   ```

2. **Integration Tests**: For API endpoints and workflows
   ```bash
   npm run test:integration
   ```

3. **Test Coverage**: Aim for >80% coverage for new code

### Code Review Process

1. Ensure all tests pass locally
2. Run linting: `npm run lint`
3. Push your branch to GitHub
4. Create a Pull Request with:
   - Clear title and description
   - Link to related issues
   - Screenshots/videos for UI changes
   - Test results and coverage

5. Address review feedback
6. Maintain a clean commit history (rebase if needed)

## Pull Request Guidelines

### PR Title Format
```
<type>(<scope>): <description>
```

Example: `feat(rag): implement PDF document loader`

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

## Project Structure

```
meta-chat-platform/
├── apps/
│   ├── api/           # REST API server
│   ├── dashboard/     # Admin dashboard
│   └── web-widget/    # Embeddable chat widget
├── packages/
│   ├── channels/      # Channel adapters (WhatsApp, Messenger, etc.)
│   ├── database/      # Prisma schema and client
│   ├── events/        # RabbitMQ event system
│   ├── llm/           # LLM provider integrations
│   ├── orchestrator/  # Message processing pipeline
│   ├── rag/           # RAG document processing
│   └── shared/        # Shared utilities
├── docs/              # Documentation
└── tests/             # Integration and E2E tests
```

## Adding New Features

### Adding a New Channel Adapter

1. Create adapter in `packages/channels/src/adapters/`
2. Implement `ChannelAdapter` interface
3. Add webhook handler
4. Add message sending/receiving logic
5. Write unit tests
6. Update documentation

### Adding a New LLM Provider

1. Create provider in `packages/llm/src/providers/`
2. Extend `BaseLLMProvider`
3. Implement required methods
4. Add streaming support
5. Write tests with mocked API calls
6. Update factory and types

### Adding API Endpoints

1. Add route handler in `apps/api/src/routes/`
2. Add input validation with Zod schemas
3. Add proper error handling
4. Add authentication/authorization checks
5. Write integration tests
6. Update API documentation

## Testing Guidelines

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { MyFunction } from './my-module';

describe('MyFunction', () => {
  it('should return expected value', () => {
    const result = MyFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle errors gracefully', () => {
    expect(() => MyFunction(null)).toThrow('Invalid input');
  });
});
```

### Integration Test Example
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('POST /api/tenants', () => {
  it('should create a new tenant', async () => {
    const response = await request(app)
      .post('/api/tenants')
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'Test Tenant' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

## Documentation

- Update relevant docs in `docs/` directory
- Add JSDoc comments for public APIs
- Update README.md if adding user-facing features
- Include inline comments for complex logic

## Release Process

1. Version bump in `VERSION` file
2. Update CHANGELOG.md
3. Create release branch
4. Run full test suite
5. Create GitHub release with notes
6. Deploy to staging environment
7. Production deployment after validation

## Need Help?

- Check existing issues and discussions
- Create a new issue with detailed information
- Join our community chat (if available)
- Review documentation in `docs/` directory

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
