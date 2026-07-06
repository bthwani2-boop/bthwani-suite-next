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

function headSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "HEAD_UNAVAILABLE";
  }
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

function classifyFile(file) {
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const base = path.basename(file);
  const isScreen = /Screen\.(tsx|ts)$/.test(base) || /screen/i.test(file);
  const isPage = /page\.(tsx|ts|jsx|js)$/.test(base);
  const isRoute = /route|router|navigation|navigator/i.test(file) || /<Route\b|createStackNavigator|createBottomTabNavigator/.test(content);
  const isSharedImport = /from ["'][^"']*shared|from ["']@bthwani\/shared|from ["'][^"']*ui-kit/.test(content);
  const directApiSigns = /\bfetch\s*\(|\baxios\b|XMLHttpRequest|process\.env|API_BASE|baseUrl/.test(content);
  const localBusinessLogic = /\bcalculate|\bcommission|\bsettlement|\bpayout|\brefund|\bledger|\bpolicy|\bSLA|\bcapacity|\bprovider/i.test(content);
  const iconCandidates = (content.match(/\b[A-Z][A-Za-z0-9]+Icon\b|lucide-react|@expo\/vector-icons/g) || []).length;
  const actionCandidates = (content.match(/\bonPress\b|\bonClick\b|\b<Button\b|\bPressable\b|\bTouchable/g) || []).length;
  const stateCandidates = (content.match(/\bloading\b|\berror\b|\bempty\b|\bsuccess\b|\bblocked\b|\bretry\b|\boffline\b|\bdisabled\b/gi) || []).length;

  return {
    path: file,
    surface: file.split("/").slice(0, 4).join("/"),
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

const requiredSurfaces = ["app-client", "app-partner", "app-captain", "app-field", "control-panel"];
const surfaceText = Array.from(surfaces.keys()).join("\n");
const missingRequiredSurfaces = requiredSurfaces.filter((surface) => !surfaceText.includes(surface));

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
lines.push("| Surface | Files | Screens | Pages | Routes | Direct API signs | Local logic candidates | UI/action candidates | State candidates |");
lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const surface of inventory.surfaces) {
  lines.push(`| \`${surface.surface}\` | ${surface.files} | ${surface.screens.length} | ${surface.pages.length} | ${surface.route_bindings.length} | ${surface.direct_api_signs.length} | ${surface.local_business_logic_candidates.length} | ${surface.icons_components_actions_candidates} | ${surface.states_candidates} |`);
}
lines.push("");
lines.push("## Missing Required Surface Names");
for (const surface of missingRequiredSurfaces) lines.push(`- ${surface}`);

fs.writeFileSync(path.join(outDir, "surface-inventory.md"), lines.join("\n"), "utf8");
console.log("Operational surface inventory written to .diagnostics/operational-journey-factory");
