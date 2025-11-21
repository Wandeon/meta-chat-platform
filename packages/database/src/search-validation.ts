import { createLogger } from '@meta-chat/shared';

const logger = createLogger('SearchValidation');

export interface ValidationResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
}

/**
 * Validates and sanitizes search input to prevent SQL injection attacks.
 * 
 * Security measures:
 * 1. Length limits to prevent DoS
 * 2. Character whitelist for safe search terms
 * 3. Sanitization of special characters
 * 4. Protection against SQL injection patterns
 */
export function validateAndSanitizeSearchQuery(input: string): ValidationResult {
  // Check if input is empty
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      error: 'Search query must be a non-empty string',
    };
  }

  // Length validation (max 200 characters)
  const maxLength = 200;
  if (input.length > maxLength) {
    return {
      isValid: false,
      error: `Search query must not exceed ${maxLength} characters`,
    };
  }

  // Trim whitespace
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Search query cannot be empty or only whitespace',
    };
  }

  // Check for minimum length (at least 2 characters)
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Search query must be at least 2 characters long',
    };
  }

  // Check for SQL injection patterns (common attack vectors)
  const sqlInjectionPatterns = [
    /(\b(DROP|DELETE|INSERT|UPDATE|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
    /--/,
    /\/\*/,
    /;/,
    /\bOR\b.*\b(=|LIKE)\b/i,
    /\bUNION\b.*\bSELECT\b/i,
    /0x[0-9a-f]+/i,
    /\\x[0-9a-f]+/i,
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(trimmed)) {
      logger.warn('SQL injection attempt detected', { query: trimmed, pattern: pattern.source });
      return {
        isValid: false,
        error: 'Search query contains invalid characters or patterns',
      };
    }
  }

  // Allow only safe characters
  const allowedCharsPattern = /^[a-zA-Z0-9\s\-_.,'!?@#$%&()+:]+$/;
  if (!allowedCharsPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Search query contains invalid characters',
    };
  }

  // Sanitize
  const sanitized = trimmed
    .replace(/\s+/g, ' ')
    .replace(/['"]/g, '')
    .trim();

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Validates numeric parameters
 */
export function validateNumericParameter(
  value: any,
  paramName: string,
  min: number,
  max: number
): ValidationResult {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return {
      isValid: false,
      error: `${paramName} must be a valid number`,
    };
  }

  if (num < min || num > max) {
    return {
      isValid: false,
      error: `${paramName} must be between ${min} and ${max}`,
    };
  }

  return {
    isValid: true,
    sanitized: String(num),
  };
}

/**
 * Validates tenant ID format (UUID)
 */
export function validateTenantId(tenantId: string): ValidationResult {
  if (!tenantId || typeof tenantId !== 'string') {
    return {
      isValid: false,
      error: 'Tenant ID must be a non-empty string',
    };
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(tenantId)) {
    return {
      isValid: false,
      error: 'Tenant ID must be a valid UUID',
    };
  }

  return {
    isValid: true,
    sanitized: tenantId.toLowerCase(),
  };
}
