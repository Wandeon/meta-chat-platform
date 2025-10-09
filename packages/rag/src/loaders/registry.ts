import { Readable } from 'stream';
import { DocumentLoader, LoaderContext, LoaderResult } from './types';

export class LoaderRegistry {
  private readonly loaders: DocumentLoader[] = [];

  constructor(initialLoaders: DocumentLoader[] = []) {
    initialLoaders.forEach((loader) => this.register(loader));
  }

  register(loader: DocumentLoader): void {
    this.loaders.push(loader);
  }

  resolve(mimeType: string, filename: string): DocumentLoader {
    const candidate = this.loaders.find((loader) => loader.mimeTypes.includes(mimeType));
    if (candidate) {
      return candidate;
    }

    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const byExtension = this.loaders.find((loader) => loader.extensions?.includes(extension));
    if (!byExtension) {
      throw new Error(`No document loader registered for ${mimeType} (${extension})`);
    }
    return byExtension;
  }

  async load(
    stream: Readable,
    context: LoaderContext
  ): Promise<LoaderResult & { loader: DocumentLoader }> {
    const loader = this.resolve(context.mimeType, context.filename);
    const result = await loader.load(stream, context);
    return { ...result, loader };
  }
}
