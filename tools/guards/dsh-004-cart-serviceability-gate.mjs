import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, repoRoot, toPosix } from "./_guard-utils.mjs";

const violations = [];

// ── Required sovereign shared-brain files ────────────────────────────────────
const requiredSharedFiles = [
  "services/dsh/frontend/shared/cart/cart.api.ts",
  "services/dsh/frontend/shared/cart/cart.types.ts",
  "services/dsh/frontend/shared/cart/use-cart-controller.tsx",
  "services/dsh/frontend/shared/cart/cart.controller-core.ts",
  "services/dsh/frontend/shared/cart/cart.states.ts",
  "services/dsh/frontend/shared/cart/cart.view-model.ts",
  "services/dsh/frontend/shared/cart/index.ts",
];

for (const required of requiredSharedFiles) {
  if (!fs.existsSync(path.join(repoRoot, required))) {
    violations.push({ file: required, message: "required DSH-004 shared cart brain file is missing" });
  }
}

// ── Required surface files ────────────────────────────────────────────────────
const requiredSurfaceFiles = [
  "services/dsh/frontend/app-client/cart/CartScreen.tsx",
  "services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx",
];

for (const required of requiredSurfaceFiles) {
  if (!fs.existsSync(path.join(repoRoot, required))) {
    violations.push({ file: required, message: "required DSH-004 surface screen is missing" });
  }
}

// ── Generated client must contain cart operations ─────────────────────────────
const generatedClientPath = "services/dsh/clients/generated/dsh-api.ts";
if (!fs.existsSync(path.join(repoRoot, generatedClientPath))) {
  violations.push({ file: generatedClientPath, message: "DSH generated client is missing" });
} else {
  const source = fs.readFileSync(path.join(repoRoot, generatedClientPath), "utf8");
  const requiredOps = [
    "getDshClientCart",
    "upsertDshCartItem",
    "removeDshCartItem",
    "checkDshCartServiceability",
    "listOperatorCarts",
  ];
  for (const op of requiredOps) {
    if (!source.includes(op)) {
      violations.push({ file: generatedClientPath, message: `generated client missing cart operation: ${op}` });
    }
  }
}

// ── Surface screens must import from shared cart, not own fetch ───────────────
const surfaceScreens = [
  "services/dsh/frontend/app-client/cart/CartScreen.tsx",
  "services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx",
];

for (const screenPath of surfaceScreens) {
  const fullPath = path.join(repoRoot, screenPath);
  if (!fs.existsSync(fullPath)) continue;
  const source = fs.readFileSync(fullPath, "utf8");

  // Must import from shared cart
  if (!/from\s+["'][^"']*shared\/cart/.test(source) && !/from\s+["'][^"']*\.\.\/shared\/cart/.test(source)) {
    violations.push({
      file: toPosix(screenPath),
      message: "DSH-004 surface screen must import controller from shared/cart, not own local fetch",
    });
  }

  // Must not call fetch directly
  if (/\bfetch\s*\(/.test(source)) {
    violations.push({
      file: toPosix(screenPath),
      message: "DSH-004 surface screen must not call fetch directly; use shared cart controller",
    });
  }
}

// ── WLT boundary: shared cart must not contain financial mutations ─────────────
const cartSharedDir = "services/dsh/frontend/shared/cart";
const financialMutationPattern =
  /\b(ledger|walletBalance|paymentCapture|capturePayment|refund|settlement|commission|payout|chargeWallet|debitWallet)\b/i;

for (const file of listCodeFiles()) {
  const rel = toPosix(file);
  if (!rel.startsWith(cartSharedDir)) continue;
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (financialMutationPattern.test(source)) {
    violations.push({
      file: rel,
      message: "DSH-004 shared cart must not contain financial mutations (WLT boundary violation)",
    });
  }
}

fail("dsh-004-cart-serviceability", violations);
