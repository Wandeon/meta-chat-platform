import { Readable } from 'stream';
import mammoth from 'mammoth';
import { DocumentLoader, LoaderContext, LoaderResult } from './types';
import { countWords, streamToBuffer } from './utils';

export class DocxLoader implements DocumentLoader {
  readonly name = 'docx-loader';
  readonly mimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  readonly extensions = ['.docx'];

  async load(stream: Readable, context: LoaderContext): Promise<LoaderResult> {
    const buffer = await streamToBuffer(stream);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const { value, messages } = await mammoth.extractRawText({ arrayBuffer });

    const text = value.trim();
    const paragraphs = text ? text.split(/\n{2,}/).length : 0;
    const metadata = {
      title: context.filename,
      notes: normalizeMessages(messages),
      paragraphs,
      words: countWords(text),
    };

    return {
      text,
      metadata,
    };
  }
}

export const createDocxLoader = (): DocumentLoader => new DocxLoader();

function normalizeMessages(messages?: Array<{ type: string; message?: string }>): string[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  return messages.map((message) => `${message.type}: ${message.message ?? ''}`.trim());
}
