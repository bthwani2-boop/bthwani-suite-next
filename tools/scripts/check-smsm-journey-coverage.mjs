import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const packageRoot = path.join(
  repoRoot,
  "governance/operational_journey_protocol_package/smsm-dsh-wlt-journeys"
);
const controlPanelCoverageRoot = path.join(packageRoot, "08-control-panel-coverage");
const registryPath = path.join(
  controlPanelCoverageRoot,
  "CONTROL-PANEL-SECTION-REGISTRY.json"
);
const sectionDocsRoot = path.join(controlPanelCoverageRoot, "sections");
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

function parseInlineList(content, key) {
  const match = new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, "m").exec(content);
  if (!match) return undefined;
  if (!match[1].trim()) return [];
  return match[1]
    .split(",")
    .map((value) => value.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function expectedJourneyIds() {
  return Array.from(
    { length: 107 },
    (_, index) => `J${String(index + 1).padStart(3, "0")}`
  );
}

function expandJourneyToken(token) {
  const range = /^J(\d{3})\.\.J(\d{3})$/.exec(token);
  if (!range) return /^J\d{3}$/.test(token) ? [token] : [];
  const start = Number(range[1]);
  const end = Number(range[2]);
  if (start > end) return [];
  return Array.from(
    { length: end - start + 1 },
    (_, index) => `J${String(start + index).padStart(3, "0")}`
  );
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

function buildSectionMap(registry) {
  const map = new Map();
  for (const section of registry?.sections ?? []) {
    if (section?.id) map.set(section.id, section);
  }
  return map;
}

function checkJourneyControlPanelContract(file, content, sectionMap) {
  const surfaces = parseInlineList(content, "surfaces");
  const declaredSections = parseInlineList(content, "control_panel_sections");
  const hasControlPanel = surfaces?.includes("control-panel") ?? false;

  if (!hasControlPanel) {
    if (declaredSections !== undefined && declaredSections.length > 0) {
      fail(file, "CONTROL_PANEL_SECTIONS_DECLARED_WITHOUT_CONTROL_PANEL_SURFACE");
    }
    return;
  }

  if (declaredSections === undefined) {
    fail(file, "CONTROL_PANEL_SECTIONS_METADATA_MISSING");
    return;
  }
  if (declaredSections.length === 0) {
    fail(file, "CONTROL_PANEL_SECTIONS_EMPTY");
    return;
  }

  const duplicateSections = declaredSections.filter(
    (value, index) => declaredSections.indexOf(value) !== index
  );
  for (const sectionId of new Set(duplicateSections)) {
    fail(file, `DUPLICATE_CONTROL_PANEL_SECTION ${sectionId}`);
  }

  const forbiddenGenericToken = /^(?:all(?:[_-].*)?|stores?|audit|control[-_]?panel|sections?|\*)$/i;
  for (const sectionId of declaredSections) {
    if (forbiddenGenericToken.test(sectionId)) {
      fail(file, `GENERIC_OR_NON_NAVIGATION_SECTION_TOKEN ${sectionId}`);
      continue;
    }
    if (!sectionMap.has(sectionId)) {
      fail(file, `UNKNOWN_CONTROL_PANEL_SECTION ${sectionId}`);
    }
  }

  if (!/^##\s+[^\n]*(?:أقسام|مصفوفة|تغطية|إغلاق)[^\n]*لوحة التحكم|^##\s+[^\n]*لوحة التحكم[^\n]*(?:أقسام|مصفوفة|تغطية|إغلاق)/m.test(content)) {
    fail(file, "CONTROL_PANEL_SECTION_MATRIX_HEADING_MISSING");
  }

  const detailRequirements = [
    [/(?:الصفحة|التبويب|المسار|routes?)/i, "CONTROL_PANEL_PAGE_OR_TAB_DETAIL_MISSING"],
    [/(?:التحكمات|الأزرار|controls?|actions?)/i, "CONTROL_PANEL_CONTROLS_DETAIL_MISSING"],
    [/(?:الحالات|الصلاحيات|permissions?)/i, "CONTROL_PANEL_STATES_OR_PERMISSIONS_MISSING"],
    [/(?:الاختبار|التجريب اليدوي|manual)/i, "CONTROL_PANEL_MANUAL_TEST_DETAIL_MISSING"]
  ];
  for (const [pattern, message] of detailRequirements) {
    if (!pattern.test(content)) fail(file, message);
  }

  for (const sectionId of declaredSections) {
    const section = sectionMap.get(sectionId);
    if (!section) continue;
    const routes = Array.isArray(section.routes) ? section.routes : [];
    if (!routes.some((route) => content.includes(route))) {
      fail(file, `DECLARED_SECTION_WITHOUT_REGISTERED_ROUTE ${sectionId}`);
    }
  }
}

function checkJourneyDocuments(registry) {
  const sectionMap = buildSectionMap(registry);
  const files = walk(
    packageRoot,
    (file) => /^J\d{3}\.md$/.test(path.basename(file))
  ).sort();
  const expected = expectedJourneyIds();
  const actual = files.map((file) => path.basename(file, ".md"));

  if (files.length !== 107) {
    fail(packageRoot, `EXPECTED_107_JOURNEYS found=${files.length}`);
  }
  for (const id of expected) {
    const count = actual.filter((value) => value === id).length;
    if (count !== 1) fail(packageRoot, `JOURNEY_ID_COUNT ${id} count=${count}`);
  }

  const requiredPatterns = [
    [/(?:##\s+[^\n]*(?:الحالة الحالية|تشخيص الحالة الحالية|التشخيص))/, "CURRENT_STATE_SECTION_MISSING"],
    [/(?:الموجود|موجود|مثبت|الحالي|توجد|يوجد)/, "EXISTING_STATE_MISSING"],
    [/(?:الناقص|غير مثبت|غير المثبت|يلزم|يحتاج|المطلوب إثبات|التشخيص المطلوب|المطلوب|غير موثق|غير مكتمل)/, "MISSING_STATE_MISSING"],
    [/(?:الخاطئ|الممنوع|الخطر|مخاطر|لا يجوز|يمنع|بلا|دون)/, "WRONG_STATE_MISSING"],
    [/(?:التصحيح|المطلوب|يجب|توحيد|إزالة|إنشاء|تطبيق)/, "CORRECTION_PLAN_MISSING"],
    [/(?:الإضافات|إضافة|تشخيص|diagnostic|metrics|history|audit|runbook|reconciliation)/i, "ADDITIONS_PLAN_MISSING"],
    [/(?:##\s+[^\n]*الاختبارات)/, "AUTOMATED_TEST_SECTION_MISSING"],
    [/(?:##\s+[^\n]*(?:التجريب اليدوي|التجريب)|(?:اختبر|جرّب|نفّذ))/, "MANUAL_TEST_SECTION_MISSING"],
    [/(?:##\s+[^\n]*(?:الإغلاق|بوابة الإغلاق))/, "CLOSURE_GATE_MISSING"],
    [/surfaces:\s*\[/, "SURFACES_METADATA_MISSING"],
    [/dependencies:\s*\[/, "DEPENDENCIES_METADATA_MISSING"]
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (content.length < 1500) {
      fail(file, `JOURNEY_DOCUMENT_TOO_SHORT length=${content.length}`);
    }
    for (const [pattern, message] of requiredPatterns) {
      if (!pattern.test(content)) fail(file, message);
    }
    checkJourneyControlPanelContract(file, content, sectionMap);
  }
}

function checkSectionDocuments(registry) {
  const sections = Array.isArray(registry?.sections) ? registry.sections : [];
  const actualFiles = walk(sectionDocsRoot, (file) => file.endsWith(".md"));
  if (actualFiles.length !== sections.length) {
    fail(
      sectionDocsRoot,
      `SECTION_DOCUMENT_COUNT_MISMATCH expected=${sections.length} actual=${actualFiles.length}`
    );
  }

  const requiredHeadings = [
    "## النتيجة النهائية",
    "## Routes والصفحات",
    "## الصفحات والتبويبات",
    "## التحكمات والأزرار والأيقونات",
    "## الحالات والصلاحيات",
    "## العقود والبيانات والملكية",
    "## الاختبارات الآلية",
    "## التجريب اليدوي",
    "## بوابة الإغلاق"
  ];

  for (const [index, section] of sections.entries()) {
    const file = path.join(
      sectionDocsRoot,
      `${String(index + 1).padStart(2, "0")}-${section.id}.md`
    );
    if (!fs.existsSync(file)) {
      fail(file, `SECTION_DOCUMENT_MISSING ${section.id}`);
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    if (!content.includes(`section_id: ${section.id}`)) {
      fail(file, `SECTION_DOCUMENT_ID_MISMATCH ${section.id}`);
    }
    for (const route of section.routes ?? []) {
      if (!content.includes(route)) fail(file, `SECTION_ROUTE_MISSING ${route}`);
    }
    for (const heading of requiredHeadings) {
      if (!content.includes(heading)) fail(file, `SECTION_HEADING_MISSING ${heading}`);
    }
    for (const token of [
      "loading",
      "ready",
      "empty",
      "error",
      "forbidden",
      "stale",
      "conflict",
      "unknown-result"
    ]) {
      if (!content.includes(token)) fail(file, `SECTION_STATE_MISSING ${token}`);
    }
  }
}

function checkControlPanelRegistry(registry) {
  if (!registry) return;

  const navigation = fs.existsSync(navigationPath)
    ? fs.readFileSync(navigationPath, "utf8")
    : "";
  if (!navigation) fail(navigationPath, "NAVIGATION_SOURCE_MISSING");
  const navEntries = [
    ...navigation.matchAll(
      /\{\s*section:\s*"([^"]+)"[^}]*route:\s*"([^"]+)"\s*\}/g
    )
  ].map((match) => ({ id: match[1], route: match[2] }));

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
    fail(
      registryPath,
      `NAV_SECTION_COUNT_MISMATCH registry=${sections.length} navigation=${navEntries.length}`
    );
  }
  for (const entry of navEntries) {
    const section = byId.get(entry.id);
    if (!section) fail(registryPath, `NAV_SECTION_UNREGISTERED ${entry.id}`);
    else if (section.canonicalRoute !== entry.route) {
      fail(
        registryPath,
        `NAV_ROUTE_DRIFT ${entry.id} registry=${section.canonicalRoute} navigation=${entry.route}`
      );
    }
  }
  for (const section of sections) {
    if (!navEntries.some((entry) => entry.id === section.id)) {
      fail(registryPath, `REGISTRY_SECTION_NOT_IN_NAVIGATION ${section.id}`);
    }
  }

  const registeredRoutes = new Map();
  for (const section of sections) {
    for (const route of section.routes ?? []) {
      if (registeredRoutes.has(route)) {
        fail(registryPath, `ROUTE_REGISTERED_TWICE ${route}`);
      }
      registeredRoutes.set(route, section.id);
    }
  }
  for (const item of registry.nonNavigationRoutes ?? []) {
    if (!item?.route) fail(registryPath, "NON_NAVIGATION_ROUTE_MISSING_ROUTE");
    else if (registeredRoutes.has(item.route)) {
      fail(registryPath, `ROUTE_REGISTERED_TWICE ${item.route}`);
    } else {
      registeredRoutes.set(item.route, item.classification ?? "non-navigation");
    }
  }

  const pageFiles = walk(appRoot, (file) => path.basename(file) === "page.tsx");
  const actualRoutes = pageFiles.map(routeFromPage).sort();
  const duplicateActualRoutes = actualRoutes.filter(
    (route, index) => actualRoutes.indexOf(route) !== index
  );
  for (const route of new Set(duplicateActualRoutes)) {
    fail(appRoot, `DUPLICATE_NEXT_ROUTE ${route}`);
  }

  for (const route of actualRoutes) {
    if (!registeredRoutes.has(route)) fail(registryPath, `UNREGISTERED_NEXT_ROUTE ${route}`);
  }
  for (const route of registeredRoutes.keys()) {
    if (!actualRoutes.includes(route)) {
      fail(registryPath, `REGISTERED_ROUTE_WITHOUT_PAGE ${route}`);
    }
  }

  const requiredStates = new Set(registry.requiredStates ?? []);
  const requiredControls = new Set(registry.requiredControlClasses ?? []);
  const requiredScenarios = new Set(registry.requiredManualScenarios ?? []);
  for (const required of [
    "loading",
    "ready",
    "empty",
    "error",
    "forbidden",
    "stale",
    "conflict",
    "unknown-result"
  ]) {
    if (!requiredStates.has(required)) {
      fail(registryPath, `REQUIRED_STATE_MISSING ${required}`);
    }
  }
  for (const required of [
    "navigation",
    "tabs",
    "search",
    "filters",
    "sorting",
    "pagination",
    "tables-or-lists",
    "forms",
    "buttons",
    "icons",
    "dialogs",
    "state-panels",
    "audit-links"
  ]) {
    if (!requiredControls.has(required)) {
      fail(registryPath, `REQUIRED_CONTROL_CLASS_MISSING ${required}`);
    }
  }
  for (const required of [
    "authorized-happy-path",
    "missing-permission",
    "object-outside-scope",
    "stale-version-conflict",
    "duplicate-submit",
    "response-lost-after-commit",
    "dependency-unavailable-and-recovery",
    "keyboard-screen-reader-rtl-large-text"
  ]) {
    if (!requiredScenarios.has(required)) {
      fail(registryPath, `REQUIRED_MANUAL_SCENARIO_MISSING ${required}`);
    }
  }

  const coveredJourneys = new Set();
  for (const section of sections) {
    for (const token of section.journeyCoverage ?? []) {
      const expanded = expandJourneyToken(token);
      if (expanded.length === 0) {
        fail(registryPath, `INVALID_JOURNEY_COVERAGE_TOKEN ${section.id}:${token}`);
      }
      for (const id of expanded) coveredJourneys.add(id);
    }
  }
  for (const id of expectedJourneyIds()) {
    if (!coveredJourneys.has(id)) {
      fail(registryPath, `JOURNEY_NOT_MAPPED_TO_CONTROL_PANEL ${id}`);
    }
  }
}

const registry = parseJson(registryPath);
checkJourneyDocuments(registry);
checkControlPanelRegistry(registry);
checkSectionDocuments(registry);

if (violations.length > 0) {
  console.error("SMSM journey coverage check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  "SMSM journey coverage check passed: 107 journeys, 11 explicit Control Panel section contracts, navigation routes, states, controls, and manual scenarios are structurally mapped."
);
