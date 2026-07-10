import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const violations = [];

function read(relative) {
  const absolute = path.join(repoRoot, relative);
  if (!fs.existsSync(absolute)) {
    violations.push(`${relative}: required file is missing`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

function requireText(relative, text, message) {
  const content = read(relative);
  if (!content.includes(text)) {
    violations.push(`${relative}: ${message}`);
  }
}

function forbidText(relative, text, message) {
  const content = read(relative);
  if (content.includes(text)) {
    violations.push(`${relative}: ${message}`);
  }
}

const identityPath = "core/identity/clients/identity-session-store.ts";
const loginCardPath = "services/dsh/frontend/shared/auth/AuthLoginCard.tsx";
const checkoutPath =
  "services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx";
const orderControllerPath =
  "services/dsh/frontend/shared/orders/use-orders-controller.ts";

requireText(
  identityPath,
  'typeof __DEV__ !== "undefined" && __DEV__ === true',
  "devBypassLogin must enforce a runtime __DEV__ check internally",
);

requireText(
  identityPath,
  'message: "DEV_BYPASS_DISABLED"',
  "production dev-bypass attempts must fail closed",
);

requireText(
  loginCardPath,
  'typeof __DEV__ !== "undefined"',
  "developer login UI must be hidden outside development builds",
);

requireText(
  checkoutPath,
  "useSupportTicketController(identity.state.kind)",
  "order issue reporting must use the real support controller",
);

requireText(
  checkoutPath,
  "supportController.submitTicket",
  "order issue submission must execute the real support mutation",
);

requireText(
  checkoutPath,
  "supportController.actionState.ticket.id",
  "the UI must show the real persisted support ticket identifier",
);

for (const [text, message] of [
  [
    "Chat UI is local-only",
    "local-only order chat state is forbidden",
  ],
  [
    "setSupportSubmitted(true)",
    "fake local support success is forbidden",
  ],
  [
    "setRatingsSubmitted(true)",
    "fake local ratings persistence is forbidden",
  ],
  [
    "تقريباً 15 دقيقة",
    "fabricated arrival estimates are forbidden",
  ],
  [
    "أحمد الكابتن",
    "hard-coded captain identity is forbidden",
  ],
  [
    "handleRingCaptainBell",
    "local bell mutation without a backend contract is forbidden",
  ],
  [
    "صندوق محادثة حي ومفتوح",
    "UI must not claim live chat without an operational channel",
  ],
  [
    "تم رفع التذكرة للدعم",
    "UI must not claim ticket creation from local state",
  ],
  [
    "تم حفظ التقويم",
    "UI must not claim rating persistence from local state",
  ],
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

if (errorIndex < 0 || loadingIndex < 0 || errorIndex > loadingIndex) {
  violations.push(
    `${checkoutPath}: error state must be evaluated before the !order loading state`,
  );
}

requireText(
  orderControllerPath,
  "const interval = setInterval(load, 3000);",
  "the live-status claim requires active backend polling",
);

requireText(
  orderControllerPath,
  "return () => clearInterval(interval);",
  "order polling must clean up its interval",
);

if (violations.length > 0) {
  console.error("[FAIL] live-cross-journey-integrity-gate");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("[PASS] live-cross-journey-integrity-gate");