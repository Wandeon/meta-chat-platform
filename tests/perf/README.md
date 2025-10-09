# Performance & Load Testing

The `tests/perf` directory contains reusable [Artillery](https://www.artillery.io/) scenarios for validating the stability of the Meta Chat Platform under load.

## Running the suite

1. Start the API service with dependencies (Postgres, RabbitMQ) locally or inside CI.
2. Export credentials required by the scenarios:

```bash
export API_BASE_URL="http://localhost:3000"
export PERF_TENANT_ID="tenant-perf"
export PERF_ADMIN_KEY="<admin-api-key>"
```

3. Execute the load test:

```bash
npm run test:perf
```

Artifacts are written to `reports/perf/rest-results.json` and can be visualised with [`artillery report`](https://www.artillery.io/docs/guides/guides/reporting).

## Success criteria

Releases are gated on the following criteria derived from `tests/perf/rest-load.yml`:

- **Availability:** ≥ 99% of responses succeed with HTTP 2xx/3xx status codes.
- **Latency:** `p95` latency below **500 ms** and `p99` latency below **750 ms** across the 3-minute run.
- **Consistency:** No more than 1% request retries or socket errors during the sustained load phase.

If any metric breaches these thresholds the pipeline must block the deployment and issues should be recorded in the security & QA checklist.
