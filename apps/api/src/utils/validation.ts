/**
 * Validation utilities for input sanitization and SQL injection prevention
 */

import { z } from 'zod';

/**
 * UUID validation schema
 * Ensures input is a valid UUID v4
 */
export const uuidSchema = z.string().uuid({
  message: 'Invalid UUID format',
});

/**
 * Document ID array validation schema
 * Validates array of UUIDs with max limit to prevent DoS
 */
export const documentIdsSchema = z
  .array(z.string().uuid({
    message: 'Invalid document ID format - must be UUID',
  }))
  .max(100, {
    message: 'Too many document IDs - maximum 100 allowed',
  });

/**
 * Language code validation schema (ISO 639-1)
 * Two-letter language codes
 */
export const languageCodeSchema = z
  .string()
  .length(2, {
    message: 'Language code must be 2 characters (ISO 639-1)',
  })
  .regex(/^[a-z]{2}$/, {
    message: 'Language code must be lowercase letters only',
  });

/**
 * Search options validation schema
 * Validates all search parameters to prevent SQL injection and DoS
 */
export const searchOptionsSchema = z.object({
  limit: z
    .number()
    .int({ message: 'Limit must be an integer' })
    .min(1, { message: 'Limit must be at least 1' })
    .max(100, { message: 'Limit cannot exceed 100' })
    .optional(),
  minSimilarity: z
    .number()
    .min(0, { message: 'Similarity must be between 0 and 1' })
    .max(1, { message: 'Similarity must be between 0 and 1' })
    .optional(),
  documentIds: documentIdsSchema.optional(),
  languageFilter: languageCodeSchema.optional(),
});

/**
 * Validate search options before executing query
 * Throws ZodError if validation fails
 */
export function validateSearchOptions(options: unknown): z.infer<typeof searchOptionsSchema> {
  return searchOptionsSchema.parse(options);
}

/**
 * Validate tenant ID
 * Throws ZodError if validation fails
 */
export function validateTenantId(tenantId: unknown): string {
  return uuidSchema.parse(tenantId);
}

/**
 * Validate document ID
 * Throws ZodError if validation fails
 */
export function validateDocumentId(documentId: unknown): string {
  return uuidSchema.parse(documentId);
}

/**
 * Validate array of document IDs
 * Throws ZodError if validation fails
 */
export function validateDocumentIds(documentIds: unknown): string[] {
  return documentIdsSchema.parse(documentIds);
}

/**
 * Safe validation that returns validation result without throwing
 */
export function safeValidateSearchOptions(options: unknown): {
  success: boolean;
  data?: z.infer<typeof searchOptionsSchema>;
  error?: z.ZodError;
} {
  const result = searchOptionsSchema.safeParse(options);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
