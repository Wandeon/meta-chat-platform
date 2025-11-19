import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML to prevent XSS attacks
 * Allows safe HTML tags while removing dangerous scripts
 * 
 * This is critical for preventing stored XSS vulnerabilities where
 * user-supplied content could contain malicious JavaScript.
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
 * Use for contexts where no HTML should be allowed
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
 * Sanitizes widget configuration object
 * Ensures all user-supplied text fields are safe from XSS
 */
export function sanitizeWidgetConfig(config: Record<string, any>): Record<string, any> {
  return {
    ...config,
    // Sanitize text fields that may contain HTML
    brandName: stripHtml(config.brandName || ''),
    agentName: stripHtml(config.agentName || ''),
    initialMessage: sanitizeHtml(config.initialMessage || ''),
    composerPlaceholder: stripHtml(config.composerPlaceholder || ''),
    quickReplies: stripHtml(config.quickReplies || ''),
    // Pass through safe fields
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    borderRadius: config.borderRadius,
    showBranding: config.showBranding,
  };
}
