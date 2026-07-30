/**
 * tools/performance/k6/identity-smoke.js
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — Identity API k6 Smoke Test
 *
 * Usage (requires runtime up):
 *   k6 run tools/performance/k6/identity-smoke.js
 *   k6 run --env BASE_URL=http://localhost:58000 tools/performance/k6/identity-smoke.js
 *
 * Thresholds sourced from tools/performance/performance-budgets.json api.identity
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:58000";

const healthTrend = new Trend("identity_health_duration");
const errorRate   = new Rate("identity_errors");

export const options = {
  vus: 3,
  duration: "20s",
  thresholds: {
    "identity_health_duration": ["p(95)<100"],
    "identity_errors":          ["rate<0.01"],
    "http_req_duration":        ["p(95)<300"],
    "http_req_failed":          ["rate<0.01"],
  },
};

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: "health" },
  });
  healthTrend.add(healthRes.timings.duration);
  check(healthRes, { "health 200": (r) => r.status === 200 }) || errorRate.add(1);

  sleep(1);

  // 2. JWKS endpoint (public — always reachable without auth)
  const jwksRes = http.get(`${BASE_URL}/.well-known/jwks.json`, {
    tags: { endpoint: "jwks" },
  });
  check(jwksRes, {
    "jwks responds": (r) => r.status === 200 || r.status === 404,
  }) || errorRate.add(1);

  sleep(1);
}
