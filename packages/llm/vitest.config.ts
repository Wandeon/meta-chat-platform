import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/providers/__tests__/**/*.test.ts'],
    coverage: {
      enabled: false,
    },
  },
});
