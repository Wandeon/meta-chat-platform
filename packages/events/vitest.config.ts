import path from 'path';
import { createPackageVitestConfig } from '../../vitest.base.config';

export default createPackageVitestConfig({
  name: '@meta-chat/events-unit',
  rootDir: __dirname,
  include: ['src/**/*.test.ts'],
  additionalAlias: {
    '@test-utils/amqp-mock': path.resolve(__dirname, 'tests/amqp-mock.ts'),
  },
});
