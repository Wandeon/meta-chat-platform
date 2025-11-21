# TypeScript configuration review

## Scope
- `tsconfig.base.json`
- All `tsconfig.json` files under `apps/*` and `packages/*`
- Plan context: `docs/plans/typescript-build-fixes-plan.md`

## Findings

1. **Base configuration**
   - Targets `ES2022` with `module` set to `CommonJS`, `composite` enabled, declaration output (`declaration`, `declarationMap`, `emitDeclarationOnly`) and strict type checking enabled.
   - Uses `moduleResolution: node`, with `esModuleInterop`, `resolveJsonModule`, `allowSyntheticDefaultImports`, and `preserveSymlinks` configured for monorepo builds.

2. **Application overrides**
   - `apps/web` and `apps/web-widget` override to `module: ESNext`, `moduleResolution: bundler`, and include DOM libs for Vite builds; they emit declarations and source maps without incremental cache.
   - `apps/api` retains CommonJS output with composite/declaration builds for server targets.

3. **Project references**
   - `packages/worker` references `shared`, `database`, `channels`, and `orchestrator` as expected; `packages/database` references `shared`; `packages/events` references both `shared` and `database` while using multiple `rootDir` entries.
   - `apps/web-widget` includes an empty `references: []`, which is a no-op and can be removed.

4. **Type safety gaps**
   - Runtime helpers still rely on `any` casts (e.g., async handler wrapper, JWT payload parsing). These should be replaced with concrete types given the strict configuration.
   - Look for and replace `as any`, `@ts-ignore`, and `@ts-expect-error` occurrences to align with the strict settings.

5. **Build status and outputs**
   - Turbo build fails for `@meta-chat/database` because the generated Prisma client is missing many model/type exports (e.g., `AdminAuditLog`, `InputJsonValue`, `Tenant`). Regenerating the client is required before builds can pass.
   - Other packages completed TypeScript checks before the database failure stopped the pipeline.

## Recommended follow-ups
- Regenerate the Prisma client for `packages/database` so that all expected model/type exports are present.
- Remove the empty `references` array from `apps/web-widget/tsconfig.json` or populate it with actual upstream packages if needed.
- Replace remaining `any`-based casts and type assertion hacks with concrete types in the runtime helpers mentioned above.
