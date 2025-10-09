import { createPackageVitestConfig } from '../../vitest.base.config';

export default createPackageVitestConfig({
  name: '@meta-chat/shared-unit',
  rootDir: __dirname,
  include: ['src/**/*.test.ts'],
});
