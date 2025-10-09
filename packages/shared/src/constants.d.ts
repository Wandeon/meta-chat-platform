export declare const SYSTEM_CONSTANTS: {
    readonly MAX_MESSAGE_LENGTH: 4096;
    readonly MAX_CONVERSATION_HISTORY: 50;
    readonly MAX_RAG_CHUNKS: 5;
    readonly LLM_TIMEOUT: 30000;
    readonly WEBHOOK_TIMEOUT: 10000;
    readonly CHANNEL_SEND_TIMEOUT: 15000;
    readonly MAX_RETRY_ATTEMPTS: 5;
    readonly INITIAL_RETRY_DELAY: 1000;
    readonly MAX_RETRY_DELAY: 60000;
    readonly DEFAULT_EMBEDDING_DIMENSIONS: 1536;
    readonly DEFAULT_TOP_K: 5;
    readonly DEFAULT_MIN_SIMILARITY: 0.7;
    readonly CONVERSATION_IDLE_TIMEOUT: number;
    readonly MAX_FILE_SIZE: number;
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "text/plain", "text/markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
};
export declare const ERROR_CODES: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly INVALID_API_KEY: "INVALID_API_KEY";
    readonly TENANT_NOT_FOUND: "TENANT_NOT_FOUND";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly CHANNEL_NOT_CONFIGURED: "CHANNEL_NOT_CONFIGURED";
    readonly WEBHOOK_VERIFICATION_FAILED: "WEBHOOK_VERIFICATION_FAILED";
    readonly MESSAGE_SEND_FAILED: "MESSAGE_SEND_FAILED";
    readonly DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND";
    readonly EMBEDDING_FAILED: "EMBEDDING_FAILED";
    readonly RETRIEVAL_FAILED: "RETRIEVAL_FAILED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
};
export declare const DEFAULT_BOT_INSTRUCTIONS = "You are a helpful AI assistant for {brandName}.\nYour role is to answer customer questions based on the knowledge base provided.\nMaintain a {tone} tone in all interactions.\n\nGuidelines:\n- Always be respectful and helpful\n- If you don't know the answer, admit it and offer to connect them with a human agent\n- Keep responses concise and actionable\n- Use the provided functions when appropriate\n- Never make up information not in the knowledge base";
export declare const DEFAULT_HANDOFF_MESSAGE = "I understand you'd like to speak with a human agent. Let me connect you with someone who can help.";
export declare const DEFAULT_ERROR_MESSAGE = "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.";
//# sourceMappingURL=constants.d.ts.map