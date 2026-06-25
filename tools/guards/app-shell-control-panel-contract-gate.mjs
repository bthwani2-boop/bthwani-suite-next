import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  fail,
  findImportSpecifiers,
  lineNumber,
  listCodeFiles,
  read,
  toPosix,
  repoRoot,
} from "./_guard-utils.mjs";

const guardId = "app-shell-control-panel-contract-gate";
const violations = [];
const root = repoRoot;

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function inScope(file, prefix) {
  return toPosix(file).startsWith(prefix);
}

function inAnyScope(file, prefixes) {
  return prefixes.some((p) => inScope(file, p));
}

// ── 1. shared/app-shell/src/index.ts exports ./control-panel ─────────────────

const appShellIndex = "shared/app-shell/src/index.ts";
if (!exists(appShellIndex)) {
  violations.push({ file: appShellIndex, message: "MISSING: shared/app-shell/src/index.ts does not exist" });
} else {
  const content = read(appShellIndex);
  if (!content.includes("./control-panel")) {
    violations.push({
      file: appShellIndex,
      message: "MISSING EXPORT: shared/app-shell/src/index.ts must export './control-panel'",
    });
  }
}

// ── 2. shared/app-shell/src/control-panel/index.ts exists ────────────────────

const cpIndex = "shared/app-shell/src/control-panel/index.ts";
if (!exists(cpIndex)) {
  violations.push({ file: cpIndex, message: "MISSING: control-panel barrel index.ts does not exist" });
}

// ── 3. All required archetype files present ───────────────────────────────────

const REQUIRED_ARCHETYPES = [
  "apps/control-panel/runtime/src/shell/OverviewPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/DataTablePageFrame.tsx",
  "apps/control-panel/runtime/src/shell/QueuePageFrame.tsx",
  "apps/control-panel/runtime/src/shell/OperationsRoomFrame.tsx",
  "apps/control-panel/runtime/src/shell/DetailPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/EditorPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/ReviewPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/MetricsPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/SettingsPageFrame.tsx",
  "apps/control-panel/runtime/src/shell/FinanceReadOnlyFrame.tsx",
  "apps/control-panel/runtime/src/shell/index.ts",
];

for (const rel of REQUIRED_ARCHETYPES) {
  if (!exists(rel)) {
    violations.push({ file: rel, message: "MISSING required archetype file" });
  }
}

// Required shell files
const REQUIRED_SHELL_FILES = [
  "apps/control-panel/runtime/src/shell/ControlPanelShell.tsx",
  "apps/control-panel/runtime/src/shell/ControlPanelNavigation.tsx",
  "apps/control-panel/runtime/src/shell/ControlPanelTopBar.tsx",
  "shared/app-shell/src/control-panel/ControlPanelSectionRegistry.ts",
  "shared/app-shell/src/control-panel/ControlPanelServiceRegistry.ts",
];

for (const rel of REQUIRED_SHELL_FILES) {
  if (!exists(rel)) {
    violations.push({ file: rel, message: "MISSING required control-panel shell file" });
  }
}

// ── 4. No shared/app-shell/src/mobile ────────────────────────────────────────

const mobilePath = path.join(root, "shared/app-shell/src/mobile");
if (fs.existsSync(mobilePath)) {
  violations.push({
    file: "shared/app-shell/src/mobile",
    message:
      "FORBIDDEN: shared/app-shell/src/mobile exists. Mobile shell is out of scope. " +
      "Remove it or activate via task MOBILE_APP_SHELL_ALIGNMENT with documented evidence.",
  });
}

// ── 5. No direct Tamagui imports in forbidden scopes ─────────────────────────

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
        message: `FORBIDDEN: direct Tamagui import '${item.specifier}' — allowed only inside shared/ui-kit`,
      });
    }
  }
}

// ── 6. No fetch / axios in forbidden scopes ───────────────────────────────────

const FETCH_FORBIDDEN_SCOPES = [
  "shared/app-shell/",
  "apps/control-panel/runtime/src/",
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
];

const fetchRe = /\bfetch\s*\(/g;
// Only flag axios as an import specifier — not the word "axios" in string literals
// (shell-contracts.ts lists "axios" as a forbidden responsibility; that is documentation, not usage)

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, FETCH_FORBIDDEN_SCOPES)) continue;

  const content = read(file);

  fetchRe.lastIndex = 0;
  let m;
  while ((m = fetchRe.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, m.index),
      message: "FORBIDDEN: fetch() — use generated service client, not direct HTTP",
    });
  }

  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "axios" || item.specifier.startsWith("axios/")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: "FORBIDDEN: axios import — use generated service client, not direct HTTP",
      });
    }
  }
}

// ── 7. No raw hex outside shared/ui-kit ──────────────────────────────────────

const HEX_FORBIDDEN_SCOPES = [
  "shared/app-shell/",
  "apps/control-panel/runtime/src/",
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
];

const hexRe = /#[0-9a-fA-F]{3,8}\b/g;

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, HEX_FORBIDDEN_SCOPES)) continue;
  if (file.endsWith(".json") || file.endsWith(".yaml") || file.endsWith(".yml")) continue;

  const content = read(file);
  hexRe.lastIndex = 0;
  let m;
  while ((m = hexRe.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, m.index),
      message: `FORBIDDEN: raw hex color '${m[0]}' — use ui-kit tokens/colorRoles`,
    });
  }
}

// ── 8. No local design system identifiers ────────────────────────────────────

const LOCAL_DS_SCOPES = [
  "shared/app-shell/",
  "services/dsh/frontend/control-panel/",
  "services/wlt/frontend/control-panel/",
  "apps/control-panel/runtime/",
];

const BANNED_NAMES = [
  "LocalDesignSystem",
  "CustomDashboardShell",
  "DshLocalShell",
  "WltLocalShell",
  "PreviewDashboard",
  "DemoDashboard",
  "MobileShell",
];

for (const file of listCodeFiles()) {
  if (!inAnyScope(file, LOCAL_DS_SCOPES)) continue;

  const content = read(file);
  for (const name of BANNED_NAMES) {
    const re = new RegExp(`\\b${name}\\b`, "g");
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      violations.push({
        file,
        line: lineNumber(content, m.index),
        message: `FORBIDDEN: banned identifier '${name}' — no local design systems, preview shells, or premature mobile shell`,
      });
    }
  }
}

// ── 9. No old host ports ──────────────────────────────────────────────────────

const OLD_PORTS = [8080, 8081, 8082, 8083, 8084, 3000];
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
  for (const port of OLD_PORTS) {
    const re = new RegExp(`\\b${port}\\b`, "g");
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      violations.push({
        file,
        line: lineNumber(content, m.index),
        message: `FORBIDDEN: old host port ${port} — use canonical runtime ports only (postgres:55432, api:58080, minio:59000)`,
      });
    }
  }
}

// ── 10. node_modules not tracked in git inside shared/app-shell ──────────────

try {
  const tracked = execSync("git ls-files shared/app-shell/node_modules", {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (tracked.length > 0) {
    violations.push({
      file: "shared/app-shell/node_modules",
      message:
        "P0: node_modules is tracked in git. Run: git rm -r --cached shared/app-shell/node_modules && add to .gitignore",
    });
  }
} catch {
  // git not available — skip check
}

// ── 11. machine-readable/control-panel-design JSON files are valid ────────────

const machineDir = path.join(root, "machine-readable/control-panel-design");
if (!fs.existsSync(machineDir)) {
  violations.push({
    file: "machine-readable/control-panel-design/",
    message: "MISSING: machine-readable/control-panel-design/ directory does not exist",
  });
} else {
  const REQUIRED_JSON = [
    "control_panel_app_shell_audit.json",
    "control_panel_design_skeleton_reference.json",
    "control_panel_section_archetypes.json",
    "control_panel_service_ownership_matrix.json",
    "control_panel_design_gate.json",
  ];

  for (const name of REQUIRED_JSON) {
    const abs = path.join(machineDir, name);
    const rel = `machine-readable/control-panel-design/${name}`;
    if (!fs.existsSync(abs)) {
      violations.push({ file: rel, message: "MISSING required machine-readable contract file" });
      continue;
    }
    try {
      JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch {
      violations.push({ file: rel, message: "INVALID JSON — parse error" });
    }
  }
}

fail(guardId, violations);
