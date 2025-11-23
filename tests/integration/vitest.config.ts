import path from 'path';
import { defineConfig } from 'vitest/config';
import baseConfig from '../../vitest.base.config';

const rootDir = path.resolve(__dirname, '../..');

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: baseConfig.resolve?.alias,
    preserveSymlinks: true,
  },
  ssr: baseConfig.ssr,
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    maxConcurrency: 1,
    minThreads: 1,
    maxThreads: 1,
    testTimeout: 180_000,
    hookTimeout: 180_000,
    teardownTimeout: 120_000,
    sequence: {
      concurrent: false,
    },
    setupFiles: [path.resolve(__dirname, 'setup/environment.ts')],
    coverage: {
      enabled: false,
    },
    deps: baseConfig.test?.deps,
  },
});
