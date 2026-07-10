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
  ['message: "DEV_BYPASS_DISABLED"', "production dev bypass must fail closed"],
  ['action: "read"', "dev bypass must not grant wildcard action permission"],
  ["memory-only", "dev bypass must not be persisted"],
]) {
  requireText(identityPath, text, message);
}

forbidText(
  identityPath,
  'action: "*"',
  "wildcard dev-bypass permission is forbidden",
);

const identity = read(identityPath);
const devStart = identity.indexOf("export function devBypassLogin");
const devBlock = devStart >= 0 ? identity.slice(devStart) : "";
if (devBlock.includes("saveStoredSession(stored)")) {
  failures.push(`${identityPath}: dev bypass must never persist its session`);
}

requireText(
  loginCardPath,
  'password.length < 12',
  "login UI password minimum must match the Identity contract",
);
requireText(
  loginCardPath,
  'typeof __DEV__ !== "undefined"',
  "developer login UI must be hidden outside development",
);

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