#\!/bin/bash
# Audit script for tenant isolation in the API
# Checks for Prisma queries that lack proper tenant scoping

set -e

echo "============================================="
echo "  Cross-Tenant Security Audit"
echo "============================================="
echo ""

ISSUES_FOUND=0

echo "1. Checking for Prisma queries without tenantId filter..."
echo "---------------------------------------------------"

# Find Prisma queries on multi-tenant tables without tenantId
VULNERABLE_QUERIES=$(grep -rn "prisma\.\(conversation\|message\|document\|chunk\)\.find" apps/api/src/routes/ \
  2>/dev/null \
  | grep -v "tenantId" \
  | grep -v "test" \
  | grep -v ".backup" \
  | grep -v "node_modules" \
  || true)

if [ -n "$VULNERABLE_QUERIES" ]; then
  echo "⚠️  WARNING: Found queries without tenantId filter:"
  echo "$VULNERABLE_QUERIES"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo "✅ No vulnerable queries found"
fi

echo ""
echo "2. Checking for raw SQL queries without tenantId..."
echo "---------------------------------------------------"

RAW_QUERIES=$(grep -rn "\$queryRaw\|\$executeRaw" apps/api/src/ \
  2>/dev/null \
  | grep -v "tenantId" \
  | grep -v "test" \
  | grep -v ".backup" \
  | grep -v "node_modules" \
  || true)

if [ -n "$RAW_QUERIES" ]; then
  echo "⚠️  WARNING: Found raw queries that may lack tenantId filter:"
  echo "$RAW_QUERIES"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo "✅ No vulnerable raw queries found"
fi

echo ""
echo "3. Checking for findUnique without tenant validation..."
echo "---------------------------------------------------"

# findUnique with just ID is dangerous - should use findFirst with tenantId
FINDUNIQUE_QUERIES=$(grep -rn "\.findUnique({" apps/api/src/routes/ \
  2>/dev/null \
  | grep -v "test" \
  | grep -v ".backup" \
  | grep -v "node_modules" \
  || true)

if [ -n "$FINDUNIQUE_QUERIES" ]; then
  echo "⚠️  INFO: Found findUnique queries (verify these check tenantId):"
  echo "$FINDUNIQUE_QUERIES"
  echo ""
  echo "   Note: findUnique should be paired with tenant validation."
  echo "   Consider using findFirst with tenantId in where clause instead."
else
  echo "✅ No findUnique queries found"
fi

echo ""
echo "4. Checking for delete without tenant scoping..."
echo "---------------------------------------------------"

# Delete operations should use deleteMany with tenantId
DELETE_QUERIES=$(grep -rn "\.delete({" apps/api/src/routes/ \
  2>/dev/null \
  | grep -v "test" \
  | grep -v ".backup" \
  | grep -v "node_modules" \
  || true)

if [ -n "$DELETE_QUERIES" ]; then
  echo "⚠️  WARNING: Found delete queries (should use deleteMany with tenantId):"
  echo "$DELETE_QUERIES"
  echo ""
  echo "   Recommendation: Use deleteMany with tenantId filter to prevent"
  echo "   cross-tenant deletion."
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo "✅ No unsafe delete queries found"
fi

echo ""
echo "5. Checking for update without tenant scoping..."
echo "---------------------------------------------------"

UPDATE_QUERIES=$(grep -rn "\.update({" apps/api/src/routes/ \
  2>/dev/null \
  | grep -v "updateMany" \
  | grep -v "test" \
  | grep -v ".backup" \
  | grep -v "node_modules" \
  || true)

if [ -n "$UPDATE_QUERIES" ]; then
  echo "ℹ️  INFO: Found update queries (verify these validate tenant ownership first):"
  echo "$UPDATE_QUERIES"
  echo ""
  echo "   Note: update() should be preceded by ownership validation."
fi

echo ""
echo "6. Summary of multi-tenant tables..."
echo "---------------------------------------------------"

echo "Tables requiring tenant scoping:"
echo "  - conversations"
echo "  - messages"
echo "  - documents"
echo "  - chunks"
echo "  - apiKeys"
echo "  - mcpServers"
echo "  - channels"
echo "  - webhooks"

echo ""
echo "============================================="
echo "  Audit Complete"
echo "============================================="

if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ Status: PASS - No critical issues found"
  exit 0
else
  echo "⚠️  Status: ISSUES FOUND - $ISSUES_FOUND categories need review"
  exit 1
fi
