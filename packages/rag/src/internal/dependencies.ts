import type { Logger } from '@meta-chat/shared';
import type { PrismaClient } from '@meta-chat/database';

let sharedModule: { createLogger: (name: string) => Logger } | null = null;
let databaseModule: {
  PrismaClient: new (...args: any[]) => PrismaClient;
  keywordSearch: typeof import('@meta-chat/database').keywordSearch;
  vectorSearch: typeof import('@meta-chat/database').vectorSearch;
} | null = null;

export function getSharedModule(): { createLogger: (name: string) => Logger } {
  if (!sharedModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      sharedModule = require('@meta-chat/shared');
    } catch {
      sharedModule = {
        createLogger: () => ({
          info: () => {},
          warn: () => {},
          error: () => {},
        }),
      };
    }
  }
  return sharedModule!;
}

export function getDatabaseModule() {
  if (!databaseModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      databaseModule = require('@meta-chat/database');
    } catch {
      databaseModule = null;
    }
  }
  return databaseModule;
}
