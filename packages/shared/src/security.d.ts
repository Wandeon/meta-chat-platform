export interface HashSecretOptions {
    /**
     * Length of the derived key in bytes. Defaults to 64 which yields a 128
     * character hex string.
     */
    keyLength?: number;
    /**
     * Number of iterations for the scrypt algorithm. Defaults to 16384 which is
     * a good baseline for server-side hashing.
     */
    cost?: number;
    /**
     * Block size parameter for scrypt. Defaults to 8.
     */
    blockSize?: number;
    /**
     * Parallelization parameter for scrypt. Defaults to 1.
     */
    parallelization?: number;
}
export interface HashedSecretResult {
    hash: string;
    salt: string;
}
export declare function hashSecret(secret: string, salt?: string, options?: HashSecretOptions): Promise<HashedSecretResult>;
export declare function verifySecret(candidate: string, expectedHash: string, salt: string, options?: HashSecretOptions): Promise<boolean>;
export interface ApiKeyMetadata {
    apiKey: string;
    prefix: string;
    lastFour: string;
}
export declare function generateApiKey(prefixLabel?: string, randomBytesLength?: number, prefixLength?: number): ApiKeyMetadata;
export declare function deriveApiKeyMetadata(apiKey: string, prefixLength?: number): ApiKeyMetadata;
export interface RotationTokenMetadata {
    token: string;
    hash: string;
    salt: string;
    expiresAt: Date;
}
export declare function generateRotationToken(validityMinutes?: number, entropyBytes?: number): Promise<RotationTokenMetadata>;
export declare const securityConstants: {
    DEFAULT_PREFIX_LENGTH: number;
    DEFAULT_API_KEY_BYTES: number;
    DEFAULT_ROTATION_TOKEN_BYTES: number;
};
//# sourceMappingURL=security.d.ts.map