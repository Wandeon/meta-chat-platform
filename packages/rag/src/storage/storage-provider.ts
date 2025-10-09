import { Readable } from 'stream';

export interface SaveOptions {
  tenantId: string;
  documentId: string;
  version: number;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  buffer?: Buffer;
  stream?: Readable;
}

export interface SaveResult {
  path: string;
  size: number;
}

export interface StorageProvider {
  readonly name: string;

  save(options: SaveOptions): Promise<SaveResult>;
  exists(path: string): Promise<boolean>;
  getChecksum(path: string): Promise<string>;
  read(path: string): Promise<Buffer>;
  remove(path: string): Promise<void>;
}
