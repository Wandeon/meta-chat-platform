import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.base.config';

export default defineConfig({
  resolve: baseConfig.resolve,
  test: {
    include: ['packages/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts'],
  },
  projects: [
    { extends: './packages/shared/vitest.config.ts' },
    { extends: './packages/events/vitest.config.ts' },
    { extends: './packages/orchestrator/vitest.config.ts' },
    { extends: './packages/rag/vitest.config.ts' },
    { extends: './packages/llm/vitest.config.ts' },
    { extends: './packages/database/vitest.config.ts' },
    { extends: './apps/api/vitest.config.ts' },
  ],
});
