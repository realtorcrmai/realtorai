/**
 * k6 Load Test Template — Realtors360 API
 * REQ-PERF-001: API endpoints meet P99 < 2s under load
 *
 * Tests concurrent user load on key API endpoints:
 *   - GET /api/contacts (list with search + limit)
 *   - GET /api/listings (list with filters)
 *   - GET / (dashboard page)
 *   - POST /api/contacts (create — write path)
 *
 * Stages: ramp up -> sustain -> peak -> ramp down
 * Thresholds: P99 < 2s, error rate < 0.1%
 *
 * Stack: k6 (brew install k6)
 * Run: k6 run tests/templates/k6-load.template.js
 * Run with env: k6 run -e BASE_URL=http://localhost:3000 -e SESSION_COOKIE=xxx tests/templates/k6-load.template.js
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// === Custom Metrics ===
const errorRate = new Rate('error_rate');
const contactsLatency = new Trend('contacts_latency', true);
const listingsLatency = new Trend('listings_latency', true);
const dashboardLatency = new Trend('dashboard_latency', true);
const createContactLatency = new Trend('create_contact_latency', true);
const requestCount = new Counter('total_requests');

// === Load Profile ===
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up: 0 -> 10 VUs over 30s
    { duration: '1m', target: 25 },   // Sustain: hold 25 VUs for 1m
    { duration: '30s', target: 50 },   // Peak: ramp to 50 VUs
    { duration: '1m', target: 50 },   // Sustain peak for 1m
    { duration: '30s', target: 0 },   // Ramp down: 50 -> 0 VUs
  ],

  thresholds: {
    // Global thresholds
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],  // P95 < 2s, P99 < 3s
    http_req_failed: ['rate<0.01'],                    // < 1% HTTP errors
    error_rate: ['rate<0.001'],                         // < 0.1% app errors

    // Per-endpoint thresholds
    contacts_latency: ['p(95)<1500', 'p(99)<2000'],
    listings_latency: ['p(95)<1500', 'p(99)<2000'],
    dashboard_latency: ['p(95)<2000', 'p(99)<3000'],
    create_contact_latency: ['p(95)<2000', 'p(99)<3000'],
  },

  // Graceful stop
  gracefulStop: '10s',
  gracefulRampDown: '10s',
};

// === Configuration ===
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

const defaultHeaders = {
  'Content-Type': 'application/json',
  Cookie: `authjs.session-token=${SESSION_COOKIE}`,
};

const htmlHeaders = {
  Cookie: `authjs.session-token=${SESSION_COOKIE}`,
  Accept: 'text/html',
};

// === Main Test Function ===
export default function () {
  // --- Group 1: Dashboard (Page Load) ---
  group('REQ-PERF-001: Dashboard page load', () => {
    const res = http.get(`${BASE_URL}/`, { headers: htmlHeaders, tags: { name: 'dashboard' } });

    check(res, {
      'TC-PERF-001: dashboard returns 200': (r) => r.status === 200,
      'TC-PERF-002: dashboard loads < 3s': (r) => r.timings.duration < 3000,
    });

    dashboardLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    requestCount.add(1);
  });

  sleep(0.5);

  // --- Group 2: GET /api/contacts ---
  group('REQ-PERF-002: Contacts API', () => {
    // List contacts with limit
    const listRes = http.get(`${BASE_URL}/api/contacts?limit=20`, {
      headers: defaultHeaders,
      tags: { name: 'contacts_list' },
    });

    check(listRes, {
      'TC-PERF-010: contacts list returns 200': (r) => r.status === 200,
      'TC-PERF-011: contacts response is JSON array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
      'TC-PERF-012: contacts list < 2s': (r) => r.timings.duration < 2000,
    });

    contactsLatency.add(listRes.timings.duration);
    errorRate.add(listRes.status !== 200);
    requestCount.add(1);

    sleep(0.3);

    // Search contacts
    const searchRes = http.get(`${BASE_URL}/api/contacts?search=test&limit=10`, {
      headers: defaultHeaders,
      tags: { name: 'contacts_search' },
    });

    check(searchRes, {
      'TC-PERF-013: contacts search returns 200': (r) => r.status === 200,
      'TC-PERF-014: search response < 2s': (r) => r.timings.duration < 2000,
    });

    contactsLatency.add(searchRes.timings.duration);
    errorRate.add(searchRes.status !== 200);
    requestCount.add(1);
  });

  sleep(0.5);

  // --- Group 3: GET /api/listings ---
  group('REQ-PERF-003: Listings API', () => {
    const listRes = http.get(`${BASE_URL}/api/listings?limit=20`, {
      headers: defaultHeaders,
      tags: { name: 'listings_list' },
    });

    check(listRes, {
      'TC-PERF-020: listings list returns 200': (r) => r.status === 200,
      'TC-PERF-021: listings response is JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      'TC-PERF-022: listings list < 2s': (r) => r.timings.duration < 2000,
    });

    listingsLatency.add(listRes.timings.duration);
    errorRate.add(listRes.status !== 200);
    requestCount.add(1);
  });

  sleep(0.5);

  // --- Group 4: GET /api/showings ---
  group('REQ-PERF-004: Showings API', () => {
    const res = http.get(`${BASE_URL}/api/showings`, {
      headers: defaultHeaders,
      tags: { name: 'showings_list' },
    });

    check(res, {
      'TC-PERF-030: showings returns 200': (r) => r.status === 200,
      'TC-PERF-031: showings response < 2s': (r) => r.timings.duration < 2000,
    });

    errorRate.add(res.status !== 200);
    requestCount.add(1);
  });

  sleep(0.5);

  // --- Group 5: POST /api/contacts (Write Path) ---
  // Only 10% of iterations create a contact (simulates realistic read/write ratio)
  if (Math.random() < 0.1) {
    group('REQ-PERF-005: Contact creation (write path)', () => {
      const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
      const payload = JSON.stringify({
        name: `LOADTEST_${uniqueId}`,
        email: `loadtest-${uniqueId}@example.com`,
        phone: `+1604555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        type: 'buyer',
        pref_channel: 'sms',
      });

      const res = http.post(`${BASE_URL}/api/contacts`, payload, {
        headers: defaultHeaders,
        tags: { name: 'contacts_create' },
      });

      check(res, {
        'TC-PERF-040: contact creation returns 200': (r) => r.status === 200,
        'TC-PERF-041: creation response has id': (r) => {
          try {
            return JSON.parse(r.body).id !== undefined;
          } catch {
            return false;
          }
        },
        'TC-PERF-042: creation < 3s': (r) => r.timings.duration < 3000,
      });

      createContactLatency.add(res.timings.duration);
      errorRate.add(res.status !== 200);
      requestCount.add(1);
    });
  }

  // --- Group 6: Concurrent Page Navigation (mixed workload) ---
  group('REQ-PERF-006: Page navigation', () => {
    const pages = ['/contacts', '/listings', '/showings', '/calendar'];
    const randomPage = pages[Math.floor(Math.random() * pages.length)];

    const res = http.get(`${BASE_URL}${randomPage}`, {
      headers: htmlHeaders,
      tags: { name: `page_${randomPage.replace('/', '')}` },
    });

    check(res, {
      'TC-PERF-050: page returns 200': (r) => r.status === 200,
    });

    errorRate.add(res.status !== 200);
    requestCount.add(1);
  });

  sleep(1);
}

// === Setup: Verify Server is Reachable ===
export function setup() {
  const res = http.get(`${BASE_URL}/api/contacts?limit=1`, {
    headers: defaultHeaders,
  });

  if (res.status !== 200) {
    console.error(`Setup check failed: ${BASE_URL} returned ${res.status}`);
    console.error('Ensure the server is running and SESSION_COOKIE is valid.');
    console.error('Usage: k6 run -e SESSION_COOKIE=<cookie> tests/templates/k6-load.template.js');
    fail('Server not reachable or authentication failed');
  }

  console.log(`Server reachable at ${BASE_URL}, status: ${res.status}`);
  return { baseUrl: BASE_URL };
}

// === Teardown: Cleanup Load Test Data ===
export function teardown(data) {
  // Cleanup LOADTEST_ contacts created during the test
  // This requires a cleanup endpoint or manual DB cleanup
  console.log('Load test complete. Clean up LOADTEST_ contacts from DB:');
  console.log("  DELETE FROM contacts WHERE name LIKE 'LOADTEST_%';");
}

// === Summary Handler ===
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryFile = `docs/load-reports/load-test-${timestamp}.json`;

  // Console summary
  const metrics = data.metrics;
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    duration: data.state?.testRunDurationMs || 0,
    vus_max: metrics.vus_max?.values?.max || 0,
    total_requests: metrics.total_requests?.values?.count || 0,
    results: {
      http_req_duration_p95: metrics.http_req_duration?.values?.['p(95)'] || 0,
      http_req_duration_p99: metrics.http_req_duration?.values?.['p(99)'] || 0,
      error_rate: metrics.error_rate?.values?.rate || 0,
      contacts_p95: metrics.contacts_latency?.values?.['p(95)'] || 0,
      listings_p95: metrics.listings_latency?.values?.['p(95)'] || 0,
      dashboard_p95: metrics.dashboard_latency?.values?.['p(95)'] || 0,
    },
    thresholds_passed: Object.entries(data.thresholds || {}).every(
      ([, v]) => !v.ok === false,
    ),
  };

  console.log('\n=== Load Test Summary ===');
  console.log(`Total requests: ${summary.total_requests}`);
  console.log(`Max VUs: ${summary.vus_max}`);
  console.log(`P95 latency: ${summary.results.http_req_duration_p95.toFixed(0)}ms`);
  console.log(`P99 latency: ${summary.results.http_req_duration_p99.toFixed(0)}ms`);
  console.log(`Error rate: ${(summary.results.error_rate * 100).toFixed(3)}%`);
  console.log(`Thresholds passed: ${summary.thresholds_passed}`);

  return {
    stdout: JSON.stringify(summary, null, 2),
    [summaryFile]: JSON.stringify(data, null, 2),
  };
}

/*
 * Usage:
 *
 * 1. Start the dev server: npm run dev
 * 2. Get a session cookie:
 *    - Log in to http://localhost:3000 in browser
 *    - Copy authjs.session-token cookie value
 * 3. Run the test:
 *    k6 run -e SESSION_COOKIE=<cookie> tests/templates/k6-load.template.js
 *
 * Profiles:
 *   - Smoke:  k6 run --vus 1 --duration 30s ...
 *   - Load:   (default stages above)
 *   - Stress: k6 run --stage '1m:100,2m:100,30s:0' ...
 *   - Spike:  k6 run --stage '10s:1,10s:100,10s:1' ...
 *
 * Cleanup after test:
 *   DELETE FROM contacts WHERE name LIKE 'LOADTEST_%';
 */
