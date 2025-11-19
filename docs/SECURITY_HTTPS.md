# HTTPS Enforcement

## Overview

The API enforces HTTPS in production to prevent:
- Man-in-the-middle attacks
- Session hijacking
- Credential theft
- Data tampering

## Architecture

The application uses a layered security approach:

1. **Caddy Reverse Proxy** - Handles TLS termination and sets initial security headers
2. **Application Layer** - Enforces HTTPS and adds additional security headers
3. **Express Middleware** - Applied before all routes to ensure consistent security

## Configuration

### Environment Variables

Set in .env.production:
```bash
# Enforce HTTPS in production (set to 'false' to disable)
ENFORCE_HTTPS=true

# Trust proxy headers (required when behind Caddy/nginx)
TRUST_PROXY=true

# HSTS max age in seconds (default: 1 year)
HSTS_MAX_AGE=31536000
```

### Disabling HTTPS Enforcement

To disable HTTPS enforcement (not recommended for production):
```bash
ENFORCE_HTTPS=false
```

## Security Headers

The application sets the following security headers:

### 1. Strict-Transport-Security (HSTS)
- **Purpose**: Forces HTTPS for 1 year
- **Value**: max-age=31536000; includeSubDomains; preload
- **Effect**: Prevents downgrade attacks and SSL stripping
- **Applied by**: Both Caddy and application

### 2. X-Frame-Options
- **Purpose**: Prevents clickjacking attacks
- **Value**: DENY
- **Effect**: Prevents page from being embedded in iframes

### 3. X-Content-Type-Options
- **Purpose**: Prevents MIME type sniffing
- **Value**: nosniff
- **Effect**: Forces browsers to respect declared content types

### 4. X-XSS-Protection
- **Purpose**: Enables browser XSS filters
- **Value**: 1; mode=block
- **Effect**: Activates browser's built-in XSS protection

### 5. Content-Security-Policy (CSP)
- **Purpose**: Restricts resource loading
- **Value**: default-src 'self'; script-src 'self'; ...
- **Effect**: Prevents XSS and data injection attacks
- **Applied**: Only in production

### 6. Referrer-Policy
- **Purpose**: Controls referrer information
- **Value**: strict-origin-when-cross-origin
- **Effect**: Limits information leaked to other sites

### 7. Permissions-Policy
- **Purpose**: Disables unnecessary browser features
- **Value**: geolocation=(), microphone=(), camera=(), payment=()
- **Effect**: Reduces attack surface

## HTTPS Enforcement Behavior

### Production Mode (NODE_ENV=production)

**HTTP Requests:**
- Status: 403 Forbidden
- Response:
  ```json
  {
    "success": false,
    "error": "HTTPS required",
    "code": "HTTPS_REQUIRED",
    "message": "This API requires HTTPS. Please use https:// instead of http://"
  }
  ```

**HTTPS Requests:**
- Allowed
- All security headers applied

### Development Mode (NODE_ENV=development)

- HTTP requests allowed (for local development)
- HSTS header not set
- CSP header not set
- Other security headers still applied

## Testing

### Test HTTP Request (Production)
```bash
# Should be blocked with 403 error
curl http://chat.genai.hr/api/health
```

Expected response:
```json
{
  "success": false,
  "error": "HTTPS required",
  "code": "HTTPS_REQUIRED",
  "message": "This API requires HTTPS. Please use https:// instead of http://"
}
```

### Test HTTPS Request
```bash
# Should work normally
curl https://chat.genai.hr/api/health
```

### Verify Security Headers
```bash
curl -I https://chat.genai.hr/api/health
```

Expected headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
Content-Security-Policy: default-src 'self'; ...
```

## Development Setup

HTTP is allowed in development for local testing:

```bash
NODE_ENV=development npm run dev
```

Access via:
- http://localhost:3000 - Works
- https://localhost:3000 - Also works if SSL configured

## Caddy Integration

The application works behind Caddy reverse proxy:

1. Caddy handles TLS termination (Let's Encrypt certificates)
2. Caddy sets X-Forwarded-Proto: https header
3. Application trusts proxy (trust proxy: 1)
4. Application checks X-Forwarded-Proto header
5. Both Caddy and application set security headers (defense in depth)

## Security Benefits

### Prevents Man-in-the-Middle Attacks
- All traffic encrypted via TLS
- HSTS prevents protocol downgrade

### Protects Sensitive Data
- JWT tokens encrypted in transit
- API keys not exposed over HTTP
- Session cookies protected

### Defense in Depth
- Multiple layers of security
- Caddy + Application both enforce security
- Even if one layer fails, others protect

## Troubleshooting

### "HTTPS required" Error in Production

**Cause**: Making HTTP request to production API

**Solution**: Use https:// instead of http://

### Headers Not Appearing

**Check**:
1. Verify NODE_ENV=production is set
2. Verify trust proxy is configured
3. Check Caddy is setting X-Forwarded-Proto

### Local Development Issues

**Solution**: Set NODE_ENV=development or ENFORCE_HTTPS=false

## Compliance

This configuration helps meet security requirements for:
- PCI DSS (Payment Card Industry Data Security Standard)
- GDPR (General Data Protection Regulation)
- OWASP Top 10 security best practices
- SOC 2 compliance requirements

## References

- OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/
- MDN Security Headers: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security
- HSTS Preload List: https://hstspreload.org/
