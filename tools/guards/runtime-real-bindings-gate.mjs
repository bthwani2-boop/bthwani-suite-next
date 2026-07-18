import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "runtime-real-bindings-gate";
const violations = [];

function exists(relative) {
  return fs.existsSync(path.join(repoRoot, relative));
}

function read(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, line: 0, message: "REQUIRED_FILE_MISSING" });
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function walk(relativeRoot, predicate, files = []) {
  const fullRoot = path.join(repoRoot, relativeRoot);
  if (!fs.existsSync(fullRoot)) return files;
  for (const entry of fs.readdirSync(fullRoot, { withFileTypes: true })) {
    if (["node_modules", "generated", "__generated__", "dist", "build", ".next"].includes(entry.name)) continue;
    const full = path.join(fullRoot, entry.name);
    const relative = toPosix(path.relative(repoRoot, full));
    if (entry.isDirectory()) walk(relative, predicate, files);
    else if (predicate(relative)) files.push(relative);
  }
  return files;
}

function requireMarkers(relative, markers) {
  const content = read(relative);
  for (const marker of markers) {
    if (!content.includes(marker)) {
      violations.push({ file: relative, line: 0, message: `REQUIRED_RUNTIME_BINDING_MARKER_MISSING ${marker}` });
    }
  }
  return content;
}

function verifyUniqueMigrationNumbers(relativeRoot, prefix) {
  const files = walk(relativeRoot, (file) => file.endsWith(".sql"));
  const byNumber = new Map();
  for (const file of files) {
    const name = path.basename(file);
    const match = name.match(new RegExp(`^${prefix}-(\\d{3})_[a-z0-9_]+\\.sql$`));
    if (!match) {
      violations.push({ file, line: 0, message: `INVALID_MIGRATION_FILENAME expected=${prefix}-NNN_snake_case.sql` });
      continue;
    }
    const previous = byNumber.get(match[1]);
    if (previous) {
      violations.push({ file, line: 0, message: `DUPLICATE_MIGRATION_NUMBER ${match[1]} previous=${previous}` });
    } else {
      byNumber.set(match[1], file);
    }
  }
}

const bindingFiles = [
  ...walk("services/dsh/frontend", (file) => /(?:\.api|\.transport|controller-core|use-[^/]+-controller)\.(?:ts|tsx)$/.test(file)),
  ...walk("services/wlt/frontend", (file) => /(?:\.api|\.transport|controller-core|use-[^/]+-controller)\.(?:ts|tsx)$/.test(file)),
];

const forbiddenPatterns = [
  { pattern: /return\s+null\s*;/g, message: "RUNTIME_CLIENT_STUB_RETURNS_NULL" },
  { pattern: /Fallback for preview|previewData|demoData|mockSuccess/gi, message: "PREVIEW_OR_DEMO_FALLBACK_IN_RUNTIME_BINDING" },
  { pattern: /Promise\.resolve\(\s*(?:\[|\{|null|undefined)/g, message: "IN_MEMORY_SUCCESS_PRESENTED_AS_RUNTIME_BINDING" },
  { pattern: /\bSEED_[A-Z0-9_]+\b|Seed data|In-memory store|When the real API is ready/gi, message: "SEEDED_OR_IN_MEMORY_RUNTIME_TRUTH_FORBIDDEN" },
  { pattern: /^let\s+_[A-Za-z0-9_]+\s*:\s*[^=]+\[\]\s*=/gm, message: "MODULE_LEVEL_MUTABLE_COLLECTION_FORBIDDEN" },
];

for (const file of [...new Set(bindingFiles)].sort()) {
  const content = read(file);
  for (const check of forbiddenPatterns) {
    for (const match of content.matchAll(check.pattern)) {
      violations.push({ file, line: lineNumber(content, match.index), message: check.message });
    }
  }
}

const retiredFakePaths = [
  "services/dsh/frontend/shared/marketing/use-loyalty-subscriptions-controller.ts",
  "services/dsh/frontend/shared/marketing/commercial-contract.ts",
  ".github/workflows/one-time-partner-detail-closure-bassam.yml",
  ".github/workflows/partner-domain-audit.yml",
  ".github/workflows/one-time-finance-workflow-toolchain-fix.yml",
  ".github/workflows/one-time-finance-accounting-closure.yml",
  "services/wlt/backend/internal/settlement/sovereign_settlement.go",
];
for (const file of retiredFakePaths) {
  if (exists(file)) violations.push({ file, line: 0, message: "RETIRED_FAKE_OR_DUPLICATE_PATH_REINTRODUCED" });
}

for (const workflowFile of walk(".github/workflows", (file) => /\.ya?ml$/.test(file))) {
  const content = fs.readFileSync(path.join(repoRoot, workflowFile), "utf8");
  if (/one-time/i.test(path.basename(workflowFile)) || /name:\s*one-time/i.test(content)) {
    violations.push({ file: workflowFile, line: 0, message: "ONE_TIME_WORKFLOW_FORBIDDEN" });
  }
  if (/\bcontents:\s*write\b|\bgit\s+(?:push|commit|rebase)\b/i.test(content)) {
    violations.push({ file: workflowFile, line: 0, message: "SOURCE_MUTATING_WORKFLOW_FORBIDDEN" });
  }
}

verifyUniqueMigrationNumbers("services/dsh/database/migrations", "dsh");
verifyUniqueMigrationNumbers("services/wlt/database/migrations", "wlt");

const clientSurfacePath = "services/dsh/frontend/app-client/DshClientSurface.tsx";
const clientSurface = read(clientSurfacePath);
for (const [pattern, message] of [
  [/description=["'][^"']*(?:ستتوفر قريب|قريباً)/g, "COMING_SOON_ROUTE_PRESENTED_AS_NAVIGATION"],
  [/tickerMessage=["']مباشر["']|tickerStatusLabel=["']مباشر["']/g, "HARDCODED_LIVE_TICKER_FORBIDDEN"],
  [/locationLabel=["'][^"']+["']/g, "HARDCODED_CLIENT_LOCATION_FORBIDDEN"],
]) {
  for (const match of clientSurface.matchAll(pattern)) {
    violations.push({ file: clientSurfacePath, line: lineNumber(clientSurface, match.index), message });
  }
}

requireMarkers(clientSurfacePath, ["BenefitsHubScreen", "onOpenBenefits", 'profileRoute === "benefits"']);
requireMarkers("services/dsh/frontend/app-client/account/BenefitsHubScreen.tsx", ["useClientBenefitsController", "controller.reload"]);
requireMarkers("services/dsh/frontend/shared/marketing/marketing.api.ts", [
  "/dsh/operator/marketing/loyalty-tiers",
  "/dsh/operator/marketing/subscription-plans",
  "/dsh/client/benefits",
]);
requireMarkers("services/dsh/frontend/shared/marketing/use-commercial-programs-controller.tsx", [
  "useLoyaltyTiersController",
  "useSubscriptionPlansController",
  "useClientBenefitsController",
]);
requireMarkers("services/dsh/frontend/control-panel/marketing/MarketingDashboardScreen.tsx", [
  "LoyaltyCommandDeck",
  "SubscriptionsCommandDeck",
]);
requireMarkers("services/dsh/contracts/dsh.marketing-commercial.openapi.yaml", [
  "/dsh/operator/marketing/loyalty-tiers:",
  "/dsh/operator/marketing/subscription-plans:",
  "/dsh/client/benefits:",
]);
requireMarkers("services/dsh/backend/internal/http/server.go", [
  '"GET /dsh/operator/marketing/loyalty-tiers"',
  '"POST /dsh/operator/marketing/subscription-plans"',
  '"GET /dsh/client/benefits"',
]);
requireMarkers("services/dsh/database/migrations/dsh-058_partner_commercial_programs.sql", [
  "dsh_loyalty_tiers",
  "dsh_subscription_plans",
]);
requireMarkers("services/dsh/database/migrations/dsh-063_marketing_commercial_program_guards.sql", [
  "dsh_guard_loyalty_tier_governance",
  "dsh_guard_subscription_plan_governance",
]);

requireMarkers("services/wlt/contracts/wlt.commercial.openapi.yaml", [
  "/wlt/commercial/products:",
  "/wlt/commercial/loyalty-entries:",
  "/wlt/commercial/subscriptions:",
]);
requireMarkers("services/wlt/backend/internal/http/server.go", [
  '"POST /wlt/commercial/products"',
  '"POST /wlt/commercial/loyalty-entries"',
  '"POST /wlt/commercial/subscriptions"',
]);
requireMarkers("services/wlt/database/migrations/wlt-028_commercial_benefits.sql", [
  "wlt_commercial_products",
  "wlt_loyalty_entries",
  "wlt_client_subscriptions",
]);

requireMarkers("services/dsh/frontend/shared/partner/partner-fleet.api.ts", [
  "/dsh/partner/stores/${storeId}/couriers/${memberId}/connection-code",
  "/dsh/captain/partner-fleet/connect",
  "/dsh/captain/partner-fleet/memberships",
]);
requireMarkers("services/dsh/frontend/app-captain/account/PartnerFleetConnectionCard.tsx", [
  "listCaptainPartnerFleetMemberships",
  "connectCaptainToPartnerFleet",
  "onMembershipStateChange",
]);
requireMarkers("services/dsh/contracts/dsh.partner-fleet.openapi.yaml", [
  "/dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code:",
  "/dsh/captain/partner-fleet/connect:",
  "/dsh/captain/partner-fleet/memberships:",
]);
requireMarkers("services/dsh/backend/internal/http/server.go", [
  '"POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code"',
  '"POST /dsh/captain/partner-fleet/connect"',
  '"GET /dsh/captain/partner-fleet/memberships"',
]);
requireMarkers("services/dsh/database/migrations/dsh-059_partner_courier_connection_codes.sql", [
  "dsh_partner_courier_connections",
]);

const marketingRegistryPath = "services/dsh/frontend/shared/marketing/marketing-registry.ts";
const marketingRegistry = read(marketingRegistryPath);
for (const [pattern, message] of [
  [/PARTNER_GATE_CARDS/g, "STATIC_PARTNER_GATE_FIXTURE_FORBIDDEN"],
  [/PRODUCT_GATE_CARDS/g, "STATIC_PRODUCT_GATE_FIXTURE_FORBIDDEN"],
  [/MARKETING_SECTION_TABS/g, "DEAD_MARKETING_SUBTAB_REGISTRY_FORBIDDEN"],
]) {
  for (const match of marketingRegistry.matchAll(pattern)) {
    violations.push({ file: marketingRegistryPath, line: lineNumber(marketingRegistry, match.index), message });
  }
}

const visibilityPath = "services/dsh/frontend/control-panel/marketing/components/VisibilityGatesSection.tsx";
const visibility = read(visibilityPath);
for (const [pattern, message] of [
  [/const\s+isBypassed\s*=\s*false/g, "FAKE_VISIBILITY_BYPASS_STATE_FORBIDDEN"],
  [/توقعات الظهور التجاري تقتصر على محاكاة/g, "SIMULATED_COMMERCIAL_VISIBILITY_COPY_FORBIDDEN"],
]) {
  for (const match of visibility.matchAll(pattern)) {
    violations.push({ file: visibilityPath, line: lineNumber(visibility, match.index), message });
  }
}

const captainSettingsPath = "services/dsh/frontend/app-captain/account/DshCaptainAccountSettingsContent.tsx";
const captainSettings = read(captainSettingsPath);
for (const match of captainSettings.matchAll(/eval\(["']require["']\)|RNSwitch/g)) {
  violations.push({ file: captainSettingsPath, line: lineNumber(captainSettings, match.index), message: "DYNAMIC_REACT_NATIVE_SWITCH_LOADING_FORBIDDEN" });
}

const dispatchPath = "services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx";
const dispatch = read(dispatchPath);
if (!/client\.assignCaptain\s*\(/.test(dispatch)) {
  violations.push({ file: dispatchPath, line: 0, message: "CRITICAL_DISPATCH_MUTATION_NOT_BOUND" });
}
if (/alternativesMap|Fallback for preview|'Preview'/.test(dispatch)) {
  violations.push({ file: dispatchPath, line: 0, message: "DISPATCH_SIMULATION_FALLBACK_FORBIDDEN" });
}

const mediaPath = "services/dsh/frontend/app-partner/catalog/ProductMediaScreen.tsx";
const media = read(mediaPath);
if (/متاح قريباً|disabled=\{isWorking \|\| Platform\.OS !== ['"]web['"]\}/.test(media)) {
  violations.push({ file: mediaPath, line: 0, message: "NATIVE_MEDIA_UPLOAD_PLACEHOLDER_FORBIDDEN" });
}

for (const packagePath of [
  "apps/app-client/runtime/package.json",
  "apps/app-partner/runtime/package.json",
  "apps/app-captain/runtime/package.json",
  "apps/app-field/runtime/package.json",
  "apps/control-panel/runtime/package.json",
]) {
  const content = read(packagePath);
  if (/\|\|\s*echo|Pre-existing TS errors ignored|continue-on-error/i.test(content)) {
    violations.push({ file: packagePath, line: 0, message: "RUNTIME_VALIDATION_FAILURE_SUPPRESSION_FORBIDDEN" });
  }
}

console.log(`runtime-real-bindings-gate: scanned ${bindingFiles.length} binding files for static anti-stub invariants`);
console.log("runtime-real-bindings-gate: PASS never means runtime smoke or production verification");
fail(guardId, violations);
