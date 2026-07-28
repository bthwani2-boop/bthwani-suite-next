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

function forbidInDirectory(relativeDir, extensions, pattern, message) {
  for (const file of walk(relativeDir, extensions)) {
    const content = read(file);
    for (const match of content.matchAll(pattern)) {
      violations.push({ file, line: lineNumber(content, match.index), message });
    }
  }
}

// partner-tenant — governed partner onboarding and store publication truth.
const partnerTruth = "governance/product/contracts/partner-onboarding-store-publication.product-truth.json";
for (const marker of ["partner-tenant", "app-field", "app-partner", "control-panel"]) {
  requireText(partnerTruth, marker, `PRODUCT_TRUTH_MISSING ${marker}`);
}
const partnerRuntime = "services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts";
for (const marker of ["partner", "store", "readiness", "activation"]) {
  requireText(partnerRuntime, marker, `SHARED_RUNTIME_MISSING ${marker}`);
}
const partnerIntegrity = "services/dsh/backend/internal/partner/onboarding_integrity_handlers.go";
for (const marker of ["Partner", "Store", "Readiness"]) {
  requireText(partnerIntegrity, marker, `BACKEND_INTEGRITY_MISSING ${marker}`);
}

// domain-002 — identity, activation, sessions, and fail-closed browser boundaries.
const identityStore = "core/identity/clients/identity-session-store.ts";
for (const marker of ["isValidActorIdentity", "restoreStoredSession", "identityClient.session", "identityClient.refresh", "IDENTITY_SESSION_INVALID"]) {
  requireText(identityStore, marker, `SESSION_INVARIANT_MISSING ${marker}`);
}
for (const forbidden of ['action: "*"', "devBypassLogin", "resolveDevBypassIdentity", "DEV_BYPASS_DISABLED"]) {
  forbidText(identityStore, forbidden, `BYPASS_OR_WILDCARD_FORBIDDEN ${forbidden}`);
}
forbidInDirectory("services/dsh/frontend", [".ts", ".tsx"], /devBypassLogin/g, "FRONTEND_DEVELOPER_BYPASS_FORBIDDEN");
forbidInDirectory("services/dsh/frontend/control-panel", [".ts", ".tsx"], /useIdentitySession/g, "CONTROL_PANEL_LEGACY_SESSION_HOOK_FORBIDDEN");

const authContract = "core/identity/contracts/identity.openapi.yaml";
requireText(authContract, "minLength: 6", "PASSWORD_CONTRACT_MINIMUM_MISSING");
const identityRepository = "core/identity/backend/internal/identity/repository.go";
for (const marker of ["len(input.Password) < 6", "loginLockoutThreshold", "identity_login_attempts"]) {
  requireText(identityRepository, marker, `IDENTITY_REPOSITORY_INVARIANT_MISSING ${marker}`);
}
forbidText(identityRepository, "len(input.Password) < 4", "STALE_PASSWORD_MINIMUM_FORBIDDEN");
const identityServer = "core/identity/backend/internal/http/server.go";
requireText(identityServer, "IDENTITY_CORS_ALLOWED_ORIGINS", "CORS_ENV_ALLOWLIST_MISSING");
forbidText(identityServer, 'origin == "http://localhost:13000"', "HARDCODED_CORS_ORIGIN_FORBIDDEN");
const identityMain = "core/identity/backend/cmd/identity-api/main.go";
for (const marker of ["BrowserOriginGuard", "CorsMiddleware", "ActivationSafetyMiddleware", "IDENTITY_LOCAL_BOOTSTRAP"]) {
  requireText(identityMain, marker, `RUNTIME_SAFETY_MISSING ${marker}`);
}
forbidText(identityMain, "BrowserCorsMiddleware", "STALE_BROWSER_CORS_NAME_FORBIDDEN");
const identityBrowserCors = "core/identity/backend/internal/http/browser_cors.go";
for (const marker of ["BrowserOriginGuard", "CORS_ORIGIN_FORBIDDEN", "allowedCorsOrigins"]) {
  requireText(identityBrowserCors, marker, `BROWSER_CORS_SAFETY_MISSING ${marker}`);
}
forbidText(identityBrowserCors, "Access-Control-Allow-Methods", "BROWSER_CORS_MUST_NOT_DUPLICATE_RESPONSE_HEADERS");

// workforce — workforce routes and mutation safety remain mounted.
const workforceMain = "core/workforce/backend/cmd/workforce-api/main.go";
for (const marker of ["ActivationMutationSafetyMiddleware", "CorsMiddleware", "WORKFORCE_IDENTITY_BASE_URL", "WORKFORCE_DSH_BASE_URL"]) {
  requireText(workforceMain, marker, `RUNTIME_BINDING_MISSING ${marker}`);
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
  requireText(workforceRoutesTest, marker, `ROUTE_PROOF_MISSING ${marker}`);
}

// governance and address-mutation — store discovery and client address routes remain governed.
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
  requireText(firstFiveRoutesTest, marker, `005_ROUTE_PROOF_MISSING ${marker}`);
}
const addressAttempt = "services/dsh/frontend/shared/client-address/client-address-create-attempt.ts";
for (const marker of ["AsyncStorage", "fingerprintClientAddressDraft", "getOrCreateClientAddressAttempt", "clearClientAddressAttempt"]) {
  requireText(addressAttempt, marker, `PERSISTED_ATTEMPT_MISSING ${marker}`);
}
const addressController = "services/dsh/frontend/shared/client-address/use-client-address-controller.ts";
for (const marker of ["getOrCreateClientAddressAttempt", "clearClientAddressAttempt", "attempt.context", "attempt.fingerprint"]) {
  requireText(addressController, marker, `CONTROLLER_RETRY_BINDING_MISSING ${marker}`);
}
forbidText(addressController, "createAttempt = useRef", "MEMORY_ONLY_RETRY_FORBIDDEN");

// address-topology — map calls stay behind DSH and verified service-area governance.
const clientMapController = "services/dsh/frontend/shared/client-map/use-client-map-controller.ts";
for (const marker of ["searchDshClientMapLocations", "reverseDshClientMapLocation"]) {
  requireText(clientMapController, marker, `MAP_CONTROLLER_BINDING_MISSING ${marker}`);
}
const clientMapApi = "services/dsh/frontend/shared/client-map/client-map.api.ts";
for (const marker of ["/dsh/client/maps/search", "/dsh/client/maps/reverse"]) {
  requireText(clientMapApi, marker, `DSH_MAP_ROUTE_MISSING ${marker}`);
}
const clientMapHandler = "services/dsh/backend/internal/http/client_maps.go";
for (const marker of ["servicearea.Resolve", "ServiceAreaVerified"]) {
  requireText(clientMapHandler, marker, `SERVICE_AREA_GOVERNANCE_MISSING ${marker}`);
}

// domain-007 — discovery is scoped by the persisted selected address.
const discoveryScreen = "services/dsh/frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx";
for (const marker of ["useClientAddressController", "addressController.selectedAddress?.serviceAreaCode", 'addressController.state.kind === "ready"']) {
  requireText(discoveryScreen, marker, `ADDRESS_SCOPED_DISCOVERY_MISSING ${marker}`);
}
const discoveryController = "services/dsh/frontend/shared/home-discovery/use-home-discovery-controller.tsx";
for (const marker of ["fetchHomeDiscovery({", "serviceAreaCode", "limit: 20"]) {
  requireText(discoveryController, marker, `DISCOVERY_QUERY_SCOPE_MISSING ${marker}`);
}

// catalog — central catalog ownership is registered at its canonical route extension point.
const dshRouter = "services/dsh/backend/internal/http/server.go";
requireText(dshRouter, "registerUnifiedCatalogRoutes(mux, protected)", "UNIFIED_ROUTE_REGISTRATION_MISSING");
const catalogRoutes = "services/dsh/backend/internal/http/catalog_unified_routes.go";
for (const marker of [
  "GET /dsh/partner/catalog/taxonomy",
  "GET /dsh/operator/catalog/master-products",
  "GET /dsh/partner/stores/{storeId}/assortment",
]) {
  requireText(catalogRoutes, marker, `CENTRAL_CATALOG_ROUTE_MISSING ${marker}`);
}
const centralCatalogMigration = "services/dsh/database/migrations/dsh-036_central_catalog_runtime_closure.sql";
for (const marker of [
  "DROP TABLE IF EXISTS dsh_catalog_products",
  "DROP TABLE IF EXISTS dsh_catalog_categories",
  "INSERT INTO dsh_master_products",
  "INSERT INTO dsh_store_assortments",
]) {
  requireText(centralCatalogMigration, marker, `CATALOG_CONSOLIDATION_MISSING ${marker}`);
}

// cart — cart mutations remain actor-owned and server-scoped.
const cartHandler = "services/dsh/backend/internal/http/cart.go";
for (const marker of ["cart.RemoveOwnedItem", "cart.ClearOwnedCart"]) {
  requireText(cartHandler, marker, `OWNED_CART_MUTATION_MISSING ${marker}`);
}
forbidText(cartHandler, "cart.RemoveItem(r.Context(), s.db, cartID, itemID)", "UNSCOPED_CART_REMOVE_FORBIDDEN");
const cartOwnership = "services/dsh/backend/internal/cart/ownership.go";
for (const marker of ["cart.client_id = $3", "WHERE id = $1 AND client_id = $2 AND state = 'active'"]) {
  requireText(cartOwnership, marker, `CART_OWNERSHIP_QUERY_MISSING ${marker}`);
}

// wlt-receipts — checkout retries and operator reconciliation are idempotent and visible.
const checkoutAttempt = "services/dsh/frontend/shared/checkout/checkout-create-attempt.ts";
for (const marker of ["AsyncStorage", "fingerprintCheckoutInput", "getOrCreateCheckoutAttempt", "clearCheckoutAttempt"]) {
  requireText(checkoutAttempt, marker, `PERSISTED_ATTEMPT_MISSING ${marker}`);
}
const checkoutApi = "services/dsh/frontend/shared/checkout/checkout.api.ts";
for (const marker of ["DshCheckoutMutationContext", "idempotencyKey: mutation.idempotencyKey", "correlationId: mutation.correlationId"]) {
  requireText(checkoutApi, marker, `HTTP_IDEMPOTENCY_BINDING_MISSING ${marker}`);
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
  requireText(checkoutController, marker, `CONTROLLER_INVARIANT_MISSING ${marker}`);
}
const checkoutOperatorScreen = "services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx";
for (const marker of ["CpButton", "CpStatePanel", "WebStyleSheet.create", "disabled={reconciliationLocked}", "controller.reconcileError"]) {
  requireText(checkoutOperatorScreen, marker, `OPERATOR_RECONCILIATION_UX_MISSING ${marker}`);
}
forbidText(checkoutOperatorScreen, '<button type="button" onClick={() => void onReconcile', "RAW_UNGUARDED_RECONCILE_BUTTON_FORBIDDEN");
const checkoutMigration = "services/dsh/database/migrations/dsh-901_checkout_create_idempotency.sql";
for (const marker of ["dsh_checkout_create_idempotency", "PRIMARY KEY (tenant_id, client_id, idempotency_key)", "request_fingerprint", "checkout_intent_id"]) {
  requireText(checkoutMigration, marker, `IDEMPOTENCY_SCHEMA_MISSING ${marker}`);
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
  requireText(checkoutHandler, marker, `BACKEND_IDEMPOTENCY_MISSING ${marker}`);
}
const checkoutSession = "services/dsh/backend/internal/checkout/wlt_session_idempotency.go";
for (const marker of ["AttachWltPaymentSessionIdempotent", "state = 'payment_pending' AND wlt_payment_session_id = $2", "ELSE version + 1"]) {
  requireText(checkoutSession, marker, `WLT_REPLAY_SAFETY_MISSING ${marker}`);
}

// The journey guard owns journey invariants only. Workflow topology is enforced
// separately by guard-registry and workflow-security; it must not depend on one
// legacy workflow filename.
const journeyGate = "tools/scripts/run-journey-gate.ps1";
requireText(journeyGate, "[switch]$Full", "JOURNEY_GATE_EXPLICIT_FULL_SWITCH_MISSING");
requireText(journeyGate, "if ($Full)", "JOURNEY_GATE_TARGETED_DEFAULT_MISSING");
forbidText(journeyGate, "$runFull = $true", "JOURNEY_GATE_MUST_NOT_FORCE_FULL_BY_DEFAULT");
const packageJson = JSON.parse(read("package.json"));
const journeyCommand = packageJson.scripts?.["journey:gate"] ?? "";
if (!journeyCommand) violations.push({ file: "package.json", line: 0, message: "JOURNEY_GATE_SCRIPT_MISSING" });
if (journeyCommand.includes("-Soft")) violations.push({ file: "package.json", line: 0, message: "JOURNEY_GATE_SOFT_FAILURE_FORBIDDEN" });

console.log("live-cross-journey-integrity-gate: partner-tenant..wlt-receipts scoped regression invariants");
console.log("live-cross-journey-integrity-gate: PASS is static evidence only and does not imply runtime, QA, security, finance, release, or production closure");
fail(guardId, violations);
