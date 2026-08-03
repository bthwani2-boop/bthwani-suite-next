import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const packageRoot = path.join(
  repoRoot,
  "governance/operational_journey_protocol_package/smsm-dsh-wlt-journeys"
);
const registryPath = path.join(
  packageRoot,
  "08-control-panel-coverage/CONTROL-PANEL-SECTION-REGISTRY.json"
);
const navigationPath = path.join(
  repoRoot,
  "services/dsh/frontend/control-panel/navigation.ts"
);
const appRoot = path.join(repoRoot, "apps/control-panel/runtime/src/app");
const violations = [];

function fail(file, message) {
  violations.push(`${path.relative(repoRoot, file)}: ${message}`);
}

function walk(root, predicate) {
  if (!fs.existsSync(root)) return [];
  const results = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) results.push(...walk(full, predicate));
    else if (predicate(full)) results.push(full);
  }
  return results;
}

function parseJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(file, `INVALID_JSON ${error.message}`);
    return undefined;
  }
}

function expectedJourneyIds() {
  return Array.from({ length: 107 }, (_, index) => `J${String(index + 1).padStart(3, "0")}`);
}

function expandJourneyToken(token) {
  const range = /^J(\d{3})\.\.J(\d{3})$/.exec(token);
  if (!range) return /^J\d{3}$/.test(token) ? [token] : [];
  const start = Number(range[1]);
  const end = Number(range[2]);
  if (start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => `J${String(start + index).padStart(3, "0")}`);
}

function routeFromPage(file) {
  const relative = path.relative(appRoot, path.dirname(file));
  const segments = relative
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .filter((segment) => !segment.startsWith("@"));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function checkJourneyDocuments() {
  const files = walk(packageRoot, (file) => /^J\d{3}\.md$/.test(path.basename(file))).sort();
  const expected = expectedJourneyIds();
  const actual = files.map((file) => path.basename(file, ".md"));

  if (files.length !== 107) fail(packageRoot, `EXPECTED_107_JOURNEYS found=${files.length}`);
  for (const id of expected) {
    const count = actual.filter((value) => value === id).length;
    if (count !== 1) fail(packageRoot, `JOURNEY_ID_COUNT ${id} count=${count}`);
  }

  const requiredPatterns = [
    [/(?:##\s+[^\n]*(?:الحالة الحالية|تشخيص الحالة الحالية))/, "CURRENT_STATE_SECTION_MISSING"],
    [/الموجود/, "EXISTING_STATE_MISSING"],
    [/(?:الناقص|غير المثبت)/, "MISSING_STATE_MISSING"],
    [/(?:الخاطئ|الممنوع)/, "WRONG_STATE_MISSING"],
    [/التصحيح/, "CORRECTION_PLAN_MISSING"],
    [/(?:الإضافات|إضافة)/, "ADDITIONS_PLAN_MISSING"],
    [/(?:##\s+[^\n]*الاختبارات)/, "AUTOMATED_TEST_SECTION_MISSING"],
    [/(?:##\s+[^\n]*التجريب اليدوي)/, "MANUAL_TEST_SECTION_MISSING"],
    [/(?:##\s+[^\n]*(?:الإغلاق|بوابة الإغلاق))/, "CLOSURE_GATE_MISSING"],
    [/surfaces:\s*\[/, "SURFACES_METADATA_MISSING"],
    [/dependencies:\s*\[/, "DEPENDENCIES_METADATA_MISSING"]
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (content.length < 1500) fail(file, `JOURNEY_DOCUMENT_TOO_SHORT length=${content.length}`);
    for (const [pattern, message] of requiredPatterns) {
      if (!pattern.test(content)) fail(file, message);
    }
    if (/surfaces:\s*\[[^\]]*control-panel[^\]]*\]/.test(content) && !/(?:Control Panel|لوحة التحكم)/.test(content)) {
      fail(file, "CONTROL_PANEL_SURFACE_WITHOUT_DETAILED_SECTION");
    }
  }
}

function checkControlPanelRegistry() {
  const registry = parseJson(registryPath);
  if (!registry) return;

  const navigation = fs.existsSync(navigationPath) ? fs.readFileSync(navigationPath, "utf8") : "";
  if (!navigation) fail(navigationPath, "NAVIGATION_SOURCE_MISSING");
  const navEntries = [...navigation.matchAll(/\{\s*section:\s*"([^"]+)"[^}]*route:\s*"([^"]+)"\s*\}/g)]
    .map((match) => ({ id: match[1], route: match[2] }));

  const sections = Array.isArray(registry.sections) ? registry.sections : [];
  const byId = new Map();
  for (const section of sections) {
    if (!section?.id || byId.has(section.id)) {
      fail(registryPath, `INVALID_OR_DUPLICATE_SECTION ${section?.id ?? "MISSING"}`);
      continue;
    }
    byId.set(section.id, section);
    for (const field of ["label", "canonicalRoute", "purpose"]) {
      if (!section[field]) fail(registryPath, `SECTION_FIELD_MISSING ${section.id}.${field}`);
    }
    for (const field of ["routes", "capabilities", "journeyCoverage"]) {
      if (!Array.isArray(section[field]) || section[field].length === 0) {
        fail(registryPath, `SECTION_ARRAY_EMPTY ${section.id}.${field}`);
      }
    }
    if (!section.routes?.includes(section.canonicalRoute)) {
      fail(registryPath, `CANONICAL_ROUTE_NOT_REGISTERED ${section.id}`);
    }
  }

  if (sections.length !== navEntries.length) {
    fail(registryPath, `NAV_SECTION_COUNT_MISMATCH registry=${sections.length} navigation=${navEntries.length}`);
  }
  for (const entry of navEntries) {
    const section = byId.get(entry.id);
    if (!section) fail(registryPath, `NAV_SECTION_UNREGISTERED ${entry.id}`);
    else if (section.canonicalRoute !== entry.route) {
      fail(registryPath, `NAV_ROUTE_DRIFT ${entry.id} registry=${section.canonicalRoute} navigation=${entry.route}`);
    }
  }
  for (const section of sections) {
    if (!navEntries.some((entry) => entry.id === section.id)) fail(registryPath, `REGISTRY_SECTION_NOT_IN_NAVIGATION ${section.id}`);
  }

  const registeredRoutes = new Map();
  for (const section of sections) {
    for (const route of section.routes ?? []) {
      if (registeredRoutes.has(route)) fail(registryPath, `ROUTE_REGISTERED_TWICE ${route}`);
      registeredRoutes.set(route, section.id);
    }
  }
  for (const item of registry.nonNavigationRoutes ?? []) {
    if (!item?.route) fail(registryPath, "NON_NAVIGATION_ROUTE_MISSING_ROUTE");
    else if (registeredRoutes.has(item.route)) fail(registryPath, `ROUTE_REGISTERED_TWICE ${item.route}`);
    else registeredRoutes.set(item.route, item.classification ?? "non-navigation");
  }

  const pageFiles = walk(appRoot, (file) => path.basename(file) === "page.tsx");
  const actualRoutes = pageFiles.map(routeFromPage).sort();
  const duplicateActualRoutes = actualRoutes.filter((route, index) => actualRoutes.indexOf(route) !== index);
  for (const route of new Set(duplicateActualRoutes)) fail(appRoot, `DUPLICATE_NEXT_ROUTE ${route}`);

  for (const route of actualRoutes) {
    if (!registeredRoutes.has(route)) fail(registryPath, `UNREGISTERED_NEXT_ROUTE ${route}`);
  }
  for (const route of registeredRoutes.keys()) {
    if (!actualRoutes.includes(route)) fail(registryPath, `REGISTERED_ROUTE_WITHOUT_PAGE ${route}`);
  }

  const requiredStates = new Set(registry.requiredStates ?? []);
  const requiredControls = new Set(registry.requiredControlClasses ?? []);
  const requiredScenarios = new Set(registry.requiredManualScenarios ?? []);
  for (const required of ["loading", "ready", "empty", "error", "forbidden", "stale", "conflict", "unknown-result"]) {
    if (!requiredStates.has(required)) fail(registryPath, `REQUIRED_STATE_MISSING ${required}`);
  }
  for (const required of ["navigation", "tabs", "search", "filters", "sorting", "pagination", "tables-or-lists", "forms", "buttons", "icons", "dialogs", "state-panels", "audit-links"]) {
    if (!requiredControls.has(required)) fail(registryPath, `REQUIRED_CONTROL_CLASS_MISSING ${required}`);
  }
  for (const required of ["authorized-happy-path", "missing-permission", "object-outside-scope", "stale-version-conflict", "duplicate-submit", "response-lost-after-commit", "dependency-unavailable-and-recovery", "keyboard-screen-reader-rtl-large-text"]) {
    if (!requiredScenarios.has(required)) fail(registryPath, `REQUIRED_MANUAL_SCENARIO_MISSING ${required}`);
  }

  const coveredJourneys = new Set();
  for (const section of sections) {
    for (const token of section.journeyCoverage ?? []) {
      const expanded = expandJourneyToken(token);
      if (expanded.length === 0) fail(registryPath, `INVALID_JOURNEY_COVERAGE_TOKEN ${section.id}:${token}`);
      for (const id of expanded) coveredJourneys.add(id);
    }
  }
  for (const id of expectedJourneyIds()) {
    if (!coveredJourneys.has(id)) fail(registryPath, `JOURNEY_NOT_MAPPED_TO_CONTROL_PANEL ${id}`);
  }
}

checkJourneyDocuments();
checkControlPanelRegistry();

if (violations.length > 0) {
  console.error("SMSM journey coverage check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("SMSM journey coverage check passed: 107 journeys, navigation sections, Next routes, states, controls, and manual scenarios are structurally mapped.");
