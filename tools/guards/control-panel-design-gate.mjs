import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read, toPosix, repoRoot } from "./_guard-utils.mjs";

const guardId = "control-panel-design-gate";
const violations = [];
const root = repoRoot;

// ── 1. Required files ─────────────────────────────────────────────────────────

const REQUIRED_FILES = [
  // app-shell: contracts only (registries, no shell/visual)
  "shared/app-shell/src/control-panel/index.ts",
  "shared/app-shell/src/control-panel/ControlPanelSectionRegistry.ts",
  "shared/app-shell/src/control-panel/ControlPanelServiceRegistry.ts",
  // control-panel runtime: shell layout
  "apps/control-panel/runtime/src/shell/index.ts",
  "apps/control-panel/runtime/src/shell/ControlPanelShell.tsx",
  "apps/control-panel/runtime/src/shell/ControlPanelNavigation.tsx",
  "apps/control-panel/runtime/src/shell/ControlPanelTopBar.tsx",
  "apps/control-panel/runtime/src/shell/DataTablePageFrame.tsx",
  "apps/control-panel/runtime/src/shell/DetailPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/EditorPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/FinanceReadOnlyFrame.tsx",
  "apps/control-panel/runtime/src/shell/MetricsPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/OperationsRoomFrame.tsx",
  "apps/control-panel/runtime/src/shell/OverviewPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/PaginationToolbar.tsx",
  "apps/control-panel/runtime/src/shell/QueuePageFrame.tsx",
  "apps/control-panel/runtime/src/shell/ReviewPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/SettingsPageFrame.tsx",
  // control-panel runtime: Cp* primitives
  "apps/control-panel/runtime/src/components/index.ts",
  "apps/control-panel/runtime/src/components/CpPrimitives.tsx",
  // machine-readable contracts
  "machine-readable/control-panel-design/control_panel_design_skeleton_reference.json",
  "machine-readable/control-panel-design/control_panel_section_archetypes.json",
  "machine-readable/control-panel-design/control_panel_service_ownership_matrix.json",
  "machine-readable/control-panel-design/control_panel_design_gate.json",
];

for (const rel of REQUIRED_FILES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    violations.push({ file: rel, message: "MISSING required file" });
  }
}

// ── 2. app-shell/src/index.ts exports control-panel ──────────────────────────

const appShellIndex = "shared/app-shell/src/index.ts";
if (fs.existsSync(path.join(root, appShellIndex))) {
  const content = read(appShellIndex);
  if (!content.includes("./control-panel")) {
    violations.push({
      file: appShellIndex,
      message: "shared/app-shell/src/index.ts does not export './control-panel'",
    });
  }
}

// ── 3. Valid JSON for all machine-readable/control-panel-design/*.json ────────

const machineDir = path.join(root, "machine-readable/control-panel-design");
if (fs.existsSync(machineDir)) {
  for (const entry of fs.readdirSync(machineDir)) {
    if (!entry.endsWith(".json")) continue;
    const rel = `machine-readable/control-panel-design/${entry}`;
    const abs = path.join(root, rel);
    try {
      JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch {
      violations.push({ file: rel, message: "Invalid JSON" });
    }
  }
}

// ── Scope helpers ─────────────────────────────────────────────────────────────

function inScope(file, prefix) {
  return toPosix(file).startsWith(prefix);
}

function inAnyScope(file, prefixes) {
  return prefixes.some((p) => inScope(file, p));
}

// ── 4. No direct Tamagui in forbidden scopes ──────────────────────────────────

const TAMAGUI_FORBIDDEN_SCOPES = [
  "shared/app-shell/",
  "apps/control-panel/runtime/",
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
];

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, TAMAGUI_FORBIDDEN_SCOPES)) continue;

  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "tamagui" || item.specifier.startsWith("@tamagui/")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `FORBIDDEN: direct Tamagui import '${item.specifier}' — only allowed inside shared/ui-kit`,
      });
    }
  }
}

// ── 5. No fetch or axios in forbidden scopes ──────────────────────────────────

const FETCH_FORBIDDEN_SCOPES = [
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
  "apps/control-panel/runtime/src/",
];

const fetchRegex = /\bfetch\s*\(/g;
const axiosRegex = /\baxios\b/g;

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, FETCH_FORBIDDEN_SCOPES)) continue;

  const content = read(file);

  let match;
  fetchRegex.lastIndex = 0;
  while ((match = fetchRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "FORBIDDEN: direct fetch() in control-panel scope — use generated service client",
    });
  }

  axiosRegex.lastIndex = 0;
  while ((match = axiosRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "FORBIDDEN: axios in control-panel scope — use generated service client",
    });
  }
}

// ── 6. No raw hex in forbidden scopes ─────────────────────────────────────────

const HEX_FORBIDDEN_SCOPES = [
  "shared/app-shell/",
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
  "apps/control-panel/runtime/src/",
];

const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, HEX_FORBIDDEN_SCOPES)) continue;
  if (file.endsWith(".json") || file.endsWith(".yaml") || file.endsWith(".yml")) continue;

  const content = read(file);

  hexRegex.lastIndex = 0;
  let match;
  while ((match = hexRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `FORBIDDEN: raw hex color '${match[0]}' outside shared/ui-kit`,
    });
  }
}

// ── 7. No banned local names ──────────────────────────────────────────────────

const BANNED_NAMES = [
  "LocalDesignSystem",
  "CustomDashboardShell",
  "DshLocalShell",
  "WltLocalShell",
  "PreviewDashboard",
  "DemoDashboard",
];

const BANNED_NAME_SCOPES = [
  "shared/app-shell/",
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
  "apps/control-panel/runtime/",
];

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, BANNED_NAME_SCOPES)) continue;

  const content = read(file);
  for (const name of BANNED_NAMES) {
    const nameRegex = new RegExp(`\\b${name}\\b`, "g");
    let match;
    nameRegex.lastIndex = 0;
    while ((match = nameRegex.exec(content))) {
      violations.push({
        file,
        line: lineNumber(content, match.index),
        message: `FORBIDDEN: banned identifier '${name}' — no local design system or preview shells`,
      });
    }
  }
}

// ── 8. No old host ports in task-scope files ──────────────────────────────────

const BANNED_PORTS = [8080, 8081, 8082, 8083, 8084, 3000];
const PORT_SCOPES = [
  "shared/app-shell/",
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
  "apps/control-panel/runtime/",
  "machine-readable/control-panel-design/",
];

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, PORT_SCOPES)) continue;

  const content = read(file);
  for (const port of BANNED_PORTS) {
    const portRegex = new RegExp(`\\b${port}\\b`, "g");
    let match;
    portRegex.lastIndex = 0;
    while ((match = portRegex.exec(content))) {
      violations.push({
        file,
        line: lineNumber(content, match.index),
        message: `FORBIDDEN: old host port ${port} — use canonical runtime ports only`,
      });
    }
  }
}

fail(guardId, violations);
