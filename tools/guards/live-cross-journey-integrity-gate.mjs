import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "live-cross-journey-integrity-gate";
const violations = [];

function read(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) {
    violations.push({ file: relativePath, line: 0, message: "REQUIRED_FILE_MISSING" });
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function requireText(relativePath, text, message) {
  const content = read(relativePath);
  if (!content.includes(text)) violations.push({ file: relativePath, line: 0, message });
}

function forbidText(relativePath, text, message) {
  const content = read(relativePath);
  const index = content.indexOf(text);
  if (index >= 0) violations.push({ file: relativePath, line: lineNumber(content, index), message });
}

function walk(relativeDir, extensions, files = []) {
  const fullDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(fullDir)) return files;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    if (["node_modules", ".next", "generated", "__generated__", "dist", "build"].includes(entry.name)) continue;
    const full = path.join(fullDir, entry.name);
    const relative = toPosix(path.relative(repoRoot, full));
    if (entry.isDirectory()) walk(relative, extensions, files);
    else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(relative);
  }
  return files;
}

function forbidInDirectory(relativeDir, extensions, pattern, message, exclude = () => false) {
  for (const file of walk(relativeDir, extensions)) {
    if (exclude(file)) continue;
    const content = read(file);
    for (const match of content.matchAll(pattern)) {
      violations.push({ file, line: lineNumber(content, match.index), message });
    }
  }
}

// Identity/session invariants.
const identityStore = "core/identity/clients/identity-session-store.ts";
for (const marker of ["isValidActorIdentity", "restoreStoredSession", "identityClient.session", "identityClient.refresh", "IDENTITY_SESSION_INVALID"]) {
  requireText(identityStore, marker, `IDENTITY_SESSION_INVARIANT_MISSING ${marker}`);
}
for (const forbidden of ['action: "*"', "devBypassLogin", "resolveDevBypassIdentity", "DEV_BYPASS_DISABLED"]) {
  forbidText(identityStore, forbidden, `IDENTITY_BYPASS_OR_WILDCARD_FORBIDDEN ${forbidden}`);
}
forbidInDirectory("services/dsh/frontend", [".ts", ".tsx"], /devBypassLogin/g, "FRONTEND_DEVELOPER_BYPASS_FORBIDDEN");
forbidInDirectory("services/dsh/frontend/control-panel", [".ts", ".tsx"], /useIdentitySession/g, "CONTROL_PANEL_LEGACY_SESSION_HOOK_FORBIDDEN");

const authContract = "core/identity/contracts/auth.openapi.yaml";
requireText(authContract, "minLength: 6", "IDENTITY_PASSWORD_CONTRACT_MINIMUM_MISSING");
const identityRepository = "core/identity/backend/internal/identity/repository.go";
requireText(identityRepository, "len(input.Password) < 6", "IDENTITY_PASSWORD_IMPLEMENTATION_MINIMUM_MISSING");
forbidText(identityRepository, "len(input.Password) < 4", "STALE_IDENTITY_PASSWORD_MINIMUM_FORBIDDEN");
requireText(identityRepository, "loginLockoutThreshold", "IDENTITY_LOGIN_LOCKOUT_MISSING");
requireText(identityRepository, "identity_login_attempts", "IDENTITY_LOGIN_AUDIT_MISSING");

const identityServer = "core/identity/backend/internal/http/server.go";
requireText(identityServer, "IDENTITY_CORS_ALLOWED_ORIGINS", "IDENTITY_CORS_ENV_ALLOWLIST_MISSING");
forbidText(identityServer, 'origin == "http://localhost:13000"', "HARDCODED_IDENTITY_CORS_ORIGIN_FORBIDDEN");

// Operator authorization must be permission-based, not coarse role-only.
for (const file of walk("services/dsh/backend", [".go"])) {
  if (file.endsWith("_test.go") || file.endsWith("protected_store.go")) continue;
  const content = read(file);
  if (content.includes('"central-catalog"')) {
    violations.push({ file, line: 0, message: "NON_CONTRACT_CONTROL_SURFACE_PERMISSION_FORBIDDEN" });
  }
  for (const pattern of [/requireActor\(w,\s*r,\s*"operator"\)/g, /servePartnerHandler\(w, r, [^)]*"operator"\)/g]) {
    for (const match of content.matchAll(pattern)) {
      violations.push({ file, line: lineNumber(content, match.index), message: "OPERATOR_ROUTE_REQUIRES_FINE_GRAINED_PERMISSION" });
    }
  }
}

// Control-panel security and truthfulness.
forbidInDirectory(
  "services/dsh/frontend/control-panel",
  [".ts", ".tsx"],
  /سيتم ربط|سيتم عرض|قريباً|preview-ready/g,
  "CONTROL_PANEL_FUTURE_OR_PREVIEW_PROMISE_FORBIDDEN",
);
const topBar = "apps/control-panel/runtime/src/shell/ControlPanelTopBar.tsx";
requireText(topBar, "serviceStatus", "TOP_BAR_REAL_SERVICE_STATUS_MISSING");
forbidText(topBar, ">نشط<", "TOP_BAR_FAKE_ACTIVE_STATUS_FORBIDDEN");

for (const directory of ["services/dsh/frontend/control-panel", "apps/control-panel/runtime"]) {
  for (const file of walk(directory, [".ts", ".tsx"])) {
    const buffer = fs.readFileSync(path.join(repoRoot, file));
    const content = buffer.toString("utf8");
    const hasBom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
    if (hasBom || /[ÃÂ]|â€/.test(content)) violations.push({ file, line: 0, message: "INVALID_UTF8_OR_MOJIBAKE" });
  }
}

const cookies = "apps/control-panel/runtime/src/app/api/auth/_lib/cookies.ts";
requireText(cookies, "httpOnly: true", "BFF_HTTP_ONLY_COOKIE_MISSING");
requireText(cookies, "isSameOriginRequest", "BFF_SAME_ORIGIN_MUTATION_GUARD_MISSING");
for (const route of [
  "apps/control-panel/runtime/src/app/api/auth/login/route.ts",
  "apps/control-panel/runtime/src/app/api/auth/session/route.ts",
  "apps/control-panel/runtime/src/app/api/auth/refresh/route.ts",
]) {
  for (const leak of ["{ accessToken", "{ refreshToken", "accessToken: tokens", "accessToken: rotated"]) {
    forbidText(route, leak, "BFF_TOKEN_RESPONSE_LEAK_FORBIDDEN");
  }
}

// Checkout/support must use persisted service mutations and identifiers.
const supportController = "services/dsh/frontend/shared/support/use-support-controller.tsx";
requireText(supportController, "if (!isAuthenticated(authKind))", "SUPPORT_MUTATION_AUTH_GUARD_MISSING");
const checkout = "services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx";
for (const marker of [
  "useSupportTicketController(identity.state.kind)",
  "supportController.submitTicket",
  "supportController.actionState.ticket.id",
  "مرجع جلسة الدفع WLT",
]) {
  requireText(checkout, marker, `CHECKOUT_PERSISTED_FLOW_MARKER_MISSING ${marker}`);
}
for (const forbidden of [
  "Chat UI is local-only", "setSupportSubmitted(true)", "setRatingsSubmitted(true)", "handleRingCaptainBell",
  "customerBellRung", "أحمد الكابتن", "9548-صنعاء", "تقريباً 15 دقيقة", "أقل من 500 متر",
  "سيصل خلال دقيقتين", "صندوق محادثة حي ومفتوح", "تم رفع التذكرة للدعم", "تم حفظ التقويم",
]) {
  forbidText(checkout, forbidden, "CHECKOUT_FAKE_OR_LOCAL_SUCCESS_FORBIDDEN");
}

// Captain unsupported transitions remain fail-closed until contracts exist.
const captainPolicy = "services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts";
for (const marker of ["locationPush: false", "failDelivery: false", "confirmReturn: false"]) {
  requireText(captainPolicy, marker, `CAPTAIN_UNSUPPORTED_CAPABILITY_MUST_REMAIN_DISABLED ${marker}`);
}
const captainTransport = "services/dsh/frontend/shared/orders/dsh-order-lifecycle.transport.ts";
for (const marker of ["captain location push is not exposed", "failed delivery mutation is not exposed", "return confirmation mutation is not exposed"]) {
  requireText(captainTransport, marker, `CAPTAIN_TRANSPORT_FAIL_CLOSED_MARKER_MISSING ${marker}`);
}

// WLT local/staging posture: mock mutations may be active; production providers remain blocked.
const wltManifest = "services/wlt/service.manifest.ts";
for (const marker of ["journeyRuntimeVerified: false", "generatedClientReady: true", "mutationRuntimeReady: true", "mutationJourneysApproved: true"]) {
  requireText(wltManifest, marker, `WLT_POSTURE_MARKER_MISSING ${marker}`);
}
const runtimeEnv = "infra/docker/env/runtime.env.example";
for (const marker of ["WLT_MUTATIONS_ENABLED=true", "WLT_FINANCIAL_PROVIDER_MODE=mock", "WLT_ALLOW_PRODUCTION_PROVIDER=false"]) {
  requireText(runtimeEnv, marker, `WLT_SAFE_DEFAULT_MISSING ${marker}`);
}
for (const forbidden of ["WLT_FINANCIAL_PROVIDER_MODE=production", "WLT_ALLOW_PRODUCTION_PROVIDER=true"]) {
  forbidText(runtimeEnv, forbidden, `WLT_PRODUCTION_DEFAULT_FORBIDDEN ${forbidden}`);
}

// Gate topology invariants only; this regression guard does not own CI completeness.
const journeyGate = "tools/scripts/run-journey-gate.ps1";
requireText(journeyGate, "[switch]$Full", "JOURNEY_GATE_EXPLICIT_FULL_SWITCH_MISSING");
requireText(journeyGate, "if ($Full)", "JOURNEY_GATE_TARGETED_DEFAULT_MISSING");
forbidText(journeyGate, "$runFull = $true", "JOURNEY_GATE_MUST_NOT_FORCE_FULL_BY_DEFAULT");
const packageJson = JSON.parse(read("package.json"));
const journeyCommand = packageJson.scripts?.["journey:gate"] ?? "";
if (!journeyCommand) violations.push({ file: "package.json", line: 0, message: "JOURNEY_GATE_SCRIPT_MISSING" });
if (journeyCommand.includes("-Soft")) violations.push({ file: "package.json", line: 0, message: "JOURNEY_GATE_SOFT_FAILURE_FORBIDDEN" });

const ci = read(".github/workflows/ci.yml");
for (const marker of ["bassam", "contents: read", "ci-result:", "if: always()"] ) {
  if (!ci.includes(marker)) violations.push({ file: ".github/workflows/ci.yml", line: 0, message: `CI_TOPOLOGY_MARKER_MISSING ${marker}` });
}
for (const forbidden of ["git push", "git commit", "gofmt -w", "contents: write"]) {
  if (ci.includes(forbidden)) violations.push({ file: ".github/workflows/ci.yml", line: 0, message: `CI_SOURCE_MUTATION_FORBIDDEN ${forbidden}` });
}

console.log("live-cross-journey-integrity-gate: scoped regression invariants only");
console.log("live-cross-journey-integrity-gate: PASS does not prove full journey runtime, QA, security, release, or production closure");
fail(guardId, violations);
