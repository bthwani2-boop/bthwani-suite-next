#!/usr/bin/env node
/**
 * Tiny HTTP server that returns configurable DSH API responses.
 * Usage: node fake-dsh-server.mjs <mode> [port]
 *
 * mode:
 *   empty        → 200 {stores:[], pagination:{total:0,limit:20,offset:0}}
 *   error        → 500 {code:"INTERNAL_SERVER_ERROR", message:"test error"}
 *   role-empty   → 404 (triggers role surface "empty" state)
 *   role-error   → 500 (triggers role surface "error" state)
 *   role-403     → 403 (triggers role surface "permission_denied" state)
 *   role-success → 200 DshStoreContextResponse (triggers role surface "success" state)
 *                  Requires: role=[partner|field|captain|operator] query param or --role flag
 */

import { createServer } from "node:http";

const mode = process.argv[2] ?? "error";
const port = parseInt(process.argv[3] ?? "19090", 10);
const defaultRole = process.argv[4] ?? "partner";

const DEV_STORE = {
  id: "store-1005",
  slug: "store-1005",
  displayName: "مطعم الريم",
  status: "active",
  cityCode: "YM-SNO",
  serviceAreaCode: "YM-SNO-01",
  serviceability: { status: "serviceable" },
  ratingAverage: 4.5,
  ratingCount: 120,
  deliveryEtaMin: 25,
  deliveryEtaMax: 40,
  isVisible: true,
  heroImageUrl: null,
  logoUrl: null,
  category: "restaurant",
  categoryLabel: "مطعم",
  deliveryModes: ["delivery", "pickup"],
  isFreeDelivery: false,
  distanceKm: null,
  followerCount: 45,
  hasProBadge: true,
  hasCouponBadge: false,
  pointsMultiplier: null,
  isPopular: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-06-01T00:00:00Z",
  version: 3,
};

const SCOPE_BY_ROLE = { partner: "own", field: "assigned", captain: "assigned", operator: "all" };

const handlers = {
  "empty": () => ({ status: 200, body: { stores: [], pagination: { total: 0, limit: 20, offset: 0 } } }),
  "error": () => ({ status: 500, body: { code: "INTERNAL_SERVER_ERROR", message: "test error" } }),
  "role-empty": () => ({ status: 404, body: { code: "NOT_FOUND", message: "no store context for actor" } }),
  "role-error": () => ({ status: 500, body: { code: "INTERNAL_SERVER_ERROR", message: "store service error" } }),
  "role-403": () => ({ status: 403, body: { code: "FORBIDDEN", message: "access denied" } }),
  "role-success": (role) => ({
    status: 200,
    body: {
      actorRole: role,
      scope: SCOPE_BY_ROLE[role] ?? "own",
      store: DEV_STORE,
      latestAction: null,
    },
  }),
};

const handler = handlers[mode];
if (!handler) {
  console.error(`Unknown mode: ${mode}. Use: empty | error | role-empty | role-error | role-403 | role-success`);
  process.exit(1);
}

const server = createServer((req, res) => {
  // Detect role from URL query or fall back to defaultRole
  const url = new URL(req.url ?? "/", "http://localhost");
  const role = url.searchParams.get("_devRole") ?? defaultRole;

  const { status, body } = handler(role);
  console.log(`[fake-dsh] ${req.method} ${req.url} → ${status} (mode=${mode}, role=${role})`);

  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  });

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.end(JSON.stringify(body));
});

server.listen(port, () => {
  console.log(`[fake-dsh] mode=${mode} role=${defaultRole} listening on http://localhost:${port}`);
  console.log(`[fake-dsh] Ctrl+C to stop`);
});
