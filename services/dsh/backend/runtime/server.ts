import { createServer } from "node:http";
import { Pool, types as pgTypes } from "pg";

// pg returns NUMERIC (OID 1700) as string by default; parse to float
pgTypes.setTypeParser(1700, parseFloat);
import { handleHealth } from "./health.js";
import { handleReadiness } from "./readiness.js";
import { registerStoreDiscoveryRoutes } from "../store-discovery/store-discovery.routes.js";
import { sendJson } from "./http-helpers.js";

const PORT = parseInt(process.env["PORT"] ?? "8080", 10);
const DATABASE_URL = process.env["DATABASE_URL"];
const DSH_AUTH_MODE = process.env["DSH_AUTH_MODE"];

// CORS for control-panel (http://localhost:13000) in local/dev mode only.
// No wildcard — explicit origin only.
const LOCAL_CORS_ORIGIN =
  DSH_AUTH_MODE ? "http://localhost:13000" : null;

if (!DATABASE_URL) {
  console.error("[dsh-api] DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[dsh-api] pool error:", err.message);
});

const storeDiscoveryRouter = registerStoreDiscoveryRoutes(pool);

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const pathname = url.split("?")[0] ?? "/";

  res.setHeader("X-Service", "dsh");

  // CORS: only set header if the request Origin matches the allowed local origin.
  const requestOrigin = req.headers["origin"];
  if (LOCAL_CORS_ORIGIN && requestOrigin === LOCAL_CORS_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", LOCAL_CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Vary", "Origin");
  }

  // OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === "/dsh/health" && req.method === "GET") {
    handleHealth(res);
    return;
  }

  if (pathname === "/dsh/readiness" && req.method === "GET") {
    void handleReadiness(res, pool);
    return;
  }

  if (storeDiscoveryRouter(req, res, pathname)) {
    return;
  }

  sendJson(res, 404, { code: "NOT_FOUND", message: "Route not found" });
});

server.setTimeout(15000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[dsh-api] listening on port ${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
});
