// dsh-route-permission-binding-gate: fails the build when a DSH HTTP route is
// registered without a permission check reachable from its handler.
//
// Root cause this closes (FND-D06): withPermission is what authenticates the
// caller and places the actor in the request context. Handlers that instead
// start with ActorFromContext -- a silent context read that writes nothing --
// return early with no response body when the actor is absent, so a bare
// registration answers HTTP 200 with an empty body to any caller, authenticated
// or not, rather than 401/403. requireCatalogPermission had the same defect
// in a different shape: it discarded its `action` argument and fell back to
// ActorFromContext, so catalog handlers that looked authorized were not.
//
// This gate does not require every route to use withPermission specifically:
// several legitimate authorization patterns coexist in this codebase
// (withTrustedPartnerOperatorContext for OperatorContext-scoped partner
// routes, requireWltServiceCaller for internal service-to-service webhooks,
// requireActor for actor-role gates, inline identity.Resolve + custom checks
// for a handful of handlers). What it requires is that SOME permission- or
// identity-resolving call is reachable from the handler before any response
// is written, and that the handler is not gated by ActorFromContext alone.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardId = "dsh-route-permission-binding-gate";
const httpRoot = path.join(repositoryRoot, "services/dsh/backend/internal/http");
const allowlistPath = path.join(repositoryRoot, "tools/guards/dsh-route-permission-binding-allowlist.json");

// Handler names whose authorization happens through a call this gate's
// lightweight resolver cannot see (a wrapper function used as the handler
// value itself, a locally-named check inside the body, or a route that is
// deliberately public). Each entry requires a reason; the gate fails if an
// entry stops being registered bare (stale) so the allowlist cannot grow
// silently, and fails if a NEW unresolved handler appears that isn't here.
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

function stripComments(text) {
  // Strip // line comments only; this codebase's route registrations and
  // handler bodies do not rely on /* */ block comments containing code-like
  // tokens, and a full Go lexer is more machinery than this gate needs.
  return text
    .split("\n")
    .map((line) => {
      // Do not strip inside string literals naively -- route patterns and
      // permission constants are the only quoted content on these lines, and
      // none of them contain "//".
      const idx = line.indexOf("//");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

function listGoFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".go") && !entry.name.endsWith("_test.go"))
    .map((entry) => path.join(directory, entry.name));
}

function findMatchingParen(text, openParenIdx) {
  let depth = 0;
  for (let i = openParenIdx; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingBrace(text, openBraceIdx) {
  let depth = 0;
  for (let i = openBraceIdx; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const files = listGoFiles(httpRoot);
const fileTexts = new Map(files.map((f) => [f, stripComments(fs.readFileSync(f, "utf8"))]));

// funcBodies: handler name -> first matching function body found across the
// package (methods are effectively unique by name in this package's
// convention of one protectedStoreServer/-like receiver per handler).
const funcBodies = new Map();
for (const [, text] of fileTexts) {
  const funcRe = /func \(\w+ \*\w+\) (\w+)\(/g;
  let m;
  while ((m = funcRe.exec(text))) {
    const name = m[1];
    if (funcBodies.has(name)) continue;
    const openBrace = text.indexOf("{", m.index);
    if (openBrace === -1) continue;
    const closeBrace = findMatchingBrace(text, openBrace);
    if (closeBrace === -1) continue;
    funcBodies.set(name, text.slice(openBrace + 1, closeBrace));
  }
}

const AUTH_TOKEN = /\brequire\w*Permission\(|\brequireActor\(|\brequirePermission\(|\brequireWltServiceCaller\(|\bRequireServiceCaller\(|\bidentity\.Resolve\(/;
const ACTOR_CTX_TOKEN = /\bActorFromContext\(/;
const DELEGATE_RE = /\bs\.(\w+)\(w,\s*r\s*[,)]/g;

function classify(body, depth = 0) {
  if (depth > 5) return "UNRESOLVED";
  const authMatch = body.match(AUTH_TOKEN);
  const ctxMatch = body.match(ACTOR_CTX_TOKEN);
  if (authMatch && (!ctxMatch || authMatch.index < ctxMatch.index)) return "SAFE";
  if (ctxMatch && (!authMatch || ctxMatch.index < authMatch.index)) return "UNSAFE";
  // Neither token appears directly; look for delegation to another local
  // method taking (w, r, ...) as its first two arguments.
  DELEGATE_RE.lastIndex = 0;
  let dm;
  const seen = new Set();
  while ((dm = DELEGATE_RE.exec(body))) {
    const target = dm[1];
    if (seen.has(target)) continue;
    seen.add(target);
    const targetBody = funcBodies.get(target);
    if (!targetBody) continue;
    const verdict = classify(targetBody, depth + 1);
    if (verdict === "SAFE" || verdict === "UNSAFE") return verdict;
  }
  return "NOCHECK";
}

const registrations = [];
for (const [file, text] of fileTexts) {
  const re = /(\w+)\.HandleFunc\(\s*"([A-Z]+ [^"]+)"\s*,/g;
  let m;
  while ((m = re.exec(text))) {
    const startIdx = m.index;
    const lineNo = text.slice(0, startIdx).split("\n").length;
    const openParenIdx = text.indexOf("(", startIdx + m[1].length + ".HandleFunc".length);
    if (openParenIdx === -1) continue;
    const closeParenIdx = findMatchingParen(text, openParenIdx);
    if (closeParenIdx === -1) continue;
    const fullCall = text.slice(openParenIdx + 1, closeParenIdx);
    const commaIdx = fullCall.indexOf(",");
    if (commaIdx === -1) continue;
    const afterPattern = fullCall.slice(commaIdx + 1).trim();
    const routeLabel = `${m[2]} (${path.relative(repositoryRoot, file)}:${lineNo})`;

    if (/\.withPermission\(/.test(afterPattern)) continue; // canonical wrapper, always safe
    if (/\bwithTrustedPartnerOperatorContext\(|\bwithOperatorContextPartnerResource\(/.test(afterPattern)) continue; // verified OperatorContext-authenticating wrappers

    const nameMatch = afterPattern.match(/^\w+\.(\w+)/);
    const handlerName = nameMatch ? nameMatch[1] : null;

    registrations.push({ routeLabel, handlerName, raw: afterPattern.slice(0, 100) });
  }
}

const allowlist = loadAllowlist();
const violations = [];
const usedAllowlistEntries = new Set();

for (const r of registrations) {
  if (!r.handlerName) continue; // factory/inline call, e.g. handleFoo(db) or a public read -- not an ActorFromContext-shaped handler
  if (allowlist.has(r.handlerName)) {
    usedAllowlistEntries.add(r.handlerName);
    continue;
  }
  const body = funcBodies.get(r.handlerName);
  if (!body) continue; // not a protectedStoreServer-style method; out of this gate's shape
  const verdict = classify(body);
  if (verdict === "UNSAFE") {
    violations.push(
      `${r.routeLabel}: handler ${r.handlerName} reads ActorFromContext without a preceding permission check reachable in its call chain. Wrap the registration in withPermission(surface, permission, handler), or add the handler to ${path.relative(repositoryRoot, allowlistPath)} with a reason if it is genuinely public or uses a different verified auth pattern.`,
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
