import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "control-panel-architecture-contract";
const violations = [];
const appRoot = "apps/control-panel/runtime";
const manifestPath = `${appRoot}/package.json`;
const tsconfigPath = `${appRoot}/tsconfig.json`;
const forbiddenAliasPrefixes = [
  "@dsh-cp/",
  "@dsh-shared/",
  "@dsh-clients/",
  "@platform-control/",
  "@bthwani/core-platform-control/",
  "@bthwani/core-providers/",
];

function packageRoot(specifier) {
  if (!specifier.startsWith("@")) return specifier.split("/")[0];
  return specifier.split("/").slice(0, 2).join("/");
}

const manifest = JSON.parse(read(manifestPath));
const declared = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
]);

for (const file of listCodeFiles().filter((candidate) => candidate.startsWith(`${appRoot}/`))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    const specifier = item.specifier;
    if (specifier.startsWith(".")) {
      const resolved = toPosix(path.relative(repoRoot, path.resolve(path.dirname(path.join(repoRoot, file)), specifier)));
      if (!resolved.startsWith(`${appRoot}/`) && resolved !== appRoot) {
        violations.push({ file, message: `relative import escapes control-panel runtime boundary: ${specifier}` });
      }
      continue;
    }

    if (forbiddenAliasPrefixes.some((prefix) => specifier.startsWith(prefix))) {
      violations.push({
        file,
        message: `source alias '${specifier}' bypasses a declared workspace package boundary`,
      });
      continue;
    }

    const root = packageRoot(specifier);
    if ((root.startsWith("@bthwani/") || root.startsWith("@identity/")) && !declared.has(root)) {
      violations.push({ file, message: `workspace import '${specifier}' is not owned by a declared dependency` });
    }
  }
}

const tsconfig = JSON.parse(read(tsconfigPath));
for (const [alias, targets] of Object.entries(tsconfig.compilerOptions?.paths ?? {})) {
  for (const target of Array.isArray(targets) ? targets : []) {
    const normalized = toPosix(target);
    if (
      normalized.includes("../services/") ||
      normalized.includes("../core/") ||
      normalized.includes("../shared/") ||
      /apps\/app-[^/]+\/runtime\/node_modules/.test(normalized)
    ) {
      violations.push({
        file: tsconfigPath,
        message: `path alias '${alias}' crosses an undeclared source or application boundary: ${target}`,
      });
    }
  }
}

for (const exceptionFile of [
  `${appRoot}/architecture-exceptions.json`,
  `${appRoot}/architecture-allowlist.json`,
]) {
  if (fs.existsSync(path.join(repoRoot, exceptionFile))) {
    violations.push({ file: exceptionFile, message: "architecture exceptions require explicit governed ownership and are not accepted here" });
  }
}

if (violations.length === 0) {
  console.log("control_panel_architecture_contract: PASS");
  console.log("forbidden_cross_service_imports: 0");
  console.log("unowned_shared_modules: 0");
  console.log("unexplained_architecture_exceptions: 0");
}
fail(guardId, violations);
