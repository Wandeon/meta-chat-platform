import fs from 'fs';
import path from 'path';

const packages = [
  { name: '@meta-chat/shared', summary: 'packages/shared/coverage/coverage-summary.json' },
  { name: '@meta-chat/events', summary: 'packages/events/coverage/coverage-summary.json' },
  { name: '@meta-chat/orchestrator', summary: 'packages/orchestrator/coverage/coverage-summary.json' },
  { name: '@meta-chat/rag', summary: 'packages/rag/coverage/coverage-summary.json' },
  { name: '@meta-chat/llm', summary: 'packages/llm/coverage/coverage-summary.json' },
  { name: '@meta-chat/database', summary: 'packages/database/coverage/coverage-summary.json' },
  { name: '@meta-chat/api', summary: 'apps/api/coverage/coverage-summary.json' },
];

const reportDir = path.resolve('reports/qa');
fs.mkdirSync(reportDir, { recursive: true });

const summary = {
  generatedAt: new Date().toISOString(),
  coverage: {},
  artifacts: {
    loadTest: fs.existsSync(path.resolve('reports/perf/rest-results.json'))
      ? 'reports/perf/rest-results.json'
      : null,
  },
};

for (const pkg of packages) {
  const coveragePath = path.resolve(pkg.summary);
  if (fs.existsSync(coveragePath)) {
    try {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      summary.coverage[pkg.name] = {
        lines: coverage.total?.lines?.pct ?? null,
        statements: coverage.total?.statements?.pct ?? null,
        functions: coverage.total?.functions?.pct ?? null,
        branches: coverage.total?.branches?.pct ?? null,
      };
    } catch (error) {
      summary.coverage[pkg.name] = { error: `Failed to parse coverage summary: ${error.message}` };
    }
  }
}

const outputPath = path.join(reportDir, 'quality-summary.json');
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
console.log(`Quality summary written to ${outputPath}`);
