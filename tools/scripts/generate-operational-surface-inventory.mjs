import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repoRoot, isExcluded, toPosix } from "../guards/_guard-utils.mjs";

const outDir = path.join(repoRoot, ".diagnostics", "operational-journey-factory");
fs.mkdirSync(outDir, { recursive: true });

const roots = [
  "apps",
  "services/dsh/frontend",
  "services/wlt/frontend",
  "shared/ui-kit"
];

const uiSurfaceRoots = [
  "services/dsh/frontend/app-client",
  "services/dsh/frontend/app-partner",
  "services/dsh/frontend/app-field",
  "services/dsh/frontend/app-captain",
  "services/dsh/frontend/control-panel",
  "services/wlt/frontend/app-client",
  "services/wlt/frontend/app-partner",
  "services/wlt/frontend/app-field",
  "services/wlt/frontend/app-captain",
  "services/wlt/frontend/control-panel"
];

const sharedBrainRoots = [
  "services/dsh/frontend/shared",
  "services/wlt/frontend/shared"
];

function headSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "HEAD_UNAVAILABLE";
  }
}

function rootMatches(file, root) {
  return file === root || file.startsWith(`${root}/`);
}

function existingRoot(root) {
  return fs.existsSync(path.join(repoRoot, root));
}

function classifyOwner(file) {
  for (const root of sharedBrainRoots) {
    if (rootMatches(file, root)) return { kind: "shared_brain", surface: root };
  }

  for (const root of uiSurfaceRoots) {
    if (rootMatches(file, root)) return { kind: "ui_surface", surface: root };
  }

  const runtimeMatch = file.match(/^apps\/([^/]+)\/runtime(?:\/|$)/);
  if (runtimeMatch) return { kind: "runtime_shell", surface: `apps/${runtimeMatch[1]}/runtime` };

  if (rootMatches(file, "shared/ui-kit")) return { kind: "ui_kit", surface: "shared/ui-kit" };

  return { kind: "other", surface: file.split("/").slice(0, 4).join("/") };
}

function listFiles(relRoot, files = []) {
  const absRoot = path.join(repoRoot, relRoot);
  if (!fs.existsSync(absRoot)) return files;
  for (const entry of fs.readdirSync(absRoot, { withFileTypes: true })) {
    const full = path.join(absRoot, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    if (isExcluded(rel, entry.isDirectory(), entry.name)) continue;
    if (entry.isDirectory()) {
      listFiles(rel, files);
      continue;
    }
    if (/\.(tsx?|jsx?|json)$/.test(entry.name)) files.push(rel);
  }
  return files;
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\r\n]*/g, " ")
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " ");
}

function hasDirectApiSigns(code) {
  return /\bfetch\s*\(|\baxios\b|XMLHttpRequest|process\.env|API_BASE|\bbaseUrl\b/.test(code);
}

function hasRuntimeTransportSigns(code) {
  return /\bfetch\s*\(|\baxios\b|XMLHttpRequest|process\.env|API_BASE/.test(code);
}

function hasOperationalLogicSigns(code, file) {
  if (/\.(types|type)\.(ts|tsx)$/.test(file)) return false;

  const codePatterns = [
    /\bfunction\s+[A-Za-z0-9_]*(?:calculate|price|total|fee(?!d)|commission|settlement|payout|refund|ledger)[A-Za-z0-9_]*\s*\(/i,
    /\b(?:const|let|var)\s+[A-Za-z0-9_]*(?:calculate|price|total|fee(?!d)|commission|settlement|payout|refund|ledger)[A-Za-z0-9_]*\s*=\s*(?:\([^)]*\)\s*=>|function\b)/i,
    /\b(?:set|update|apply|approve|reject|resolve|assign)[A-Za-z0-9_]*(?:Commission|Settlement|Payout|Refund|Ledger)\b/,
    /\b(?:commission|settlement|payout|refund|ledger)\b\s*[+\-*/=]/i
  ];

  return codePatterns.some((pattern) => pattern.test(code));
}

function classifyFile(file) {
  const owner = classifyOwner(file);
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const code = stripCommentsAndStrings(content);
  const base = path.basename(file);
  const isScreen = /Screen\.(tsx|ts)$/.test(base) || /screen/i.test(file);
  const isPage = /page\.(tsx|ts|jsx|js)$/.test(base);
  const isRoute = /route|router|navigation|navigator/i.test(file) || /<Route\b|createStackNavigator|createBottomTabNavigator/.test(code);
  const isSharedImport = /from ["'][^"']*shared|from ["']@bthwani\/shared|from ["'][^"']*ui-kit/.test(content);
  const directApiSigns = /\.(types|type|view-model)\.(ts|tsx)$/.test(file)
    ? hasRuntimeTransportSigns(code)
    : hasDirectApiSigns(code);
  const localBusinessLogic = hasOperationalLogicSigns(code, file);
  const iconCandidates = (content.match(/\b[A-Z][A-Za-z0-9]+Icon\b|lucide-react|@expo\/vector-icons/g) || []).length;
  const actionCandidates = (content.match(/\bonPress\b|\bonClick\b|\b<Button\b|\bPressable\b|\bTouchable/g) || []).length;
  const stateCandidates = (content.match(/\bloading\b|\berror\b|\bempty\b|\bsuccess\b|\bblocked\b|\bretry\b|\boffline\b|\bdisabled\b/gi) || []).length;

  return {
    path: file,
    surface: owner.surface,
    kind: owner.kind,
    screens: isScreen ? [file] : [],
    pages: isPage ? [file] : [],
    route_bindings: isRoute ? [file] : [],
    navigation_bindings: /navigation|navigator|tab|drawer/i.test(file + content) ? [file] : [],
    shared_imports: isSharedImport ? [file] : [],
    direct_api_signs: directApiSigns ? [file] : [],
    process_env_usage: /process\.env/.test(content) ? [file] : [],
    local_business_logic_candidates: localBusinessLogic ? [file] : [],
    icons_components_actions_candidates: iconCandidates + actionCandidates,
    states_candidates: stateCandidates
  };
}

const files = roots.flatMap((root) => listFiles(root));
const items = files.map(classifyFile);
const surfaces = new Map();

for (const item of items) {
  const current = surfaces.get(item.surface) || {
    surface: item.surface,
    kind: item.kind,
    files: 0,
    screens: [],
    pages: [],
    route_bindings: [],
    navigation_bindings: [],
    shared_imports: [],
    direct_api_signs: [],
    process_env_usage: [],
    local_business_logic_candidates: [],
    icons_components_actions_candidates: 0,
    states_candidates: 0
  };
  current.files += 1;
  for (const key of ["screens", "pages", "route_bindings", "navigation_bindings", "shared_imports", "direct_api_signs", "process_env_usage", "local_business_logic_candidates"]) {
    current[key].push(...item[key]);
  }
  current.icons_components_actions_candidates += item.icons_components_actions_candidates;
  current.states_candidates += item.states_candidates;
  surfaces.set(item.surface, current);
}

const requiredUiSurfaces = uiSurfaceRoots.filter(existingRoot);
const discoveredUiSurfaces = new Set(
  Array.from(surfaces.values())
    .filter((surface) => surface.kind === "ui_surface")
    .map((surface) => surface.surface)
);
const missingRequiredSurfaces = requiredUiSurfaces.filter((surface) => !discoveredUiSurfaces.has(surface));

const inventory = {
  head_sha: headSha(),
  status: "DISCOVERY_ONLY",
  roots,
  apps: files.filter((file) => file.startsWith("apps/")),
  surfaces: Array.from(surfaces.values()),
  screens: items.flatMap((item) => item.screens),
  pages: items.flatMap((item) => item.pages),
  route_bindings: items.flatMap((item) => item.route_bindings),
  navigation_bindings: items.flatMap((item) => item.navigation_bindings),
  shared_imports: items.flatMap((item) => item.shared_imports),
  direct_api_signs: items.flatMap((item) => item.direct_api_signs),
  process_env_usage: items.flatMap((item) => item.process_env_usage),
  local_business_logic_candidates: items.flatMap((item) => item.local_business_logic_candidates),
  missing_required_surfaces: missingRequiredSurfaces
};

fs.writeFileSync(path.join(outDir, "surface-inventory.json"), JSON.stringify(inventory, null, 2), "utf8");

const lines = [];
lines.push("# Operational Surface Inventory");
lines.push("");
lines.push(`head_sha: \`${inventory.head_sha}\``);
lines.push("status: `DISCOVERY_ONLY`");
lines.push("");
lines.push("| Kind | Surface | Files | Screens | Pages | Routes | Direct API signs | Local logic candidates | UI/action candidates | State candidates |");
lines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const surface of inventory.surfaces) {
  lines.push(`| ${surface.kind} | \`${surface.surface}\` | ${surface.files} | ${surface.screens.length} | ${surface.pages.length} | ${surface.route_bindings.length} | ${surface.direct_api_signs.length} | ${surface.local_business_logic_candidates.length} | ${surface.icons_components_actions_candidates} | ${surface.states_candidates} |`);
}
lines.push("");
lines.push("## Missing Required UI Surfaces");
for (const surface of missingRequiredSurfaces) lines.push(`- ${surface}`);

fs.writeFileSync(path.join(outDir, "surface-inventory.md"), lines.join("\n"), "utf8");
console.log("Operational surface inventory written to .diagnostics/operational-journey-factory");
