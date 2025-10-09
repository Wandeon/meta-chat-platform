import path from 'path';
import { defineConfig } from 'vitest/config';
import type { AliasOptions } from 'vite';

const rootDir = __dirname;

const alias: AliasOptions = [
  {
    find: '@meta-chat/shared',
    replacement: path.resolve(rootDir, 'packages/shared/src'),
  },
  {
    find: '@meta-chat/events',
    replacement: path.resolve(rootDir, 'packages/events/src'),
  },
  {
    find: '@meta-chat/orchestrator',
    replacement: path.resolve(rootDir, 'packages/orchestrator/src'),
  },
  {
    find: '@meta-chat/database',
    replacement: path.resolve(rootDir, 'packages/database/src'),
  },
  {
    find: '@meta-chat/rag',
    replacement: path.resolve(rootDir, 'packages/rag/src'),
  },
  {
    find: '@meta-chat/llm',
    replacement: path.resolve(rootDir, 'packages/llm/src'),
  },
];

function withAdditionalAlias(additionalAlias?: Record<string, string>): AliasOptions {
  if (!additionalAlias || Object.keys(additionalAlias).length === 0) {
    return [...alias];
  }

  return [
    ...alias,
    ...Object.entries(additionalAlias).map(([find, replacement]) => ({
      find,
      replacement,
    })),
  ];
}

export const baseVitestConfig = defineConfig({
  resolve: {
    alias,
    preserveSymlinks: true,
  },
  ssr: {
    noExternal: [
      '@meta-chat/shared',
      '@meta-chat/events',
      '@meta-chat/orchestrator',
      '@meta-chat/database',
      '@meta-chat/rag',
      '@meta-chat/llm',
      '@prisma/client',
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(rootDir, 'tests/setup/global-vitest.ts')],
    include: ['**/__tests__/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      'tests/integration/**',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
    ],
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: path.resolve(rootDir, 'reports/junit.xml'),
            },
          ],
        ]
      : 'default',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: path.resolve(rootDir, 'coverage'),
      thresholds: {
        statements: 0.8,
        branches: 0.75,
        lines: 0.8,
        functions: 0.8,
      },
    },
    deps: {
      inline: [
        '@meta-chat/shared',
        '@meta-chat/events',
        '@meta-chat/orchestrator',
        '@meta-chat/database',
        '@meta-chat/rag',
        '@meta-chat/llm',
        '@prisma/client',
        'testcontainers',
        '@testcontainers/postgresql',
        '@testcontainers/rabbitmq',
      ],
    },
  },
});

export function createPackageVitestConfig(options: {
  name: string;
  rootDir: string;
  include?: string[];
  exclude?: string[];
  additionalAlias?: Record<string, string>;
}) {
  return defineConfig({
    root: options.rootDir,
    resolve: {
      alias: withAdditionalAlias(options.additionalAlias),
      preserveSymlinks: true,
    },
    test: {
      name: options.name,
      include: options.include,
      exclude: [
        ...(options.exclude ?? []),
        '**/tests/integration/**',
        '**/*.integration.test.*',
        '**/*.e2e.test.*',
      ],
      reporters: baseVitestConfig.test?.reporters,
      environment: baseVitestConfig.test?.environment,
      globals: baseVitestConfig.test?.globals,
      setupFiles: [path.resolve(options.rootDir, '../../tests/setup/global-vitest.ts')],
      coverage: {
        ...baseVitestConfig.test?.coverage,
        reportsDirectory: path.resolve(options.rootDir, 'coverage'),
      },
    },
  });
}

export default baseVitestConfig;
