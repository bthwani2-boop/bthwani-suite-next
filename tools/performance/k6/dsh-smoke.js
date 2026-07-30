/**
 * tools/performance/k6/dsh-smoke.js
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — DSH API k6 Smoke Test
 *
 * Usage (requires runtime up):
 *   k6 run tools/performance/k6/dsh-smoke.js
 *   k6 run --env BASE_URL=http://localhost:58080 tools/performance/k6/dsh-smoke.js
 *
 * Thresholds sourced from tools/performance/performance-budgets.json
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:58080";

// ── Custom metrics ────────────────────────────────────────────────────────────
const healthTrend    = new Trend("dsh_health_duration");
const catalogTrend   = new Trend("dsh_catalog_duration");
const errorRate      = new Rate("dsh_errors");

// ── Options (from performance-budgets.json api.dsh) ──────────────────────────
export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    // Health / readiness
    "dsh_health_duration":  ["p(95)<150"],
    // Catalog
    "dsh_catalog_duration": ["p(95)<350"],
    // Error rate < 1%
    "dsh_errors":           ["rate<0.01"],
    // Overall HTTP duration
    "http_req_duration":    ["p(95)<700"],
    "http_req_failed":      ["rate<0.01"],
  },
};

// ── Scenario ──────────────────────────────────────────────────────────────────
export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/dsh/health`, {
    tags: { endpoint: "health" },
  });
  healthTrend.add(healthRes.timings.duration);
  check(healthRes, { "health 200": (r) => r.status === 200 }) || errorRate.add(1);

  sleep(0.5);

  // 2. Catalog list (unauthenticated stub check)
  const catalogRes = http.get(`${BASE_URL}/dsh/api/v1/catalog/stores`, {
    tags: { endpoint: "catalog" },
    headers: { Accept: "application/json" },
  });
  catalogTrend.add(catalogRes.timings.duration);
  // 200 or 401 (no auth) — both acceptable for smoke
  check(catalogRes, {
    "catalog responds": (r) => r.status === 200 || r.status === 401 || r.status === 403,
  }) || errorRate.add(1);

  sleep(1);
}
