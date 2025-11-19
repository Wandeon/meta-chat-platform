# SQL Injection Prevention

## Overview

This document outlines security measures implemented to prevent SQL injection vulnerabilities in the Meta Chat Platform, specifically focusing on raw SQL queries using Prisma.

## Critical Fix: Vector Search Service

### Vulnerability (Fixed in PR #XX)

**Location:** `apps/api/src/services/vectorSearch.ts`

**Issue:** The vector search service previously used `$queryRawUnsafe` with string interpolation to build SQL queries, enabling SQL injection attacks through:
- Document IDs array
- Language filter parameter
- Tenant ID parameter

**Attack Vector Example:**
```typescript
// Malicious input
documentIds: ["123'; DROP TABLE chunks; --"]

// Previous vulnerable code
const documentFilter = `AND "documentId" = ANY(ARRAY[${options.documentIds.map((id) => `'${id}'`).join(',')}])`;
// Results in: AND "documentId" = ANY(ARRAY['123'; DROP TABLE chunks; --'])
```

### Solution

Replaced `$queryRawUnsafe` with Prisma's tagged template literals (`$queryRaw`) and `Prisma.sql` for dynamic query fragments:

```typescript
// SECURE: Using Prisma.sql for parameterization
const documentFilter = options.documentIds?.length
  ? Prisma.sql`AND "documentId" = ANY(${options.documentIds}::text[])`
  : Prisma.empty;

const results = await prisma.$queryRaw`
  SELECT *
  FROM "chunks"
  WHERE "tenantId" = ${tenantId}
    ${documentFilter}
  LIMIT ${limit}
`;
```

### Input Validation

Added comprehensive Zod schema validation in `apps/api/src/utils/validation.ts`:

- **UUID validation** for tenant IDs and document IDs
- **Array size limits** (max 100 document IDs) to prevent DoS
- **Language code validation** (ISO 639-1, lowercase, 2 chars)
- **Numeric range validation** for limits (1-100) and similarity (0-1)

## Guidelines for Developers

### 1. Always Use Prisma Parameterization

**DO:**
```typescript
// ✅ Correct: Prisma automatically parameterizes variables in tagged templates
const results = await prisma.$queryRaw`
  SELECT * FROM users WHERE id = ${userId}
`;
```

**DON'T:**
```typescript
// ❌ Wrong: String interpolation enables SQL injection
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE id = '${userId}'`
);
```

### 2. Use Prisma.sql for Dynamic Query Fragments

**DO:**
```typescript
// ✅ Correct: Dynamic filters using Prisma.sql
const statusFilter = status
  ? Prisma.sql`AND status = ${status}`
  : Prisma.empty;

const results = await prisma.$queryRaw`
  SELECT * FROM documents
  WHERE "tenantId" = ${tenantId}
    ${statusFilter}
`;
```

**DON'T:**
```typescript
// ❌ Wrong: String concatenation
const statusFilter = status ? `AND status = '${status}'` : '';

const query = `
  SELECT * FROM documents
  WHERE "tenantId" = '${tenantId}'
  ${statusFilter}
`;
const results = await prisma.$queryRawUnsafe(query);
```

### 3. Validate All User Inputs

**DO:**
```typescript
// ✅ Correct: Validate before using
import { validateTenantId, validateSearchOptions } from '../utils/validation';

export async function searchData(tenantId: string, options: any) {
  validateTenantId(tenantId);
  const validOptions = validateSearchOptions(options);

  // Use validated inputs in query...
}
```

**DON'T:**
```typescript
// ❌ Wrong: Trust user input
export async function searchData(tenantId: string, options: any) {
  // Directly using unvalidated inputs
  const results = await prisma.$queryRaw`...`;
}
```

### 4. Use Array Parameters Correctly

**DO:**
```typescript
// ✅ Correct: Prisma handles array parameterization
const ids = ['id1', 'id2', 'id3'];
const results = await prisma.$queryRaw`
  SELECT * FROM documents
  WHERE id = ANY(${ids}::text[])
`;
```

**DON'T:**
```typescript
// ❌ Wrong: Manual array string building
const idsStr = ids.map(id => `'${id}'`).join(',');
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM documents WHERE id = ANY(ARRAY[${idsStr}])`
);
```

### 5. Implement Input Validation Schemas

Create Zod schemas for all input types:

```typescript
import { z } from 'zod';

export const myInputSchema = z.object({
  id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export function validateMyInput(input: unknown) {
  return myInputSchema.parse(input); // Throws if invalid
}
```

### 6. Write Security Tests

Include SQL injection prevention tests for all services using raw SQL:

```typescript
describe('SQL Injection Prevention', () => {
  it('should reject malicious SQL in parameters', async () => {
    const maliciousInput = "123'; DROP TABLE users; --";

    await expect(
      myFunction(maliciousInput)
    ).rejects.toThrow();
  });

  it('should verify database integrity after malicious attempts', async () => {
    // Try malicious inputs
    try {
      await myFunction("'; DROP TABLE users; --");
    } catch (error) {
      // Expected to fail
    }

    // Verify table still exists
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
```

## Audit Results

### Services Using Raw SQL

All raw SQL queries in the codebase have been audited:

1. **apps/api/src/services/vectorSearch.ts** - ✅ FIXED
   - Replaced `$queryRawUnsafe` with `$queryRaw`
   - Added Prisma.sql for dynamic fragments
   - Added comprehensive input validation

2. **apps/api/src/services/AnalyticsService.ts** - ✅ SAFE
   - Already using `$queryRaw` with parameterized queries
   - All variables properly parameterized with `${variable}`

3. **apps/api/src/routes/auth/verify-email.ts** - ✅ SAFE
   - Using `$queryRaw` with parameterized queries
   - Token validation in place

4. **apps/api/src/routes/auth/signup.ts** - ✅ SAFE
   - Using `$executeRaw` with parameterized queries
   - Proper token handling

5. **apps/api/src/routes/health.ts** - ✅ SAFE
   - Simple health check queries: `SELECT 1`
   - No user input

6. **apps/api/src/services/documentProcessor.ts** - ✅ SAFE
   - Using parameterized queries

### No Vulnerabilities Found

Other than the vector search service (now fixed), all raw SQL queries in the codebase properly use Prisma's parameterization features.

## Security Checklist

Before merging code that uses raw SQL:

- [ ] Uses `$queryRaw` instead of `$queryRawUnsafe`
- [ ] Uses `$executeRaw` instead of `$executeRawUnsafe`
- [ ] All user inputs are parameterized with `${variable}`
- [ ] Dynamic query parts use `Prisma.sql` and `Prisma.empty`
- [ ] No string concatenation or interpolation in SQL
- [ ] Input validation with Zod schemas
- [ ] Security tests cover SQL injection scenarios
- [ ] Array parameters use `ANY(${array}::type[])`
- [ ] UUIDs validated before use
- [ ] Numeric limits enforced (DoS prevention)

## References

- [Prisma SQL Injection Prevention](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#sql-injection)
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Zod Validation Library](https://zod.dev/)

## Examples

See the following files for reference implementations:

- **Vector Search (Fixed):** `apps/api/src/services/vectorSearch.ts`
- **Input Validation:** `apps/api/src/utils/validation.ts`
- **Security Tests:** `apps/api/src/services/__tests__/vectorSearch.security.test.ts`

## Questions?

If you're unsure about SQL injection prevention in your code:

1. Review this document
2. Look at the reference implementations
3. Run security tests
4. Request a security review before merging
