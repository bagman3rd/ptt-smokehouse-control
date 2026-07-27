// Build 11.0.0 — k6 capacity-model load test (v3.0 §27.2, §64).
//
// Implements the Section 64 acceptance profiles for a Tier 1 SaaS platform
// sized to 100,000 registered users. Select a profile with PROFILE env var:
//
//   PROFILE=normal    — forecast ordinary peak, 30 min after warm-up
//   PROFILE=peak      — 1.2x forecast busiest sustained period
//   PROFILE=spike     — rapid rise to 2x forecast peak, then recovery
//   PROFILE=endurance — sustained load 8h (24h for connection/queue changes)
//   PROFILE=volume    — largest-tenant + full-platform data volume
//   PROFILE=smoke     — 1 min tiny run to validate the harness (default)
//
// Run:  k6 run -e PROFILE=peak -e BASE_URL=https://staging.example.com \
//              -e ADMIN_USER=admin -e ADMIN_PASSWORD=... load/k6-capacity-model.js
//
// Thresholds encode the v3.0 §27.1 service objectives: API p95 < 500ms and
// error rate < 1%. The capacity model below is the documented, adjustable
// derivation from "100,000 users" — NOT a raw account count.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---- Capacity model (Section 64.1) ---------------------------------------
// Registered users:            100,000
// Active mix (DAU):            12% => 12,000 daily active
// Peak-hour concentration:     20% of DAU in busiest hour => 2,400 users/hr
// Busiest 5-min window:        ~8% of peak hour => ~192 users in 5 min
// Concurrent sessions (peak):  ~250 authenticated sessions (dashboards + mobile)
// Read/write ratio:            ~80/20
// The "forecast peak" concurrency used below is 250 VUs.
const FORECAST_PEAK_VUS = Number(__ENV.FORECAST_PEAK_VUS || 250);

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const ADMIN_USER = __ENV.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'ci-admin-password';
const PROFILE = __ENV.PROFILE || 'smoke';

const apiLatency = new Trend('api_latency', true);
const errorRate = new Rate('errors');

// ---- Profile -> k6 stages -------------------------------------------------
function stagesFor(profile) {
  const peak = FORECAST_PEAK_VUS;
  switch (profile) {
    case 'normal':
      return { stages: [
        { duration: '2m', target: Math.round(peak * 0.6) },
        { duration: '30m', target: Math.round(peak * 0.6) },
        { duration: '1m', target: 0 }
      ] };
    case 'peak':
      return { stages: [
        { duration: '3m', target: Math.round(peak * 1.2) },
        { duration: '20m', target: Math.round(peak * 1.2) },
        { duration: '2m', target: 0 }
      ] };
    case 'spike':
      return { stages: [
        { duration: '1m', target: Math.round(peak * 0.5) },
        { duration: '30s', target: peak * 2 },   // rapid rise to 2x
        { duration: '3m', target: peak * 2 },    // hold the spike
        { duration: '2m', target: Math.round(peak * 0.5) }, // recover
        { duration: '1m', target: 0 }
      ] };
    case 'endurance':
      return { stages: [
        { duration: '5m', target: Math.round(peak * 0.7) },
        { duration: __ENV.ENDURANCE_DURATION || '8h', target: Math.round(peak * 0.7) },
        { duration: '5m', target: 0 }
      ] };
    case 'volume':
      // Fewer VUs but heavy read endpoints (reports over years of data).
      return { stages: [
        { duration: '2m', target: 40 },
        { duration: '15m', target: 40 },
        { duration: '1m', target: 0 }
      ] };
    case 'smoke':
    default:
      return { stages: [
        { duration: '15s', target: 5 },
        { duration: '45s', target: 5 },
        { duration: '10s', target: 0 }
      ] };
  }
}

const cfg = stagesFor(PROFILE);

export const options = {
  stages: cfg.stages,
  thresholds: {
    // v3.0 §27.1 service objectives.
    api_latency: ['p(95)<500'],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01']
  },
  tags: { profile: PROFILE }
};

function login() {
  const res = http.post(
    `${BASE_URL}/api/login`,
    { username: ADMIN_USER, password: ADMIN_PASSWORD },
    { redirects: 0 }
  );
  return res.cookies;
}

export default function () {
  const jar = http.cookieJar();
  const loginRes = http.post(
    `${BASE_URL}/api/login`,
    { username: ADMIN_USER, password: ADMIN_PASSWORD },
    { redirects: 0 }
  );
  apiLatency.add(loginRes.timings.duration);
  errorRate.add(loginRes.status >= 500);

  // Read-heavy journey (80%): dashboard, cook plan, reports.
  const readPaths =
    PROFILE === 'volume'
      ? ['/reports', '/reports?range=365', '/today']
      : ['/today', '/cook-plan', '/reports'];
  for (const p of readPaths) {
    const r = http.get(`${BASE_URL}${p}`);
    apiLatency.add(r.timings.duration);
    errorRate.add(r.status >= 500);
    check(r, { 'read ok': (x) => x.status === 200 || x.status === 302 });
  }

  // Write journey (20%): submit an invalid cook plan to exercise validation
  // without mutating production data.
  if (Math.random() < 0.2) {
    const w = http.post(`${BASE_URL}/api/cook-plan`, JSON.stringify({ serviceDate: 'nope' }), {
      headers: { 'Content-Type': 'application/json' }
    });
    apiLatency.add(w.timings.duration);
    errorRate.add(w.status >= 500);
    check(w, { 'validation rejects bad input': (x) => x.status === 400 || x.status === 401 });
  }

  sleep(Math.random() * 2 + 1);
}
