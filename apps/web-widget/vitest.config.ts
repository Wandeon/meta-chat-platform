import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { createPackageVitestConfig } from '../../vitest.base.config';

const packageConfig = createPackageVitestConfig({
  name: 'web-widget',
  rootDir: __dirname,
  include: ['src/__tests__/**/*.test.ts?(x)'],
});

export default mergeConfig(
  packageConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: [path.resolve(__dirname, '../../tests/setup/global-vitest.ts')],
    },
  }),
);
