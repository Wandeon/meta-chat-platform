import { Readable } from 'stream';
import pdfParse from 'pdf-parse';
import { DocumentLoader, LoaderContext, LoaderResult } from './types';
import { countWords, streamToBuffer } from './utils';

export class PdfLoader implements DocumentLoader {
  readonly name = 'pdf-loader';
  readonly mimeTypes = ['application/pdf'];
  readonly extensions = ['.pdf'];

  async load(stream: Readable, context: LoaderContext): Promise<LoaderResult> {
    const buffer = await streamToBuffer(stream);
    const parsed = await pdfParse(buffer, { pagerender: this.stripNullCharacters });

    const metadata = {
      title: parsed.info?.Title ?? context.filename,
      author: parsed.info?.Author ?? parsed.metadata?.metadata?.author,
      pages: parsed.numpages,
      hasEmbeddedFiles: parsed.info?.EmbeddedFiles === true,
      words: countWords(parsed.text),
      revision: parsed.metadata?.metadata?.['pdf:PDFVersion'],
    };

    return {
      text: parsed.text,
      metadata,
    };
  }

  private stripNullCharacters(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x00/g, '');
  }
}

export const createPdfLoader = (): DocumentLoader => new PdfLoader();
