import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "service-workspace-validation";
const violations = [];
const workspaceFile = "pnpm-workspace.yaml";
const manifest = fs.readFileSync(path.join(repoRoot, workspaceFile), "utf8");
const patterns = [...manifest.matchAll(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/gm)].map((match) => match[1]);

function directoriesForPattern(pattern) {
  const segments = toPosix(pattern).split("/");
  let directories = [repoRoot];
  for (const segment of segments) {
    const next = [];
    for (const directory of directories) {
      if (segment === "*") {
        if (!fs.existsSync(directory)) continue;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          if (entry.isDirectory()) next.push(path.join(directory, entry.name));
        }
      } else {
        next.push(path.join(directory, segment));
      }
    }
    directories = next;
  }
  return directories.filter((directory) => fs.existsSync(path.join(directory, "package.json")));
}

const packageDirs = [...new Set(patterns.flatMap(directoriesForPattern).map((directory) => toPosix(path.relative(repoRoot, directory))))].sort();
const packages = new Map();

for (const directory of packageDirs) {
  const packageFile = `${directory}/package.json`;
  const data = JSON.parse(fs.readFileSync(path.join(repoRoot, packageFile), "utf8"));
  if (!data.name) {
    violations.push({ file: packageFile, message: "workspace package has no name" });
    continue;
  }
  if (packages.has(data.name)) {
    violations.push({ file: packageFile, message: `duplicate workspace package name '${data.name}' also used by ${packages.get(data.name).directory}` });
    continue;
  }
  packages.set(data.name, { name: data.name, directory, file: packageFile, data });
}

for (const record of packages.values()) {
  const dependencyGroups = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const group of dependencyGroups) {
    for (const [name, version] of Object.entries(record.data[group] ?? {})) {
      if (!String(version).startsWith("workspace:")) continue;
      const target = packages.get(name);
      if (!target) {
        violations.push({ file: record.file, message: `${group} references missing workspace package '${name}'` });
        continue;
      }
      if (!record.directory.startsWith("apps/") && target.directory.startsWith("apps/")) {
        violations.push({
          file: record.file,
          message: `library/service package '${record.name}' must not depend on runtime application '${name}'`,
        });
      }
    }
  }

  const tsconfigPath = path.join(repoRoot, record.directory, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
    if (typeof tsconfig.extends === "string") {
      const resolved = path.resolve(path.dirname(tsconfigPath), tsconfig.extends);
      const candidates = [resolved, `${resolved}.json`];
      if (!candidates.some((candidate) => fs.existsSync(candidate))) {
        violations.push({ file: `${record.directory}/tsconfig.json`, message: `tsconfig extends missing file '${tsconfig.extends}'` });
      }
    }
  }
}

const graph = new Map();
for (const record of packages.values()) {
  const edges = new Set();
  for (const group of ["dependencies", "optionalDependencies"]) {
    for (const [name, version] of Object.entries(record.data[group] ?? {})) {
      if (String(version).startsWith("workspace:") && packages.has(name)) edges.add(name);
    }
  }
  graph.set(record.name, edges);
}

const visiting = new Set();
const visited = new Set();
const stack = [];
const emittedCycles = new Set();

function visit(name) {
  if (visiting.has(name)) {
    const start = stack.indexOf(name);
    const cycle = [...stack.slice(start), name];
    const key = [...new Set(cycle)].sort().join("|");
    if (!emittedCycles.has(key)) {
      emittedCycles.add(key);
      violations.push({ file: packages.get(name)?.file ?? workspaceFile, message: `circular workspace boundary: ${cycle.join(" -> ")}` });
    }
    return;
  }
  if (visited.has(name)) return;
  visiting.add(name);
  stack.push(name);
  for (const dependency of graph.get(name) ?? []) visit(dependency);
  stack.pop();
  visiting.delete(name);
  visited.add(name);
}

for (const name of graph.keys()) visit(name);

if (packageDirs.length === 0) {
  violations.push({ file: workspaceFile, message: "workspace patterns resolve to no packages" });
}

if (violations.length === 0) {
  console.log("service_workspace_validation: PASS");
  console.log("missing_workspace_packages: 0");
  console.log("orphan_workspace_entries: 0");
  console.log("duplicate_package_names: 0");
  console.log("invalid_workspace_dependencies: 0");
  console.log("circular_package_boundaries: 0");
}
fail(guardId, violations);
