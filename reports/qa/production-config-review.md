# Production configuration review

## Summary
- Root `.env.production.example` is broadly scoped but still relies on `CHANGE_ME` placeholders for critical services and secrets; these need real production credentials before deployment.
- `apps/api/.env.production.example` is absent even though the checklist references it, so API-level production variables are not documented in the expected location.
- `ecosystem.config.js` loads the development `.env` path and embeds concrete fallback credentials, risking production startups with hardcoded development values instead of explicit production settings.

## Findings
### `.env.production.example`
The template covers database, Redis, RabbitMQ, LLM providers, security keys, storage, logging, and optional services but keeps placeholder values (e.g., database password, Redis/RabbitMQ credentials, OpenAI/Anthropic API keys, encryption/JWT/webchat secrets). These must be replaced with actual production secrets and endpoints prior to deployment.

### `apps/api/.env.production.example`
The checklist expects API production variables at `/apps/api/.env.production`, yet no `.env.production.example` exists under `apps/api/`, leaving operators without the documented template the checklist points to.

### `ecosystem.config.js`
The PM2 configuration currently loads `./apps/api/.env` and provides hardcoded fallback credentials for the API and worker (database, Redis/RabbitMQ URLs, JWT/encryption secrets, Stripe and SMTP defaults). If production env vars are missing, these development-oriented values would be used silently, blurring dev/prod separation and embedding secrets in versioned config.

## Recommendations
1. Populate `.env.production.example` placeholders with deployment-ready guidance (or explicit `CHANGE_ME` notes) and ensure secrets are supplied via a secure channel at deploy time.
2. Add an `apps/api/.env.production.example` aligned with the checklist so API-specific production settings are documented where operators expect them.
3. Update `ecosystem.config.js` to load a production-specific env file (e.g., `.env.production`) and remove hardcoded secret fallbacks to prevent unintended use of development values in production.
