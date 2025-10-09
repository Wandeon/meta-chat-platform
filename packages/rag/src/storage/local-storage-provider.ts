import { createHash } from 'crypto';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createLogger } from '@meta-chat/shared';
import { SaveOptions, SaveResult, StorageProvider } from './storage-provider';

export class LocalStorageProvider implements StorageProvider {
  public readonly name = 'local';
  private readonly logger = createLogger('LocalStorageProvider');

  constructor(private readonly rootPath: string = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage')) {}

  async save(options: SaveOptions): Promise<SaveResult> {
    const { tenantId, documentId, version, filename, buffer, stream } = options;
    const relativePath = path.join(tenantId, documentId, `v${version}`, filename);
    const absolutePath = this.resolve(relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    if (buffer) {
      await fs.writeFile(absolutePath, buffer);
    } else if (stream) {
      await pipeline(stream, createWriteStream(absolutePath));
    } else {
      throw new Error('Either buffer or stream must be provided to save a document');
    }

    const stats = await fs.stat(absolutePath);
    this.logger.info('Saved document to local storage', { relativePath, size: stats.size });

    return { path: relativePath, size: stats.size };
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async getChecksum(relativePath: string): Promise<string> {
    const absolutePath = this.resolve(relativePath);
    const hash = createHash('sha256');
    const file = await fs.open(absolutePath, 'r');

    try {
      const stream = file.createReadStream();
      await new Promise<void>((resolve, reject) => {
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });
      return hash.digest('hex');
    } finally {
      await file.close();
    }
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(relativePath));
  }

  async remove(relativePath: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(relativePath));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        this.logger.warn('Failed to remove file during cleanup', { relativePath, error: error?.message });
      }
    }
  }

  private resolve(relativePath: string): string {
    return path.join(this.rootPath, relativePath);
  }
}
