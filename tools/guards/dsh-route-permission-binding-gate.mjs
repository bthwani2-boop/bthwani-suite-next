// dsh-route-permission-binding-gate: fails the build when a DSH HTTP route is
// registered without a reachable authentication/authorization check.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractGoRoutes } from "./lib/go-route-extractor.mjs";
import {
  findMatchingDelimiter,
  listGoFiles,
} from "./lib/go-scanner.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardId = "dsh-route-permission-binding-gate";
const httpRoot = path.join(repositoryRoot, "services/dsh/backend/internal/http");
const allowlistPath = path.join(repositoryRoot, "tools/guards/dsh-route-permission-binding-allowlist.json");

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) return new Map();
  const parsed = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  const entries = new Map();
  for (const entry of parsed.entries ?? []) {
    if (!entry.handler || !entry.reason) {
      throw new Error(`${allowlistPath}: every entry needs a handler and a reason`);
    }
    entries.set(entry.handler, entry.reason);
  }
  return entries;
}

function stripLineComments(text) {
  return text
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

const files = listGoFiles(httpRoot, { recursive: false });
const fileTexts = new Map(files.map((file) => [file, stripLineComments(fs.readFileSync(file, "utf8"))]));

// Handler name -> function body. Function bodies are delimited with the same
// balanced scanner used by route parsing, so nested literals/comments cannot
// terminate a body early.
const funcBodies = new Map();
for (const [, text] of fileTexts) {
  const funcRe = /func \(\w+ \*\w+\) (\w+)\(/g;
  let match;
  while ((match = funcRe.exec(text))) {
    const name = match[1];
    if (funcBodies.has(name)) continue;
    const openBrace = text.indexOf("{", match.index);
    if (openBrace < 0) continue;
    const closeBrace = findMatchingDelimiter(text, openBrace, "{", "}");
    if (closeBrace < 0) continue;
    funcBodies.set(name, text.slice(openBrace + 1, closeBrace));
  }
}

const AUTH_TOKEN = /\brequire\w*Permission\(|\brequireActor\(|\brequirePermission\(|\brequireWltServiceCaller\(|\bRequireServiceCaller\(|\bidentity\.Resolve\(/;
const ACTOR_CTX_TOKEN = /\bActorFromContext\(/;
const DELEGATE_RE = /\bs\.(\w+)\(w,\s*r\s*[,)]/g;

function classify(body, depth = 0, visited = new Set()) {
  if (depth > 8) return "UNRESOLVED";
  const authMatch = body.match(AUTH_TOKEN);
  const ctxMatch = body.match(ACTOR_CTX_TOKEN);
  if (authMatch && (!ctxMatch || authMatch.index < ctxMatch.index)) return "SAFE";
  if (ctxMatch && (!authMatch || ctxMatch.index < authMatch.index)) return "UNSAFE";

  DELEGATE_RE.lastIndex = 0;
  let delegated;
  while ((delegated = DELEGATE_RE.exec(body))) {
    const target = delegated[1];
    if (visited.has(target)) continue;
    const targetBody = funcBodies.get(target);
    if (!targetBody) continue;
    const nextVisited = new Set(visited);
    nextVisited.add(target);
    const verdict = classify(targetBody, depth + 1, nextVisited);
    if (verdict === "SAFE" || verdict === "UNSAFE") return verdict;
  }
  return "NOCHECK";
}

const registrations = extractGoRoutes("services/dsh/backend/internal/http/server.go");
const allowlist = loadAllowlist();
const violations = [];
const usedAllowlistEntries = new Set();

for (const registration of registrations) {
  const routeLabel = `${registration.route} (${path.relative(repositoryRoot, registration.filePath)}:${registration.line})`;

  // Canonical wrapper: withPermission resolves identity and permission before
  // invoking the handler. Parsing comes from the shared route parser, not a
  // substring/regex heuristic.
  if (registration.handler.kind === "withPermission") {
    if (!registration.handler.permissionExpression || !registration.handler.handlerName) {
      violations.push(`${routeLabel}: malformed withPermission registration '${registration.handlerExpression}'`);
    }
    continue;
  }

  // Verified wrappers that authenticate and establish OperatorContext.
  if (/\bwithTrustedPartnerOperatorContext\(|\bwithOperatorContextPartnerResource\(/.test(registration.handlerExpression)) {
    continue;
  }

  const handlerName = registration.handler.handlerName;
  if (!handlerName) continue;
  if (allowlist.has(handlerName)) {
    usedAllowlistEntries.add(handlerName);
    continue;
  }

  const body = funcBodies.get(handlerName);
  if (!body) continue;
  const verdict = classify(body, 0, new Set([handlerName]));
  if (verdict === "UNSAFE") {
    violations.push(
      `${routeLabel}: handler ${handlerName} reads ActorFromContext without a preceding permission check reachable in its call chain. Wrap the registration in withPermission(surface, permission, handler), or add the handler to ${path.relative(repositoryRoot, allowlistPath)} with a precise reviewed reason when it genuinely uses another authorization model.`,
    );
  }
}

for (const handler of allowlist.keys()) {
  if (!usedAllowlistEntries.has(handler)) {
    violations.push(
      `${path.relative(repositoryRoot, allowlistPath)} entry is stale: handler ${handler} is no longer registered bare (or no longer exists). Remove it.`,
    );
  }
}

console.log(`registrations_checked: ${registrations.length}`);
console.log(`allowlist_entries: ${allowlist.size}`);
for (const violation of violations) console.error(`${guardId} FAIL: ${violation}`);
if (violations.length > 0) {
  console.log(`${guardId}: FAIL (${violations.length})`);
  process.exit(1);
}
console.log(`${guardId}: PASS`);
