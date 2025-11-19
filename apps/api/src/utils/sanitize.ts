import DOMPurify = require('isomorphic-dompurify');

/**
 * Sanitizes HTML to prevent XSS attacks (server-side)
 * Allows safe HTML tags while removing dangerous scripts
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

/**
 * Strips all HTML tags, returning plain text only
 */
export function stripHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitizes widget configuration object on the server
 * This is the CRITICAL defense against stored XSS attacks
 * Validates and sanitizes all user-supplied text fields
 */
export function sanitizeWidgetConfig(config: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  // Sanitize text fields that may contain HTML
  if (config.brandName) sanitized.brandName = stripHtml(config.brandName);
  if (config.agentName) sanitized.agentName = stripHtml(config.agentName);
  if (config.initialMessage) sanitized.initialMessage = sanitizeHtml(config.initialMessage);
  if (config.composerPlaceholder) sanitized.composerPlaceholder = stripHtml(config.composerPlaceholder);
  if (config.quickReplies) sanitized.quickReplies = stripHtml(config.quickReplies);

  // Pass through safe fields (colors, numbers, booleans)
  if (config.primaryColor) sanitized.primaryColor = String(config.primaryColor).trim();
  if (config.backgroundColor) sanitized.backgroundColor = String(config.backgroundColor).trim();
  if (config.textColor) sanitized.textColor = String(config.textColor).trim();
  if (typeof config.borderRadius === 'number') sanitized.borderRadius = config.borderRadius;
  if (typeof config.showBranding === 'boolean') sanitized.showBranding = config.showBranding;

  return sanitized;
}
