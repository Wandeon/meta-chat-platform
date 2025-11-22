# Tenant User Authentication System Design

**Date:** 2025-11-23  
**Status:** Approved  
**Author:** Claude Code

## Overview

Implementation of email/password authentication for tenant users (customers), separate from the existing admin API key system.

## Problem Statement

Currently, users who sign up receive a verification email and their account is created, but they cannot log in because:
- The login page only accepts admin API keys (adm_xxx)
- Tenant API keys (mcp_xxx) are returned by the verification endpoint but never shown to users
- No email/password login mechanism exists

This makes the platform unusable for non-technical customers who expect standard email/password authentication.

## Solution Architecture

### Two-Tier Authentication Model

**Platform Admins:**
- Continue using Admin API keys (adm_xxx)
- Access via API key entry on login page
- No changes to existing functionality

**Tenant Users (Customers):**
- New email/password authentication with JWT tokens
- Standard SaaS login experience
- Password reset capability via email

## Database Schema

### New Model: TenantUser

```prisma
model TenantUser {
  id                 String    @id @default(cuid())
  tenantId           String
  email              String    @unique
  password           String    // bcrypt hashed
  name               String?
  emailVerified      Boolean   @default(false)
  role               TenantUserRole @default(OWNER)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  tenant             Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  verificationTokens VerificationToken[]
  passwordResetTokens PasswordResetToken[]
  
  @@map("tenant_users")
}

enum TenantUserRole {
  OWNER    // Created the tenant (from signup)
  ADMIN    // Future: invited team member with full access
  MEMBER   // Future: invited team member with limited access
}
```

### New Model: PasswordResetToken

```prisma
model PasswordResetToken {
  id             String       @id @default(cuid())
  tenantUserId   String
  token          String       @unique
  expiresAt      DateTime
  used           Boolean      @default(false)
  createdAt      DateTime     @default(now())
  
  tenantUser     TenantUser   @relation(fields: [tenantUserId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@map("password_reset_tokens")
}
```

### Updated Models

**Tenant:**
```prisma
model Tenant {
  // ... existing fields ...
  users          TenantUser[]  // Add this relation
}
```

**VerificationToken:**
```prisma
model VerificationToken {
  // Add optional relationship to TenantUser
  tenantUserId   String?
  tenantUser     TenantUser?  @relation(fields: [tenantUserId], references: [id], onDelete: Cascade)
  
  // Keep existing adminId for backwards compatibility
  adminId        String?
  admin          AdminUser?   @relation(fields: [adminId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### POST /api/auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx123...",
    "email": "user@example.com",
    "name": "John Doe",
    "tenantId": "clx456..."
  }
}
```

**Errors:**
- 401: Invalid credentials (generic message for security)
- 403: Email not verified
- 400: Validation error
- 429: Too many login attempts

### POST /api/auth/forgot-password

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive a password reset link."
}
```

**Note:** Always returns 200 even if email doesn't exist (security best practice to prevent email enumeration)

### POST /api/auth/reset-password

**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. You can now log in with your new password."
}
```

**Errors:**
- 400: Invalid or expired token
- 400: Password validation failed
- 400: Token already used

### Modified: POST /api/auth/signup

**Changes:**
- Create `TenantUser` instead of `AdminUser`
- Link verification token to `TenantUser`
- Same request/response format

### Modified: POST /api/auth/verify-email

**Changes:**
- Mark `TenantUser.emailVerified = true`
- Create tenant on first verification (existing behavior)
- Remove API key from response (no longer needed)

## JWT Token Structure

```typescript
{
  userId: "clx123...",      // TenantUser.id
  tenantId: "clx456...",    // TenantUser.tenantId
  email: "user@example.com",
  type: "tenant_user",      // Distinguish from potential admin tokens
  iat: 1234567890,           // Issued at timestamp
  exp: 1234567890            // Expires in 7 days (604800 seconds)
}
```

**Configuration:**
- Secret: Use existing `ADMIN_JWT_SECRET` environment variable
- Algorithm: HS256
- Expiration: 7 days
- Issuer: "meta-chat-platform"

## Security Implementation

### Password Security

```typescript
// Hashing (bcrypt with cost factor 12)
const hash = await bcrypt.hash(password, 12);

// Verification
const valid = await bcrypt.compare(password, user.password);

// Requirements (enforced):
// - Minimum 8 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 number
// - At least 1 special character
```

### Password Reset Token Security

```typescript
// Generate cryptographically secure token
const token = crypto.randomBytes(32).toString('hex');

// Set expiration (1 hour)
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

// One-time use (mark as used after successful reset)
```

### JWT Security

- Stored in localStorage on frontend
- Sent as Bearer token: `Authorization: Bearer <token>`
- Validated on every protected route
- Automatic logout on expiration or invalid signature

### Middleware: authenticateTenantUser

```typescript
// Extract JWT from Authorization header
// Verify signature and expiration
// Decode payload
// Attach to request: req.tenantUser = { userId, tenantId, email }
// Return 401 if invalid/missing/expired
```

**Applied to routes:**
- All /api/tenants endpoints
- All /api/channels endpoints
- All /api/documents endpoints
- All /api/webhooks endpoints
- All /api/conversations endpoints
- Dashboard-specific endpoints

**Existing middleware unchanged:**
- `authenticateAdmin` - for admin API keys
- `authenticateTenant` - for tenant API keys (mcp_xxx) used by external integrations

## Frontend Changes

### LoginPage.tsx

**Before:**
- Single input for API key
- Only accepts `adm_` prefixed keys

**After:**
- Email input
- Password input
- "Forgot password?" link
- "Sign in" button
- Calls POST /api/auth/login
- Stores JWT in localStorage
- Updates AuthProvider context

### New: ForgotPasswordPage.tsx

- Route: `/forgot-password`
- Single email input
- Calls POST /api/auth/forgot-password
- Shows success message: "Check your email for reset instructions"

### New: ResetPasswordPage.tsx

- Route: `/reset-password?token=xxx`
- Extracts token from URL query params
- New password input with confirmation
- Password strength indicator
- Calls POST /api/auth/reset-password
- Redirects to login on success

### Updated: VerifyEmailPage.tsx

**Changes:**
- Remove API key display (no longer returned)
- Success message: "Email verified! You can now log in."
- Redirect to `/login` after 2 seconds

### Updated: AuthProvider.tsx

**Changes:**
- Store JWT token instead of API key
- Storage key: `meta-chat/auth-token`
- Add `getUser()` function to decode JWT
- Add `isAuthenticated()` to check token validity
- Auto-logout on JWT expiration

### Updated: API Client

**Changes:**
- Send JWT as: `Authorization: Bearer <token>`
- Intercept 401 responses → auto logout
- Show "Session expired" message on 401

## Error Handling

### Login Errors

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid credentials | 401 | "Invalid email or password" |
| Email not verified | 403 | "Please verify your email address before logging in" |
| Account disabled | 403 | "Your account has been disabled. Contact support." |
| Rate limited | 429 | "Too many login attempts. Please try again in 15 minutes." |

### Password Reset Errors

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Invalid token | 400 | "Password reset link is invalid or has expired" |
| Token expired | 400 | "Password reset link has expired. Please request a new one." |
| Token used | 400 | "This password reset link has already been used" |
| Weak password | 400 | Specific validation errors |

### JWT Errors

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Expired token | 401 | "Your session has expired. Please log in again." |
| Invalid signature | 401 | "Invalid authentication token" |
| Missing token | 401 | "Authentication required" |
| Malformed token | 401 | "Invalid authentication token" |

## Testing Strategy

### Unit Tests

- Password hashing and verification
- JWT generation and validation
- Password reset token generation
- Password strength validation
- Email validation

### Integration Tests

| Test Case | Endpoint | Expected Result |
|-----------|----------|-----------------|
| Login with valid credentials | POST /api/auth/login | 200 + JWT token |
| Login with invalid password | POST /api/auth/login | 401 error |
| Login with unverified email | POST /api/auth/login | 403 error |
| Request password reset | POST /api/auth/forgot-password | 200 + email sent |
| Reset password with valid token | POST /api/auth/reset-password | 200 success |
| Reset password with expired token | POST /api/auth/reset-password | 400 error |
| Complete signup flow | signup → verify → login | Full flow works |
| Access protected route with valid JWT | GET /api/tenants | 200 success |
| Access protected route without JWT | GET /api/tenants | 401 error |
| Access protected route with expired JWT | GET /api/tenants | 401 error |

### Manual Testing Checklist

- [ ] Sign up new account
- [ ] Receive verification email
- [ ] Click verification link
- [ ] Log in with email/password
- [ ] Access dashboard successfully
- [ ] Create tenant resources (channels, documents)
- [ ] Log out
- [ ] Log in again (JWT persisted)
- [ ] Click "Forgot password"
- [ ] Receive reset email
- [ ] Click reset link
- [ ] Set new password
- [ ] Log in with new password
- [ ] Verify session expires after 7 days
- [ ] Verify concurrent sessions work (multiple tabs)

## Migration Strategy

### Database Migration Steps

1. **Create new tables (zero downtime):**
   - `tenant_users`
   - `password_reset_tokens`
   - Add optional `tenantUserId` to `verification_tokens`

2. **Deploy code changes:**
   - Signup creates `TenantUser` instead of `AdminUser`
   - Verification links to `TenantUser`
   - Login authenticates `TenantUser`

3. **No data migration needed:**
   - Existing `AdminUser` records remain as platform admins
   - New signups automatically go to `TenantUser`
   - Clean separation of concerns

### Deployment Steps (VPS-00)

```bash
# 1. Create feature branch
git checkout -b feature/tenant-user-auth

# 2. Make all code changes (following implementation plan)

# 3. Commit with clear messages
git add .
git commit -m "feat: Add TenantUser authentication system

- Add TenantUser and PasswordResetToken models
- Implement login, forgot-password, reset-password endpoints
- Update frontend to email/password login
- Add JWT-based session management
- Add password reset flow with email
"

# 4. Push and create PR
git push origin feature/tenant-user-auth

# 5. After PR review and merge to main:
cd /home/deploy/meta-chat-platform
git pull origin main

# 6. Run database migration
npx prisma migrate deploy

# 7. Build backend
cd apps/api
npm run build

# 8. Build frontend
cd ../dashboard
npm run build

# 9. Restart services
pm2 restart meta-chat-api

# 10. Verify deployment
curl https://chat.genai.hr/api/health
```

### Rollback Plan

```bash
# If critical issues arise:
1. Revert code deployment:
   git revert <commit-hash>
   git push origin main
   
2. Rebuild and restart:
   npm run build
   pm2 restart meta-chat-api

3. Database rollback NOT needed:
   - New tables don't affect existing functionality
   - Old admin key login still works
   - Can debug and redeploy fix

4. Monitor logs:
   pm2 logs meta-chat-api --lines 100
```

## Monitoring Post-Deployment

### Health Checks

- API health endpoint: https://chat.genai.hr/api/health
- Test user signup flow end-to-end
- Monitor PM2 logs for errors
- Check SMTP logs for email delivery

### Key Metrics to Watch

- Login success/failure rate
- Password reset requests
- JWT validation errors
- Email delivery failures
- Session expiration handling

### Log Monitoring

```bash
# Watch API logs
pm2 logs meta-chat-api --lines 50 --raw

# Look for:
# - "Login successful" / "Login failed"
# - "Password reset email sent"
# - "JWT validation failed"
# - SMTP errors
```

## Environment Variables

**No new environment variables required.**

Reusing existing:
- `ADMIN_JWT_SECRET` - For JWT signing
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - For emails
- `BASE_URL` - For email links

## Success Criteria

**User Experience:**
- [ ] Non-technical users can sign up with email/password
- [ ] Users receive verification email and can verify
- [ ] Users can log in with email/password
- [ ] Users can reset forgotten password
- [ ] Session persists for 7 days
- [ ] Clear error messages for all failure cases

**Technical:**
- [ ] All integration tests pass
- [ ] Zero downtime deployment
- [ ] No impact on existing admin authentication
- [ ] JWT tokens properly validated
- [ ] Passwords securely hashed with bcrypt
- [ ] Email delivery working for verification and reset

**Security:**
- [ ] Passwords meet strength requirements
- [ ] JWT tokens expire appropriately
- [ ] Password reset tokens single-use and time-limited
- [ ] No email enumeration via forgot password
- [ ] Rate limiting on login attempts

## Future Enhancements (Out of Scope)

- Two-factor authentication (2FA)
- Team member invitations (multiple users per tenant)
- Role-based permissions (OWNER, ADMIN, MEMBER)
- OAuth social login (Google, GitHub)
- Session management UI (view/revoke active sessions)
- Remember me checkbox (longer token expiration)
- Account deletion workflow
- Email change with verification

## References

- JWT Best Practices: https://tools.ietf.org/html/rfc7519
- bcrypt Documentation: https://github.com/kelektiv/node.bcrypt.js
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
