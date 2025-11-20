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

Set in :


### Disabling HTTPS Enforcement

To disable HTTPS enforcement (not recommended for production):


## Security Headers

The application sets the following security headers:

### 1. Strict-Transport-Security (HSTS)
- **Purpose**: Forces HTTPS for 1 year
- **Value**: 
- **Effect**: Prevents downgrade attacks and SSL stripping
- **Applied by**: Both Caddy and application

### 2. X-Frame-Options
- **Purpose**: Prevents clickjacking attacks
- **Value**: 
- **Effect**: Prevents page from being embedded in iframes

### 3. X-Content-Type-Options
- **Purpose**: Prevents MIME type sniffing
- **Value**: 
- **Effect**: Forces browsers to respect declared content types

### 4. X-XSS-Protection
- **Purpose**: Enables browser XSS filters
- **Value**: 
- **Effect**: Activates browser's built-in XSS protection

### 5. Content-Security-Policy (CSP)
- **Purpose**: Restricts resource loading
- **Value**: 
- **Effect**: Prevents XSS and data injection attacks
- **Applied**: Only in production

### 6. Referrer-Policy
- **Purpose**: Controls referrer information
- **Value**: 
- **Effect**: Limits information leaked to other sites

### 7. Permissions-Policy
- **Purpose**: Disables unnecessary browser features
- **Value**: 
- **Effect**: Reduces attack surface

## HTTPS Enforcement Behavior

### Production Mode ()

**HTTP Requests:**
- Status: 
- Response:
  

**HTTPS Requests:**
- Allowed
- All security headers applied

### Development Mode ()

- HTTP requests allowed (for local development)
- HSTS header not set
- CSP header not set
- Other security headers still applied

## Testing

### Test HTTP Request (Production)


Expected response:


### Test HTTPS Request
{"success":false,"error":{"code":"error","message":"Route not found: GET /api/health"}}

### Verify Security Headers
HTTP/2 404 
access-control-allow-credentials: true
alt-svc: h3=":443"; ma=2592000
content-type: application/json; charset=utf-8
date: Wed, 19 Nov 2025 23:21:46 GMT
etag: W/"58-TGM/2p+gVDzTUD7SlKMIVfrz2hI"
permissions-policy: geolocation=(), microphone=(), camera=()
ratelimit-limit: 120
ratelimit-policy: 120;w=60
ratelimit-remaining: 118
ratelimit-reset: 60
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains; preload
vary: Origin
via: 1.1 Caddy
x-content-type-options: nosniff
x-correlation-id: 93470bdd-d321-453b-ba94-fa6480d0d372
x-frame-options: SAMEORIGIN
x-powered-by: Express
x-request-id: 93470bdd-d321-453b-ba94-fa6480d0d372
x-xss-protection: 1; mode=block
content-length: 88


Expected headers:


## Development Setup

HTTP is allowed in development for local testing:



Access via:
-  - Works
-  - Also works if SSL configured

## Caddy Integration

The application works behind Caddy reverse proxy:

1. Caddy handles TLS termination (Let's Encrypt certificates)
2. Caddy sets  header
3. Application trusts proxy ()
4. Application checks  header
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

### HTTPS required Error in Production

**Cause**: Making HTTP request to production API

**Solution**: Use  instead of 

### Headers Not Appearing

**Check**:
1. Verify  is set
2. Verify  is configured
3. Check Caddy is setting 

### Local Development Issues

**Solution**: Set  or 

## Compliance

This configuration helps meet security requirements for:
- PCI DSS (Payment Card Industry Data Security Standard)
- GDPR (General Data Protection Regulation)
- OWASP Top 10 security best practices
- SOC 2 compliance requirements

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [HSTS Preload List](https://hstspreload.org/)
