import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

type BufferLike = string | Buffer | Uint8Array;

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM

export interface SecretEnvelope {
  keyId: string;
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface ChannelSecretRecord extends SecretEnvelope {
  channelId: string;
}

export interface TenantSecretRecord extends SecretEnvelope {
  tenantId: string;
  name: string;
}

export interface SecretRepository {
  upsertChannelSecret(channelId: string, payload: SecretEnvelope): Promise<void>;
  findChannelSecret(channelId: string): Promise<ChannelSecretRecord | null>;
  upsertTenantSecret(tenantId: string, name: string, payload: SecretEnvelope): Promise<void>;
  findTenantSecret(tenantId: string, name: string): Promise<TenantSecretRecord | null>;
}

export type KeyResolver = (keyId: string) => Promise<Buffer> | Buffer;

export interface ActiveKey {
  id: string;
  material: Buffer;
}

function loadKeyMaterial(): ActiveKey {
  const keyId = process.env.SECRET_KEY_ID;
  const keyMaterial = process.env.SECRET_ENCRYPTION_KEY;

  if (!keyId) {
    throw new Error('SECRET_KEY_ID must be configured for secret encryption.');
  }

  if (!keyMaterial) {
    throw new Error('SECRET_ENCRYPTION_KEY must be configured for secret encryption.');
  }

  const buffer = Buffer.from(keyMaterial, 'base64');
  if (buffer.length !== 32) {
    throw new Error('SECRET_ENCRYPTION_KEY must be a base64 encoded 32 byte key.');
  }

  return { id: keyId, material: buffer };
}

let cachedActiveKey: ActiveKey | null = null;

function getDefaultActiveKey(): ActiveKey {
  if (!cachedActiveKey) {
    cachedActiveKey = loadKeyMaterial();
  }

  return cachedActiveKey;
}

const defaultKeyResolver: KeyResolver = (keyId: string) => {
  const activeKey = getDefaultActiveKey();
  if (keyId !== activeKey.id) {
    throw new Error(`Unknown encryption key id: ${keyId}`);
  }

  return activeKey.material;
};

function normalizeBuffer(value: BufferLike): Buffer {
  if (typeof value === 'string') {
    return Buffer.from(value, 'utf8');
  }

  if (Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }

  return Buffer.from(value);
}

export function scrubBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

export function encryptSecret(plaintext: BufferLike, activeKey: ActiveKey = getDefaultActiveKey()): SecretEnvelope {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(AES_ALGORITHM, activeKey.material, iv);

  const plainBuffer = normalizeBuffer(plaintext);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  scrubBuffer(plainBuffer);

  return {
    keyId: activeKey.id,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export async function decryptSecret(
  envelope: SecretEnvelope,
  keyResolver: KeyResolver = defaultKeyResolver,
): Promise<Buffer> {
  const key = await keyResolver(envelope.keyId);
  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.authTag, 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  scrubBuffer(ciphertext);
  return decrypted;
}

export class SecretService {
  constructor(
    private readonly repository: SecretRepository,
    private readonly keyResolver: KeyResolver = defaultKeyResolver,
    private readonly activeKey: ActiveKey = getDefaultActiveKey(),
  ) {}

  async saveChannelSecret(channelId: string, value: BufferLike): Promise<void> {
    const envelope = encryptSecret(value, this.activeKey);
    await this.repository.upsertChannelSecret(channelId, envelope);
  }

  async withChannelSecret<T>(
    channelId: string,
    consumer: (secretValue: string) => Promise<T> | T,
  ): Promise<T | null> {
    const record = await this.repository.findChannelSecret(channelId);
    if (!record) {
      return null;
    }

    const decrypted = await decryptSecret(record, this.keyResolver);
    try {
      return await consumer(decrypted.toString('utf8'));
    } finally {
      scrubBuffer(decrypted);
    }
  }

  async saveTenantSecret(tenantId: string, name: string, value: BufferLike): Promise<void> {
    const envelope = encryptSecret(value, this.activeKey);
    await this.repository.upsertTenantSecret(tenantId, name, envelope);
  }

  async withTenantSecret<T>(
    tenantId: string,
    name: string,
    consumer: (secretValue: string) => Promise<T> | T,
  ): Promise<T | null> {
    const record = await this.repository.findTenantSecret(tenantId, name);
    if (!record) {
      return null;
    }

    const decrypted = await decryptSecret(record, this.keyResolver);
    try {
      return await consumer(decrypted.toString('utf8'));
    } finally {
      scrubBuffer(decrypted);
    }
  }
}
