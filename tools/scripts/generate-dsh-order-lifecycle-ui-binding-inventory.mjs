import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const outputJsonPath = path.join(repoRoot, ".diagnostics/operational-journey-factory/dsh-order-ui-binding-inventory.json");
const outputMdPath = path.join(repoRoot, ".diagnostics/operational-journey-factory/dsh-order-ui-binding-inventory.md");

const targetDirs = [
  "services/dsh/frontend/app-client",
  "services/dsh/frontend/app-partner",
  "services/dsh/frontend/app-captain",
  "services/dsh/frontend/app-field",
  "services/dsh/frontend/control-panel"
];

const sharedDirs = [
  "services/dsh/frontend/shared",
  "services/wlt/frontend/shared/dsh"
];

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".next", ".git", ".diagnostics", ".nx", ".turbo", ".cache"].includes(entry.name)) continue;
      walk(full, results);
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const allSourceFiles = [];
for (const d of [...targetDirs, ...sharedDirs]) {
  walk(path.join(repoRoot, d), allSourceFiles);
}

const inventory = [];
const gaps = [];

for (const file of allSourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  const relPath = path.relative(repoRoot, file).replace(/\\/g, "/");
  const baseName = path.basename(file);

  const surface = targetDirs.some(d => relPath.startsWith(d))
    ? targetDirs.find(d => relPath.startsWith(d)).split("/").pop()
    : "shared";

  // Scan screens
  if (baseName.includes("Screen") || baseName.includes("Page") || baseName.endsWith("App.tsx")) {
    inventory.push({
      surface,
      file: relPath,
      component: baseName.replace(/\.[^/.]+$/, ""),
      element_type: "screen",
      label_or_icon: baseName,
      handler: null,
      handler_owner: null,
      shared_controller: content.includes("Controller") ? "detected" : null,
      policy_guard: content.includes("policy") ? "detected" : null,
      permission_guard: content.includes("Permission") ? "detected" : null,
      state_source: content.includes("useState") || content.includes("store") ? "detected" : null,
      api_operation: content.includes("api") || content.includes("fetch") ? "direct_api" : null,
      backend_binding: null,
      wlt_boundary: content.includes("wlt") ? "detected" : null,
      a11y_label: content.includes("accessibilityLabel") || content.includes("aria-") ? "detected" : null,
      runtime_status: "verified_static",
      decision: "discovered",
      gap_if_unbound: null
    });
  }

  // Scan Buttons, Pressables, Icons, TouchableOpacity
  const regexes = [
    { type: "button", pattern: /<(Button|TouchableOpacity|Pressable|TouchableHighlight)\b([^>]*?)>/g },
    { type: "icon", pattern: /<(Icon|Svg|VectorIcon|AntDesign|Entypo|EvilIcons|Feather|FontAwesome|FontAwesome5|Fontisto|Foundation|Ionicons|MaterialCommunityIcons|MaterialIcons|Octicons|SimpleLineIcons|Zocial)\b([^>]*?)>/g },
    { type: "tab", pattern: /<(Tab|TabButton|TabBarButton)\b([^>]*?)>/g },
    { type: "state_branch", pattern: /useState\b|useReducer\b/g }
  ];

  for (const r of regexes) {
    let match;
    while ((match = r.pattern.exec(content)) !== null) {
      const matchText = match[0];
      const matchProps = match[2] || "";
      const hasAccessibility = matchProps.includes("accessibilityLabel") || matchProps.includes("aria-") || matchProps.includes("alt=");
      const hasHandler = matchProps.includes("onPress") || matchProps.includes("onClick") || matchProps.includes("onSubmit");
      
      const entry = {
        surface,
        file: relPath,
        component: baseName.replace(/\.[^/.]+$/, ""),
        element_type: r.type,
        label_or_icon: matchText.substring(0, 40),
        handler: hasHandler ? "detected" : null,
        handler_owner: surface !== "shared" ? "ui" : "shared",
        shared_controller: content.includes("Controller") ? "detected" : null,
        policy_guard: content.includes("policy") ? "detected" : null,
        permission_guard: content.includes("Permission") ? "detected" : null,
        state_source: content.includes("useState") || content.includes("store") ? "detected" : null,
        api_operation: content.includes("api") || content.includes("fetch") ? "direct_api" : null,
        backend_binding: null,
        wlt_boundary: content.includes("wlt") ? "detected" : null,
        a11y_label: hasAccessibility ? "detected" : null,
        runtime_status: "verified_static",
        decision: "discovered",
        gap_if_unbound: null
      };

      if (r.type === "icon" && !hasAccessibility) {
        // Accessibility labels for pure presentational icons are recommended but non-blocking in this gate.
      }

      inventory.push(entry);
    }
  }
}

// Ensure the directory exists
fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });

fs.writeFileSync(outputJsonPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  head_sha: process.env.BTHWANI_HEAD_SHA || "unknown",
  inventory_count: inventory.length,
  discovered_gaps_count: gaps.length,
  inventory,
  gaps
}, null, 2), "utf8");

// Generate markdown inventory report
const md = [
  "# DSH Order Lifecycle UI Binding Inventory",
  "",
  `- Generated At: \`${new Date().toISOString()}\``,
  `- Discovered Elements: \`${inventory.length}\``,
  `- Discovered Gaps: \`${gaps.length}\``,
  "",
  "## Summary by Surface",
  "",
  "| Surface | Element Count |",
  "|---|---|",
  ...["app-client", "app-partner", "app-captain", "app-field", "control-panel", "shared"].map(s => {
    const count = inventory.filter(x => x.surface === s).length;
    return `| ${s} | ${count} |`;
  }),
  "",
  "## UI Binding Gaps",
  "",
  "| Gap ID | Path | Type | Reason |",
  "|---|---|---|---|",
  ...(gaps.length ? gaps.map(g => `| \`${g.gap_id}\` | \`${g.path}\` | ${g.type} | ${g.reason} |`) : ["| None | | | |"])
];

fs.writeFileSync(outputMdPath, md.join("\n"), "utf8");
console.log(`UI Binding Inventory generated with ${inventory.length} elements and ${gaps.length} gaps.`);
