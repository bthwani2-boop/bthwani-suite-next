import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: required file is missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireText(relativePath, text, message) {
  if (!read(relativePath).includes(text)) {
    failures.push(`${relativePath}: ${message}`);
  }
}

function forbidText(relativePath, text, message) {
  if (read(relativePath).includes(text)) {
    failures.push(`${relativePath}: ${message}`);
  }
}

function walkFiles(relativeDir, extensions) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const out = [];
  const stack = [absoluteDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        stack.push(full);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  }
  return out;
}

function forbidTextInDirectory(relativeDir, extensions, text, message) {
  for (const absoluteFile of walkFiles(relativeDir, extensions)) {
    if (fs.readFileSync(absoluteFile, "utf8").includes(text)) {
      const relativeFile = path.relative(repoRoot, absoluteFile);
      failures.push(`${relativeFile}: ${message}`);
    }
  }
}

const identityPath =
  "core/identity/clients/identity-session-store.ts";
const loginCardPath =
  "services/dsh/frontend/shared/auth/AuthLoginCard.tsx";
const checkoutPath =
  "services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx";
const supportControllerPath =
  "services/dsh/frontend/shared/support/use-support-controller.tsx";
const captainPolicyPath =
  "services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts";
const captainTransportPath =
  "services/dsh/frontend/shared/orders/dsh-order-lifecycle.transport.ts";
const wltManifestPath = "services/wlt/service.manifest.ts";
const runtimeEnvPath = "infra/docker/env/runtime.env.example";
const journeyGatePath = "tools/scripts/run-journey-gate.ps1";
const packagePath = "package.json";
const ciPath = ".github/workflows/ci.yml";

for (const [text, message] of [
  ["isValidActorIdentity", "stored identity must be schema-validated"],
  ["restoreStoredSession", "stored sessions must be restored through Identity"],
  ["identityClient.session", "access tokens must be validated by Identity"],
  ["identityClient.refresh", "expired access tokens must use refresh rotation"],
  ['message: "IDENTITY_SESSION_INVALID"', "invalid sessions must fail closed"],
]) {
  requireText(identityPath, text, message);
}

for (const [text, message] of [
  ['action: "*"', "wildcard permission grants are forbidden"],
  ["devBypassLogin", "the developer session bypass must not exist in the shared identity client"],
  ["DEV_BYPASS_DISABLED", "dev-bypass compliance markers are stale once the bypass is removed"],
]) {
  forbidText(identityPath, text, message);
}

requireText(
  loginCardPath,
  'password.length < 6',
  "login UI password minimum must match the Identity contract",
);
forbidText(
  loginCardPath,
  "onDevBypass",
  "the shared login card must not offer a developer session bypass",
);

const identityRepositoryPath =
  "core/identity/backend/internal/identity/repository.go";
forbidText(
  identityRepositoryPath,
  "dev-bypass-",
  "Identity backend must never special-case dev-bypass-prefixed tokens",
);
forbidText(
  identityRepositoryPath,
  "resolveDevBypassIdentity",
  "Identity backend must not fabricate identities from client-supplied token text",
);

forbidTextInDirectory(
  "services/dsh/frontend",
  [".ts", ".tsx"],
  "devBypassLogin",
  "no app (control-panel, client, partner, captain, field) may call the developer session bypass",
);

forbidTextInDirectory(
  "services/dsh/frontend/control-panel",
  [".ts", ".tsx"],
  "useIdentitySession",
  "control-panel screens must use ControlPanelSession, not the legacy localStorage-based identity hook",
);

for (const absoluteFile of walkFiles("services/dsh/backend", [".go"])) {
  // permission_test.go intentionally asserts that a stale central-catalog
  // grant is now rejected -- excluded from this production-code check.
  if (absoluteFile.endsWith("_test.go")) continue;
  const goSource = fs.readFileSync(absoluteFile, "utf8");
  const relativeFile = path.relative(repoRoot, absoluteFile);
  if (goSource.includes('"central-catalog"')) {
    failures.push(
      `${relativeFile}: DSH backend permissions must use the control-panel surface (contract-valid), not the non-contract central-catalog surface`,
    );
  }
  // WP7 regression guard: every operator-only route must go through
  // requirePermission/requireCatalogPermission/servePartnerPermissionHandler
  // (fine-grained, permission-data-ready) rather than the coarse role-only
  // requireActor/servePartnerHandler -- protected_store.go itself is exempt
  // since it defines requireActor and legitimately still uses it for
  // non-operator-only role sets (client/partner/captain/field mixes).
  if (relativeFile.endsWith("protected_store.go")) continue;
  if (/requireActor\(w,\s*r,\s*"operator"\)/.test(goSource)) {
    failures.push(
      `${relativeFile}: plain requireActor(w, r, "operator") checks must be migrated to requirePermission (see WP7)`,
    );
  }
  if (/servePartnerHandler\(w, r, [^)]*"operator"\)/.test(goSource)) {
    failures.push(
      `${relativeFile}: plain servePartnerHandler(..., "operator") checks must be migrated to servePartnerPermissionHandler (see WP7)`,
    );
  }
}

const identityAuthContractPath = "core/identity/contracts/auth.openapi.yaml";
requireText(
  identityAuthContractPath,
  "minLength: 6",
  "Identity's LoginRequest.password contract must require at least 6 characters",
);

const identityBootstrapPath = "core/identity/backend/internal/identity/repository.go";
forbidText(
  identityBootstrapPath,
  "len(input.Password) < 4",
  "local bootstrap must not accept passwords shorter than the 6-char contract minimum",
);
requireText(
  identityBootstrapPath,
  "len(input.Password) < 6",
  "local bootstrap password minimum must match the Identity contract",
);

for (const loginText of ['type="password"', "identity.state.kind !== \"authenticated\""]) {
  forbidTextInDirectory(
    "services/dsh/frontend/control-panel",
    [".ts", ".tsx"],
    loginText,
    "control-panel screens must not render a local login gate; the single login lives at apps/control-panel/runtime/src/app/dsh/login",
  );
}

for (const placeholderText of ["سيتم ربط", "سيتم عرض", "قريباً", "preview-ready"]) {
  forbidTextInDirectory(
    "services/dsh/frontend/control-panel",
    [".ts", ".tsx"],
    placeholderText,
    "control-panel screens must not promise future work in-UI; use an honest unavailable state instead (see WP8)",
  );
}

const topBarPath = "apps/control-panel/runtime/src/shell/ControlPanelTopBar.tsx";
forbidText(
  topBarPath,
  ">نشط<",
  "the TopBar must not hardcode a fake \"active\" status label; use the real serviceStatus prop",
);
requireText(
  topBarPath,
  "serviceStatus",
  "the TopBar must derive its status indicator from a real health signal",
);

requireText(
  identityBootstrapPath,
  "loginLockoutThreshold",
  "Identity login must enforce a lockout threshold against brute-force attempts",
);
requireText(
  identityBootstrapPath,
  "identity_login_attempts",
  "Identity login attempts (success and failure, never the password) must be audit-logged",
);

const identityServerPath = "core/identity/backend/internal/http/server.go";
forbidText(
  identityServerPath,
  'origin == "http://localhost:13000"',
  "Identity CORS must be environment-configurable, not hardcoded to a single localhost origin",
);
requireText(
  identityServerPath,
  "IDENTITY_CORS_ALLOWED_ORIGINS",
  "Identity CORS allowlist must be read from environment configuration",
);

for (const encodingDir of [
  "services/dsh/frontend/control-panel",
  "apps/control-panel/runtime",
]) {
  for (const absoluteFile of walkFiles(encodingDir, [".ts", ".tsx"])) {
    const buffer = fs.readFileSync(absoluteFile);
    const hasBom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
    const text = buffer.toString("utf8");
    if (hasBom || /[ÃÂ]|â€/.test(text)) {
      const relativeFile = path.relative(repoRoot, absoluteFile);
      failures.push(`${relativeFile}: file has a BOM or double-encoded (mojibake) UTF-8 content`);
    }
  }
}

const cookiesLibPath = "apps/control-panel/runtime/src/app/api/auth/_lib/cookies.ts";
requireText(cookiesLibPath, "httpOnly: true", "BFF session cookies must be HttpOnly");
requireText(cookiesLibPath, "isSameOriginRequest", "BFF must reject cross-origin mutations");

for (const bffRoute of [
  "apps/control-panel/runtime/src/app/api/auth/login/route.ts",
  "apps/control-panel/runtime/src/app/api/auth/session/route.ts",
  "apps/control-panel/runtime/src/app/api/auth/refresh/route.ts",
]) {
  for (const leak of ["{ accessToken", "{ refreshToken", "accessToken: tokens", "accessToken: rotated"]) {
    forbidText(
      bffRoute,
      leak,
      "the BFF must never return access/refresh tokens in a JSON response body",
    );
  }
}

requireText(
  supportControllerPath,
  "if (!isAuthenticated(authKind))",
  "support mutations must fail closed when unauthenticated",
);

for (const [text, message] of [
  [
    "useSupportTicketController(identity.state.kind)",
    "order support must use the governed support controller",
  ],
  [
    "supportController.submitTicket",
    "order support must execute the real DSH mutation",
  ],
  [
    "supportController.actionState.ticket.id",
    "success UI must display the persisted ticket id",
  ],
  [
    "مرجع جلسة الدفع WLT",
    "order UI must expose the real WLT reference for traceability",
  ],
]) {
  requireText(checkoutPath, text, message);
}

for (const [text, message] of [
  ["Chat UI is local-only", "local-only chat state is forbidden"],
  ["setSupportSubmitted(true)", "fake local support success is forbidden"],
  ["setRatingsSubmitted(true)", "fake local rating success is forbidden"],
  ["handleRingCaptainBell", "fake local bell mutation is forbidden"],
  ["customerBellRung", "fake local bell state is forbidden"],
  ["أحمد الكابتن", "hard-coded captain identity is forbidden"],
  ["9548-صنعاء", "hard-coded vehicle identity is forbidden"],
  ["تقريباً 15 دقيقة", "fabricated ETA is forbidden"],
  ["أقل من 500 متر", "fabricated distance is forbidden"],
  ["سيصل خلال دقيقتين", "fabricated arrival claim is forbidden"],
  ["صندوق محادثة حي ومفتوح", "live-chat claim without a channel is forbidden"],
  ["تم رفع التذكرة للدعم", "local support success claim is forbidden"],
  ["تم حفظ التقويم", "local rating persistence claim is forbidden"],
]) {
  forbidText(checkoutPath, text, message);
}

const checkout = read(checkoutPath);
const errorIndex = checkout.indexOf(
  'if (detailController.state.kind === "error")',
);
const loadingIndex = checkout.indexOf(
  'if (detailController.state.kind === "loading" || !order)',
);
if (
  errorIndex < 0 ||
  loadingIndex < 0 ||
  errorIndex > loadingIndex
) {
  failures.push(
    `${checkoutPath}: error state must be evaluated before !order loading`,
  );
}

for (const capability of [
  "locationPush: false",
  "failDelivery: false",
  "confirmReturn: false",
]) {
  requireText(
    captainPolicyPath,
    capability,
    `unsupported captain capability must remain fail-closed: ${capability}`,
  );
}

for (const transition of [
  "captain location push is not exposed",
  "failed delivery mutation is not exposed",
  "return confirmation mutation is not exposed",
]) {
  requireText(
    captainTransportPath,
    transition,
    `transport must reject unsupported transition: ${transition}`,
  );
}

for (const flag of [
  "generatedClientReady: false",
  "journeyRuntimeVerified: false",
  "mutationRuntimeReady: false",
  "mutationJourneysApproved: false",
]) {
  requireText(
    wltManifestPath,
    flag,
    `WLT must not claim unverified financial readiness: ${flag}`,
  );
}

requireText(
  runtimeEnvPath,
  "WLT_MUTATIONS_ENABLED=false",
  "financial mutations must remain disabled by default",
);
forbidText(
  runtimeEnvPath,
  "WLT_MUTATIONS_ENABLED=true",
  "default runtime must never enable unapproved financial mutations",
);

for (const command of [
  "pnpm run contracts:lint",
  "pnpm run lint",
  "pnpm run typecheck",
  "pnpm run test",
  "pnpm run build",
  "pnpm run runtime:full:reset",
  "pnpm run runtime:full:smoke",
]) {
  requireText(
    journeyGatePath,
    command,
    `journey gate is missing required command: ${command}`,
  );
}

const packageJson = JSON.parse(read(packagePath));
const journeyCommand = packageJson.scripts?.["journey:gate"] ?? "";
if (!journeyCommand.includes("-Full")) {
  failures.push(`${packagePath}: journey:gate must invoke the full gate`);
}
if (journeyCommand.includes("-Soft")) {
  failures.push(`${packagePath}: journey:gate must not use -Soft`);
}

for (const ciCommand of [
  "pnpm run journey:gate",
  "pnpm run typecheck",
  "pnpm run build",
  "pnpm run test",
  "Full runtime reset and smoke",
]) {
  requireText(
    ciPath,
    ciCommand,
    `CI is missing required verification: ${ciCommand}`,
  );
}

if (failures.length > 0) {
  console.error("[FAIL] live-cross-journey-integrity-gate");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[PASS] live-cross-journey-integrity-gate");
console.log(
  "[SAFE-BLOCKED] captain location/failure/return remain disabled until contracts exist",
);
console.log(
  "[SAFE-BLOCKED] WLT financial mutations remain disabled until approved and verified",
);