import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "runtime-real-bindings-gate";
const violations = [];

function read(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, line: 0, message: "REQUIRED_FILE_MISSING" });
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function exists(relative) {
  return fs.existsSync(path.join(repoRoot, relative));
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

const forbiddenRemovedPaths = [
  "services/dsh/frontend/shared/marketing/use-loyalty-subscriptions-controller.ts",
  "services/dsh/frontend/shared/marketing/use-commercial-programs-controller.ts",
  "services/dsh/frontend/shared/marketing/loyalty-subscriptions.types.ts",
  "services/dsh/frontend/control-panel/marketing/components/LoyaltyCommandDeck.tsx",
  "services/dsh/frontend/control-panel/marketing/components/SubscriptionsCommandDeck.tsx",
  "services/dsh/frontend/app-client/account/BenefitsHubScreen.tsx",
  "services/dsh/frontend/shared/marketing/commercial-contract.ts",
  "services/dsh/frontend/shared/partner/partner-fleet.api.ts",
  ".github/workflows/one-time-partner-detail-closure-bassam.yml",
  ".github/workflows/partner-domain-audit.yml",
  ".github/workflows/one-time-finance-workflow-toolchain-fix.yml",
  ".github/workflows/one-time-finance-accounting-closure.yml",
];
for (const file of forbiddenRemovedPaths) {
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

const clientSurfacePath = "services/dsh/frontend/app-client/DshClientSurface.tsx";
const clientSurface = read(clientSurfacePath);
for (const [pattern, message] of [
  [/BenefitsHubScreen|onOpenBenefits|subroute\s*===\s*["']benefits["']/g, "UNBOUND_BENEFITS_ROUTE_REINTRODUCED"],
  [/description=["'][^"']*(?:ستتوفر قريب|قريباً)/g, "COMING_SOON_ROUTE_PRESENTED_AS_NAVIGATION"],
  [/tickerMessage=["']مباشر["']|tickerStatusLabel=["']مباشر["']/g, "HARDCODED_LIVE_TICKER_FORBIDDEN"],
  [/locationLabel=["'][^"']+["']/g, "HARDCODED_CLIENT_LOCATION_FORBIDDEN"],
]) {
  for (const match of clientSurface.matchAll(pattern)) {
    violations.push({ file: clientSurfacePath, line: lineNumber(clientSurface, match.index), message });
  }
}

const marketingApiPath = "services/dsh/frontend/shared/marketing/marketing.api.ts";
const marketingApi = read(marketingApiPath);
for (const [pattern, message] of [
  [/\/dsh\/operator\/marketing\/loyalty-tiers/g, "UNREGISTERED_LOYALTY_ROUTE_CLIENT_FORBIDDEN"],
  [/\/dsh\/operator\/marketing\/subscription-plans/g, "UNREGISTERED_SUBSCRIPTION_ROUTE_CLIENT_FORBIDDEN"],
  [/\/dsh\/client\/benefits/g, "UNREGISTERED_CLIENT_BENEFITS_ROUTE_FORBIDDEN"],
]) {
  for (const match of marketingApi.matchAll(pattern)) {
    violations.push({ file: marketingApiPath, line: lineNumber(marketingApi, match.index), message });
  }
}

const marketingRegistryPath = "services/dsh/frontend/shared/marketing/marketing-registry.ts";
const marketingRegistry = read(marketingRegistryPath);
for (const [pattern, message] of [
  [/PARTNER_GATE_CARDS/g, "STATIC_PARTNER_GATE_FIXTURE_FORBIDDEN"],
  [/PRODUCT_GATE_CARDS/g, "STATIC_PRODUCT_GATE_FIXTURE_FORBIDDEN"],
  [/MARKETING_SECTION_TABS/g, "DEAD_MARKETING_SUBTAB_REGISTRY_FORBIDDEN"],
  [/["']loyalty["']/g, "UNBOUND_LOYALTY_TAB_FORBIDDEN"],
  [/["']subscriptions["']/g, "UNBOUND_SUBSCRIPTION_TAB_FORBIDDEN"],
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
for (const [pattern, message] of [
  [/connectCaptainToPartnerFleet|listCaptainPartnerFleetMemberships/g, "UNREGISTERED_CAPTAIN_FLEET_CLIENT_FORBIDDEN"],
  [/eval\(["']require["']\)|RNSwitch/g, "DYNAMIC_REACT_NATIVE_SWITCH_LOADING_FORBIDDEN"],
]) {
  for (const match of captainSettings.matchAll(pattern)) {
    violations.push({ file: captainSettingsPath, line: lineNumber(captainSettings, match.index), message });
  }
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
