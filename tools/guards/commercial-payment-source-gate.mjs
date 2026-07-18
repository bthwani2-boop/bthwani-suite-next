import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "commercial-payment-source-gate";
const violations = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function requireText(file, text, message) {
  const source = read(file);
  if (!source.includes(text)) {
    violations.push({ file, message });
  }
  return source;
}

const genericHandler = requireText(
  "services/wlt/backend/internal/reference/trusted_tenant_handler.go",
  "subscription purchases must use /wlt/commercial/payment-sessions",
  "GENERIC_PAYMENT_ROUTE_ACCEPTS_SUBSCRIPTION: the generic WLT payment route must reject subscription source fields",
);
if (!genericHandler.includes("input.SubscriptionPurchaseID") || !genericHandler.includes("input.CommercialProductReference")) {
  violations.push({
    file: "services/wlt/backend/internal/reference/trusted_tenant_handler.go",
    message: "GENERIC_PAYMENT_ROUTE_SOURCE_GUARD_MISSING: both subscription source fields must be rejected",
  });
}

const router = requireText(
  "services/wlt/backend/internal/http/server.go",
  'POST /wlt/commercial/payment-sessions',
  "SUBSCRIPTION_PAYMENT_ROUTE_NOT_REGISTERED",
);
if (!router.includes("commercial.HandleCreateSubscriptionPaymentSession")) {
  violations.push({
    file: "services/wlt/backend/internal/http/server.go",
    message: "SUBSCRIPTION_PAYMENT_HANDLER_NOT_BOUND",
  });
}

requireText(
  "services/wlt/contracts/wlt.commercial.openapi.yaml",
  "/wlt/commercial/payment-sessions:",
  "SUBSCRIPTION_PAYMENT_ROUTE_NOT_CONTRACTED",
);

for (const file of [
  "services/dsh/backend/internal/wlt/subscription_purchase.go",
  "services/dsh/backend/internal/wlt/subscription_payment_bound.go",
]) {
  const source = requireText(
    file,
    "/wlt/commercial/payment-sessions",
    "DSH_SUBSCRIPTION_CLIENT_NOT_USING_COMMERCIAL_ROUTE",
  );
  if (source.includes('"/wlt/payment-sessions"')) {
    violations.push({
      file,
      message: "DSH_SUBSCRIPTION_CLIENT_USES_GENERIC_PAYMENT_ROUTE",
    });
  }
}

const unsafeHelper = "services/dsh/backend/internal/wlt/subscription_payment_generic.go";
if (fs.existsSync(path.join(repoRoot, unsafeHelper))) {
  violations.push({
    file: unsafeHelper,
    message: "UNSAFE_GENERIC_SUBSCRIPTION_PAYMENT_HELPER_REINTRODUCED",
  });
}

fail(guardId, violations);
