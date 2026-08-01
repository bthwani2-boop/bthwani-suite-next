// dsh-route-declaration-gate: enforces that every DSH HTTP route actually
// registered in Go source is declared in the DSH OpenAPI contract, or is a
// reviewed exception in dsh-route-declaration-allowlist.json.
//
// Root cause this closes: dsh-openapi-modular-gate.mjs (and
// contracts-foundation.mjs) only ever enforced declared ⊆ implemented --
// nothing enforced the opposite direction, so live routes could exist with
// no contract, no generated client, and no client-side type safety. This
// gate makes that direction fail-closed: any NEW undeclared route fails the
// build; only routes already reviewed and recorded in the allowlist (with a
// reason) are tolerated, and only until they are declared.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeContext } from "../scripts/openapi-context-composer.mjs";
import { parse } from "yaml";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardId = "dsh-route-declaration-gate";
const backendRoot = path.join(repositoryRoot, "services/dsh/backend/internal");
const allowlistPath = path.join(repositoryRoot, "tools/guards/dsh-route-declaration-allowlist.json");

function fail(id, violations) {
  for (const violation of violations) console.error(`${id} FAIL: ${violation}`);
  if (violations.length > 0) {
    console.log(`${id}: FAIL (${violations.length})`);
    process.exit(1);
  }
  console.log(`${id}: PASS`);
}

function listGoFiles(directory) {
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...listGoFiles(fullPath));
    } else if (entry.name.endsWith(".go") && !entry.name.endsWith("_test.go")) {
      results.push(fullPath);
    }
  }
  return results;
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
  const registered = new Set();
  const pattern = /(?:mux|router)\.HandleFunc\("([A-Z]+) ([^"]+)"/g;
  for (const filePath of listGoFiles(backendRoot)) {
    const content = fs.readFileSync(filePath, "utf8");
    let match;
    while ((match = pattern.exec(content)) !== null) {
      registered.add(`${match[1]} ${match[2]}`);
    }
  }
  return registered;
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
  (route) => !registered.has(route) || declared.has(route),
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

fail(guardId, violations);
