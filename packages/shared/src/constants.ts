// System constants

export const SYSTEM_CONSTANTS = {
  // Rate limits
  MAX_MESSAGE_LENGTH: 4096,
  MAX_CONVERSATION_HISTORY: 50,
  MAX_RAG_CHUNKS: 5,

  // Timeouts (ms)
  LLM_TIMEOUT: 30000,
  WEBHOOK_TIMEOUT: 10000,
  CHANNEL_SEND_TIMEOUT: 15000,

  // Retry configuration
  MAX_RETRY_ATTEMPTS: 5,
  INITIAL_RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 60000,

  // Vector search
  DEFAULT_EMBEDDING_DIMENSIONS: 1536,
  DEFAULT_TOP_K: 5,
  DEFAULT_MIN_SIMILARITY: 0.7,

  // Conversation timeouts
  CONVERSATION_IDLE_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

  // File limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',

  // Validation
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Channel errors
  CHANNEL_NOT_CONFIGURED: 'CHANNEL_NOT_CONFIGURED',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',

  // RAG errors
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  RETRIEVAL_FAILED: 'RETRIEVAL_FAILED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export const DEFAULT_BOT_INSTRUCTIONS = `You are a helpful AI assistant for {brandName}.
Your role is to answer customer questions based on the knowledge base provided.
Maintain a {tone} tone in all interactions.

Guidelines:
- Always be respectful and helpful
- If you don't know the answer, admit it and offer to connect them with a human agent
- Keep responses concise and actionable
- Use the provided functions when appropriate
- Never make up information not in the knowledge base`;

export const DEFAULT_HANDOFF_MESSAGE = `I understand you'd like to speak with a human agent. Let me connect you with someone who can help.`;

export const DEFAULT_ERROR_MESSAGE = `I apologize, but I'm experiencing technical difficulties. Please try again in a moment.`;
