import { Readable } from 'stream';

export interface LoaderContext {
  filename: string;
  mimeType: string;
  size: number;
}

export interface LoaderMetadata {
  title?: string;
  author?: string;
  pages?: number;
  paragraphs?: number;
  words?: number;
  [key: string]: any;
}

export interface LoaderResult {
  text: string;
  metadata: LoaderMetadata;
}

export interface DocumentLoader {
  readonly name: string;
  readonly mimeTypes: string[];
  readonly extensions?: string[];
  load(stream: Readable, context: LoaderContext): Promise<LoaderResult>;
}

export type LoaderFactory = () => DocumentLoader;
