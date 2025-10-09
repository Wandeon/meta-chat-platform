import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    root: __dirname,
    resolve: {
      alias: baseConfig.resolve?.alias,
    },
    test: {
      name: 'integration',
      include: ['**/*.integration.test.ts'],
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
    },
  }),
);
