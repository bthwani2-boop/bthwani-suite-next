// dsh-route-declaration-gate: enforces that every DSH HTTP route actually
// registered in Go source is declared in the DSH OpenAPI contract, or is a
// reviewed exception in dsh-route-declaration-allowlist.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { composeContext } from "../scripts/openapi-context-composer.mjs";
import { extractGoRoutes } from "./lib/go-route-extractor.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardId = "dsh-route-declaration-gate";
const backendRouterEntry = "services/dsh/backend/internal/http/server.go";
const allowlistPath = path.join(repositoryRoot, "tools/guards/dsh-route-declaration-allowlist.json");

// Routes in this set are intentionally retired. They are allowed to remain in
// the historical allowlist until the large pre-existing allowlist is reduced,
// but this gate still fails if any retired route becomes registered again.
const retiredClosureRoutes = new Set([
  "PUT /dsh/operator/workforce/scopes/{actorId}",
]);

function fail(id, violations) {
  for (const violation of violations) console.error(`${id} FAIL: ${violation}`);
  if (violations.length > 0) {
    console.log(`${id}: FAIL (${violations.length})`);
    process.exit(1);
  }
  console.log(`${id}: PASS`);
}

function collectDeclaredPaths() {
  return composeContext("dsh", { write: false }).then(({ bundle }) => {
    const document = parse(bundle);
    const declared = new Set();
    for (const [routePath, methods] of Object.entries(document.paths ?? {})) {
      for (const method of Object.keys(methods)) {
        if (["get", "post", "put", "patch", "delete"].includes(method)) {
          declared.add(`${method.toUpperCase()} ${routePath}`);
        }
      }
    }
    return declared;
  });
}

function collectRegisteredRoutes() {
  return new Set(
    extractGoRoutes(backendRouterEntry).map((registration) => registration.route),
  );
}

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) return new Map();
  const parsed = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  const entries = new Map();
  for (const entry of parsed.entries ?? []) {
    if (!entry.route || !entry.reason) {
      throw new Error(`${allowlistPath}: every entry needs a route and a reason`);
    }
    entries.set(entry.route, entry.reason);
  }
  return entries;
}

const declared = await collectDeclaredPaths();
const registered = collectRegisteredRoutes();
const allowlist = loadAllowlist();

const undeclared = [...registered].filter((route) => !declared.has(route)).sort();
const newlyUndeclared = undeclared.filter((route) => !allowlist.has(route));
const staleAllowlistEntries = [...allowlist.keys()].filter(
  (route) =>
    (!registered.has(route) || declared.has(route)) && !retiredClosureRoutes.has(route),
);

console.log(`registered_routes: ${registered.size}`);
console.log(`declared_operations: ${declared.size}`);
console.log(`undeclared_routes: ${undeclared.length}`);
console.log(`allowlisted_undeclared_routes: ${undeclared.length - newlyUndeclared.length}`);

const violations = [];
for (const route of newlyUndeclared) {
  violations.push(
    `new route registered without a contract declaration and without an allowlist entry: ${route}`,
  );
}
for (const route of staleAllowlistEntries) {
  violations.push(
    `dsh-route-declaration-allowlist.json entry is stale (route no longer undeclared or no longer registered): ${route}`,
  );
}
for (const route of retiredClosureRoutes) {
  if (registered.has(route)) violations.push(`retired DSH route was re-registered: ${route}`);
}

fail(guardId, violations);
