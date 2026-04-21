/**
 * L8 — Load Testing: Critical Path Performance
 *
 * Infrastructure needed: k6 CLI, staging environment.
 * Run: k6 run tests/load/critical-paths.k6.js
 *
 * Ramp: 0 -> 10 users (30s) -> 50 users (1m) -> 0 (30s cooldown)
 * Thresholds: p95 < 2s, error rate < 1%
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // TODO: Add auth token

  // Dashboard load
  const dashboard = http.get(`${BASE_URL}/`);
  check(dashboard, { 'dashboard 200': (r) => r.status === 200 });

  // Contacts list
  const contacts = http.get(`${BASE_URL}/api/contacts`);
  check(contacts, { 'contacts 200': (r) => r.status === 200 });

  // Listings list
  const listings = http.get(`${BASE_URL}/api/listings`);
  check(listings, { 'listings 200': (r) => r.status === 200 });

  sleep(1);
}
