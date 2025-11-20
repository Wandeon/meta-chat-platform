# Dependency and package structure review

## Summary of issues
- Several packages invoke `vitest` in scripts but do not declare it in `devDependencies`, which will break isolated installs or workspaces that don't hoist the root dev dependency.
- Internal packages use inconsistent version specs (`file:../shared`, `*`, and pinned versions), making it unclear whether workspace-local builds are enforced and raising the risk of mismatched versions during publish or CI.
- The dashboard app uses React Router v6 but pulls in v5 type definitions, creating a version conflict that can surface as type errors.
- TypeScript composite builds are enabled globally, but most packages that depend on other internal packages don't declare `references`, so `tsc -b` cannot derive a safe build order.
- `@meta-chat/channels` pins `socket.io` to `^4.7.5` while the API app requires `^4.8.1`, which can lead to divergent socket client/server expectations if the dependency deduplicates unexpectedly.

## Details
### Missing dev dependencies for tests
The following packages run `vitest` but do not list it in `devDependencies`:
- `@meta-chat/events`
- `@meta-chat/orchestrator`
- `@meta-chat/rag`
- `@meta-chat/shared`
- `@meta-chat/database`
- `@meta-chat/api`

Each package defines a `test` script using `vitest` but lacks the dependency, so running tests from within the package will fail unless the root hoists Vitest. 【F:packages/events/package.json†L6-L21】【F:packages/orchestrator/package.json†L6-L23】【F:packages/rag/package.json†L14-L23】【F:packages/shared/package.json†L6-L19】【F:packages/database/package.json†L6-L25】【F:apps/api/package.json†L7-L43】

### Inconsistent internal versioning
Internal workspace references mix `file:` links, `*`, and explicit versions (e.g., `1.0.0`). This inconsistency makes it unclear which package graph Turborepo should respect and can allow npm to satisfy dependencies with published versions instead of local sources. Examples include `@meta-chat/channels` using `file:../shared`, `@meta-chat/rag` pinning `@meta-chat/database`/`@meta-chat/shared` to `1.0.0`, while most other packages use `*`. 【F:packages/channels/package.json†L12-L21】【F:packages/rag/package.json†L6-L23】【F:packages/orchestrator/package.json†L12-L23】

### Version conflicts
- Dashboard depends on `react-router-dom` v6 but uses `@types/react-router-dom` v5. The library ships its own types in v6, so the mismatched v5 typings can cause incorrect or missing definitions during builds. 【F:apps/dashboard/package.json†L12-L34】
- `socket.io` versions differ between `@meta-chat/channels` (`^4.7.5`) and `@meta-chat/api` (`^4.8.1`), which can lead to duplicate installs or behavioral differences across services. 【F:packages/channels/package.json†L12-L21】【F:apps/api/package.json†L13-L35】

### TypeScript project references are missing
The base config enables `composite` mode, but most packages with internal dependencies (e.g., orchestrator, rag, shared) omit `references` entries. Without references, `tsc -b` cannot order builds or emit `.d.ts` outputs for dependents reliably, which undermines incremental builds across the monorepo. 【F:tsconfig.base.json†L2-L19】【F:packages/orchestrator/tsconfig.json†L1-L9】【F:packages/rag/tsconfig.json†L1-L8】【F:packages/shared/tsconfig.json†L1-L8】

### Build ordering and internal imports
- Turbo relies on package.json relationships for ordering. Because internal version specs are inconsistent and composite references are missing, builds may not correctly enforce the intended order (e.g., shared → database → events → orchestrator/worker). 【F:packages/orchestrator/package.json†L12-L23】【F:packages/database/package.json†L16-L25】
- No direct cross-package relative imports were found, but the mixed dependency declarations increase the chance of packages resolving to hoisted or published copies instead of workspace builds.

### Package-lock observations
`package-lock.json` did not contain duplicate package versions (per automated scan), so current installs are deduped, but the version inconsistencies noted above could reintroduce conflicts with future installs.
