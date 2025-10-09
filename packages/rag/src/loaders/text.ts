import { Readable } from 'stream';
import { StringDecoder } from 'string_decoder';
import { DocumentLoader, LoaderContext, LoaderResult } from './types';
import { countWords } from './utils';

export class TextLoader implements DocumentLoader {
  readonly name = 'text-loader';
  readonly mimeTypes = ['text/plain', 'text/markdown'];
  readonly extensions = ['.txt', '.md', '.markdown'];

  async load(stream: Readable, context: LoaderContext): Promise<LoaderResult> {
    const decoder = new StringDecoder('utf8');
    let text = '';

    for await (const chunk of stream) {
      text += decoder.write(chunk as Buffer);
    }
    text += decoder.end();

    const normalized = text.replace(/\r\n?/g, '\n');
    const paragraphs = normalized ? normalized.split(/\n{2,}/).length : 0;
    const metadata = {
      title: context.filename,
      paragraphs,
      words: countWords(normalized),
      encoding: 'utf-8',
    };

    return {
      text: normalized,
      metadata,
    };
  }
}

export const createTextLoader = (): DocumentLoader => new TextLoader();
