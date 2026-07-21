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

// JRN-001 partner onboarding must keep one governed product model and cross-surface runtime.
const partnerTruth = "governance/product/contracts/jrn-001-partner-onboarding-store-publication.product-truth.json";
for (const marker of ["JRN-001", "app-field", "app-partner", "control-panel"]) {
  requireText(partnerTruth, marker, `JRN001_PRODUCT_TRUTH_MISSING ${marker}`);
}
const partnerRuntime = "services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts";
for (const marker of ["partner", "store", "readiness", "activation"]) {
  requireText(partnerRuntime, marker, `JRN001_SHARED_RUNTIME_MISSING ${marker}`);
}
const partnerIntegrity = "services/dsh/backend/internal/partner/onboarding_integrity_handlers.go";
for (const marker of ["Partner", "Store", "Readiness"]) {
  requireText(partnerIntegrity, marker, `JRN001_BACKEND_INTEGRITY_MISSING ${marker}`);
}

// JRN-002 identity/session invariants.
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
const identityMain = "core/identity/backend/cmd/identity-api/main.go";
for (const marker of ["BrowserCorsMiddleware", "CorsMiddleware", "ActivationSafetyMiddleware", "IDENTITY_LOCAL_BOOTSTRAP"]) {
  requireText(identityMain, marker, `JRN002_RUNTIME_SAFETY_MISSING ${marker}`);
}
const identityActivationSafetyTest = "core/identity/backend/internal/http/activation_safety_test.go";
for (const marker of ["RejectsBootstrapCodeOutsideLocalMode", "AllowsBootstrapCodeOnlyInExplicitLocalMode"]) {
  requireText(identityActivationSafetyTest, marker, `JRN002_ACTIVATION_TEST_MISSING ${marker}`);
}

// JRN-003 workforce lifecycle must be mounted and mutation-safe.
const workforceMain = "core/workforce/backend/cmd/workforce-api/main.go";
for (const marker of ["ActivationMutationSafetyMiddleware", "CorsMiddleware", "WORKFORCE_IDENTITY_BASE_URL", "WORKFORCE_DSH_BASE_URL"]) {
  requireText(workforceMain, marker, `JRN003_RUNTIME_BINDING_MISSING ${marker}`);
}
const workforceRoutesTest = "core/workforce/backend/internal/http/journey_routes_test.go";
for (const marker of [
  "POST /workforce/field-agents",
  "PATCH /workforce/field-agents/{actorId}",
  "POST /workforce/captains",
  "POST /workforce/employees",
  "GET /workforce/me",
  "PATCH /workforce/me",
]) {
  requireText(workforceRoutesTest, marker, `JRN003_ROUTE_PROOF_MISSING ${marker}`);
}

// JRN-004 and JRN-005 routes must remain mounted on the governed DSH router.
const firstFiveRoutesTest = "services/dsh/backend/internal/http/first_five_journeys_routes_test.go";
for (const marker of [
  "GET /dsh/stores",
  "GET /dsh/stores/{storeId}",
  "POST /dsh/operator/stores/{storeId}/governance",
  "GET /dsh/client/addresses",
  "POST /dsh/client/addresses",
  "PATCH /dsh/client/addresses/{addressId}",
  "DELETE /dsh/client/addresses/{addressId}",
  "POST /dsh/client/addresses/{addressId}/default",
]) {
  requireText(firstFiveRoutesTest, marker, `JRN004_005_ROUTE_PROOF_MISSING ${marker}`);
}

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

// JRN-005 address retries must retain the server idempotency identity after restart.
const addressAttempt = "services/dsh/frontend/shared/client-address/client-address-create-attempt.ts";
for (const marker of ["AsyncStorage", "fingerprintClientAddressDraft", "getOrCreateClientAddressAttempt", "clearClientAddressAttempt"]) {
  requireText(addressAttempt, marker, `ADDRESS_PERSISTED_ATTEMPT_MISSING ${marker}`);
}
const addressController = "services/dsh/frontend/shared/client-address/use-client-address-controller.ts";
for (const marker of ["getOrCreateClientAddressAttempt", "clearClientAddressAttempt", "attempt.context", "attempt.fingerprint"]) {
  requireText(addressController, marker, `ADDRESS_CONTROLLER_RETRY_BINDING_MISSING ${marker}`);
}
forbidText(addressController, "createAttempt = useRef", "ADDRESS_MEMORY_ONLY_RETRY_FORBIDDEN");

// JRN-006 map provider calls stay behind DSH and verified service-area governance.
const clientMapController = "services/dsh/frontend/shared/client-map/use-client-map-controller.ts";
for (const marker of ["searchDshClientMapLocations", "reverseDshClientMapLocation"]) {
  requireText(clientMapController, marker, `JRN006_MAP_CONTROLLER_BINDING_MISSING ${marker}`);
}
const clientMapApi = "services/dsh/frontend/shared/client-map/client-map.api.ts";
for (const marker of ["/dsh/client/maps/search", "/dsh/client/maps/reverse"]) {
  requireText(clientMapApi, marker, `JRN006_DSH_MAP_ROUTE_MISSING ${marker}`);
}
const clientMapHandler = "services/dsh/backend/internal/http/client_maps.go";
for (const marker of ["servicearea.Resolve", "ServiceAreaVerified"]) {
  requireText(clientMapHandler, marker, `JRN006_SERVICE_AREA_GOVERNANCE_MISSING ${marker}`);
}

// JRN-007 discovery must be scoped by the persisted selected address.
const discoveryScreen = "services/dsh/frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx";
for (const marker of ["useClientAddressController", "addressController.selectedAddress?.serviceAreaCode", 'addressController.state.kind === "ready"']) {
  requireText(discoveryScreen, marker, `JRN007_ADDRESS_SCOPED_DISCOVERY_MISSING ${marker}`);
}
const discoveryController = "services/dsh/frontend/shared/home-discovery/use-home-discovery-controller.tsx";
requireText(discoveryController, "fetchHomeDiscovery({ cityCode, serviceAreaCode, limit: 20 })", "JRN007_DISCOVERY_QUERY_SCOPE_MISSING");

// JRN-008 central catalog remains the only runtime catalog truth.
const dshRouter = "services/dsh/backend/internal/http/server.go";
for (const marker of ["GET /dsh/partner/catalog/taxonomy", "GET /dsh/partner/catalog/master-products"]) {
  requireText(dshRouter, marker, `JRN008_CENTRAL_CATALOG_ROUTE_MISSING ${marker}`);
}
const centralCatalogMigration = "services/dsh/database/migrations/dsh-036_central_catalog_runtime_closure.sql";
for (const marker of [
  "DROP TABLE IF EXISTS dsh_catalog_products",
  "DROP TABLE IF EXISTS dsh_catalog_categories",
  "INSERT INTO dsh_master_products",
  "INSERT INTO dsh_store_assortments",
]) {
  requireText(centralCatalogMigration, marker, `JRN008_CATALOG_CONSOLIDATION_MISSING ${marker}`);
}

// JRN-009 cart mutations must remain actor-owned and server-scoped.
const cartHandler = "services/dsh/backend/internal/http/cart.go";
for (const marker of ["cart.RemoveOwnedItem", "cart.ClearOwnedCart"]) {
  requireText(cartHandler, marker, `JRN009_OWNED_CART_MUTATION_MISSING ${marker}`);
}
forbidText(cartHandler, "cart.RemoveItem(r.Context(), s.db, cartID, itemID)", "JRN009_UNSCOPED_CART_REMOVE_FORBIDDEN");
const cartOwnership = "services/dsh/backend/internal/cart/ownership.go";
for (const marker of ["cart.client_id = $3", "WHERE id = $1 AND client_id = $2 AND state = 'active'"]) {
  requireText(cartOwnership, marker, `JRN009_CART_OWNERSHIP_QUERY_MISSING ${marker}`);
}

// JRN-010 checkout creation is idempotent from the client through DSH and WLT.
const checkoutAttempt = "services/dsh/frontend/shared/checkout/checkout-create-attempt.ts";
for (const marker of ["AsyncStorage", "fingerprintCheckoutInput", "getOrCreateCheckoutAttempt", "clearCheckoutAttempt"]) {
  requireText(checkoutAttempt, marker, `CHECKOUT_PERSISTED_ATTEMPT_MISSING ${marker}`);
}
const checkoutApi = "services/dsh/frontend/shared/checkout/checkout.api.ts";
for (const marker of ["DshCheckoutMutationContext", "idempotencyKey: mutation.idempotencyKey", "correlationId: mutation.correlationId"]) {
  requireText(checkoutApi, marker, `CHECKOUT_HTTP_IDEMPOTENCY_BINDING_MISSING ${marker}`);
}
const checkoutController = "services/dsh/frontend/shared/checkout/use-checkout-controller.tsx";
for (const marker of [
  "getOrCreateCheckoutAttempt",
  "createCheckoutIntent(input, attempt.context)",
  "clearCheckoutAttempt(attempt.fingerprint)",
  "reconcileLock.current",
  "reconcilingIntentId",
  "operatorReconcileMessage",
  "setReconcileError",
]) {
  requireText(checkoutController, marker, `CHECKOUT_CONTROLLER_RETRY_BINDING_MISSING ${marker}`);
}
const checkoutOperatorScreen = "services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx";
for (const marker of ["CpButton", "CpStatePanel", "WebStyleSheet.create", "disabled={reconciliationLocked}", "controller.reconcileError"]) {
  requireText(checkoutOperatorScreen, marker, `JRN010_OPERATOR_RECONCILIATION_UX_MISSING ${marker}`);
}
forbidText(checkoutOperatorScreen, '<button type="button" onClick={() => void onReconcile', "JRN010_RAW_UNGUARDED_RECONCILE_BUTTON_FORBIDDEN");
const checkoutMigration = "services/dsh/database/migrations/dsh-901_checkout_create_idempotency.sql";
for (const marker of ["dsh_checkout_create_idempotency", "PRIMARY KEY (tenant_id, client_id, idempotency_key)", "request_fingerprint", "checkout_intent_id"]) {
  requireText(checkoutMigration, marker, `CHECKOUT_IDEMPOTENCY_SCHEMA_MISSING ${marker}`);
}
const checkoutHandler = "services/dsh/backend/internal/http/checkout.go";
for (const marker of [
  'r.Header.Get("Idempotency-Key")',
  "LockCreateIdempotencyTx",
  "FindCreateIdempotencyTx",
  "BindCreateIdempotencyTx",
  "IDEMPOTENCY_KEY_REUSED",
  "AttachWltPaymentSessionIdempotent",
]) {
  requireText(checkoutHandler, marker, `CHECKOUT_BACKEND_IDEMPOTENCY_MISSING ${marker}`);
}
const checkoutSession = "services/dsh/backend/internal/checkout/wlt_session_idempotency.go";
for (const marker of ["AttachWltPaymentSessionIdempotent", "state = 'payment_pending' AND wlt_payment_session_id = $2", "ELSE version + 1"]) {
  requireText(checkoutSession, marker, `CHECKOUT_WLT_REPLAY_SAFETY_MISSING ${marker}`);
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

console.log("live-cross-journey-integrity-gate: JRN-001..JRN-010 scoped regression invariants");
console.log("live-cross-journey-integrity-gate: PASS does not prove full journey runtime, QA, security, finance, release, or production closure");
fail(guardId, violations);
