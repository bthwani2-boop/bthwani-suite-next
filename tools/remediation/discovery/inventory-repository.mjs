// Structural + documentation diagnosis (spec §10.1, §10.4): wrong-path files, duplicate
// folders, workflows/guards/scripts/skills/docs inventory. Read-only; writes only to
// .diagnostics/remediation/inventory/ (untracked).
import fs from "node:fs";
import path from "node:path";
import { repoRoot, listFiles, writeInventory, readJson } from "../_remediation-utils.mjs";

function topLevelDirs() {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

function listWorkflows() {
  const dir = path.join(repoRoot, ".github", "workflows");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => /\.ya?ml$/i.test(name)).sort();
}

function listGuards() {
  const registry = readJson("governance/guards/guard-registry.json");
  return (registry?.entries ?? registry?.guards ?? []).map((entry) => entry.id).sort();
}

function inspectSkills() {
  const registry = readJson("governance/skills/skills-registry.json");
  const skillsDir = path.join(repoRoot, ".agents", "skills");
  const onDisk = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    : [];
  const registered = new Set((registry?.entries ?? []).map((entry) => entry.id));
  const catalogPath = path.join(repoRoot, ".agents", "SKILL_CATALOG.md");
  const catalog = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, "utf8") : "";
  return {
    registeredCount: registered.size,
    onDiskCount: onDisk.length,
    unregisteredOnDisk: onDisk.filter((id) => !registered.has(id)),
    registeredButMissingOnDisk: [...registered].filter((id) => !onDisk.includes(id)),
    missingFromCatalog: [...registered].filter((id) => !catalog.includes(`\`${id}\``)),
  };
}

function inspectDocuments() {
  const statusPattern = /^Status:\s*(.+)$/m;
  const roots = ["governance", "docs"];
  const items = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "archive" || entry.name === "_noncanonical") continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const relative = path.relative(repoRoot, full).replaceAll("\\", "/");
      const content = fs.readFileSync(full, "utf8");
      items.push({ path: relative, status: content.match(statusPattern)?.[1]?.trim() ?? null, empty: content.trim().length === 0 });
    }
  };
  for (const root of roots) {
    const full = path.join(repoRoot, root);
    if (fs.existsSync(full)) walk(full);
  }
  const statusCounts = {};
  for (const item of items) statusCounts[item.status ?? "(none)"] = (statusCounts[item.status ?? "(none)"] ?? 0) + 1;
  return { documentCount: items.length, statusCounts, emptyDocuments: items.filter((item) => item.empty).map((item) => item.path) };
}

function listScripts() {
  return Object.keys(readJson("package.json")?.scripts ?? {}).sort();
}

const allFiles = listFiles();
const byExtension = new Map();
for (const file of allFiles) {
  const ext = path.extname(file) || "(none)";
  byExtension.set(ext, (byExtension.get(ext) ?? 0) + 1);
}

writeInventory("repository", {
  generatedAt: new Date().toISOString(),
  topLevelDirectories: topLevelDirs(),
  trackedTextFileCount: allFiles.length,
  extensionCounts: Object.fromEntries([...byExtension.entries()].sort((a, b) => b[1] - a[1])),
  workflows: listWorkflows(),
  guardIds: listGuards(),
  skills: inspectSkills(),
  documents: inspectDocuments(),
  packageScriptCount: listScripts().length,
  items: allFiles,
});
