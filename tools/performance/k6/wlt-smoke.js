/**
 * tools/performance/k6/wlt-smoke.js
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — WLT API k6 Smoke Test
 *
 * Usage (requires runtime up):
 *   k6 run tools/performance/k6/wlt-smoke.js
 *   k6 run --env BASE_URL=http://localhost:58083 tools/performance/k6/wlt-smoke.js
 *
 * Thresholds sourced from tools/performance/performance-budgets.json api.wlt
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:58083";

const healthTrend  = new Trend("wlt_health_duration");
const readTrend    = new Trend("wlt_read_duration");
const errorRate    = new Rate("wlt_errors");

export const options = {
  vus: 3,
  duration: "30s",
  thresholds: {
    "wlt_health_duration": ["p(95)<300"],
    "wlt_read_duration":   ["p(95)<300"],
    "wlt_errors":          ["rate<0.01"],
    "http_req_duration":   ["p(95)<700"],
    "http_req_failed":     ["rate<0.01"],
  },
};

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/wlt/health`, {
    tags: { endpoint: "health" },
  });
  healthTrend.add(healthRes.timings.duration);
  check(healthRes, { "health 200": (r) => r.status === 200 }) || errorRate.add(1);

  sleep(0.5);

  // 2. Balance read (smoke — expects 401 without auth)
  const balanceRes = http.get(`${BASE_URL}/wlt/api/v1/wallet/balance`, {
    tags: { endpoint: "balance" },
    headers: { Accept: "application/json" },
  });
  readTrend.add(balanceRes.timings.duration);
  check(balanceRes, {
    "balance responds": (r) => r.status === 200 || r.status === 401 || r.status === 403,
  }) || errorRate.add(1);

  sleep(1);
}
