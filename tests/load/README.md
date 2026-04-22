# L8 Load Tests

> **Status:** Scaffolded. Requires k6 installation and staging environment.

## Purpose

Verify Realtors360 handles concurrent users on critical paths:
- 50 concurrent realtors loading dashboards
- 10 concurrent listing detail views
- 5 concurrent contact creates
- Showing request under load

## SLO Targets

| Endpoint | Concurrent Users | P99 Latency | Error Rate |
|----------|-----------------|-------------|------------|
| GET / (dashboard) | 50 | < 2s | < 0.1% |
| GET /api/contacts | 50 | < 1s | < 0.1% |
| GET /api/listings | 50 | < 1s | < 0.1% |
| POST /api/contacts (create) | 10 | < 3s | < 0.5% |
| GET /contacts/:id | 25 | < 2s | < 0.1% |

## When to implement

Phase 5 of the testing rollout (Week 6). Requires:
1. `k6` installed (`brew install k6` or CI binary)
2. Staging environment (or dev environment with load limits)
3. Monitoring to observe impact

## Test pattern (k6)

```javascript
// tests/load/dashboard.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m', target: 50 },     // Sustained
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/');
  check(res, {
    'status 200': (r) => r.status === 200,
    'duration < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
```

## Run

```bash
k6 run tests/load/dashboard.k6.js
```
