# Performance Test Status

## Overview
- The repository includes an Artillery-based load-testing suite under `tests/perf` with setup instructions and success criteria for running `npm run test:perf` against the API service.
- The primary scenario `tests/perf/rest-load.yml` warms at 5 virtual users/second for 60 seconds before ramping from 15 to 30 virtual users/second over 120 seconds, validating `/health` and tenant API key lifecycle flows with p95 ≤ 500 ms and p99 ≤ 750 ms latency thresholds.
- Artillery run artifacts are expected at `reports/perf/rest-results.json`, but no sample performance results are currently checked in.

## Outstanding Items
- Collect and publish recent Artillery results to establish current API throughput.
- Expand coverage beyond health checks and tenant API keys to capture application endpoints that represent real user journeys.
- Monitor runs for error spikes or latency regressions to surface potential bottlenecks.
