import fs from "node:fs";
import path from "node:path";
import {
  fail,
  findImportSpecifiers,
  listCodeFiles,
  read,
  repoRoot,
  toPosix,
} from "./_guard-utils.mjs";

const guardId = "control-panel-architecture-contract";
const appRoot = "apps/control-panel/runtime";
const appPackage = "@bthwani/control-panel-runtime";
const sharedPackage = "@bthwani/control-panel";
const sharedRoot = "shared/control-panel";
const dshPackage = "@bthwani/dsh";
const dshRoot = "services/dsh";
const dshControlPanelRoot = `${dshRoot}/frontend/control-panel`;
const wltPackage = "@bthwani/wlt";
const appManifestPath = `${appRoot}/package.json`;
const sharedManifestPath = `${sharedRoot}/package.json`;
const dshManifestPath = `${dshRoot}/package.json`;
const appTsconfigPath = `${appRoot}/tsconfig.json`;

const forbiddenCrossServiceImports = [];
const unownedSharedModules = [];
const unexplainedArchitectureExceptions = [];

function packageRoot(specifier) {
  if (!specifier.startsWith("@")) return specifier.split("/")[0];
  return specifier.split("/").slice(0, 2).join("/");
}

function dependencyNames(manifest) {
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
}

function publicExportKey(specifier, packageName) {
  return specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`;
}

function resolveRelativeImport(file, specifier) {
  return toPosix(path.relative(repoRoot, path.resolve(path.dirname(path.join(repoRoot, file)), specifier)));
}

function checkDeclaredWorkspaceImport(file, specifier, declared) {
  const root = packageRoot(specifier);
  if (root.startsWith("@bthwani/") && !declared.has(root)) {
    unownedSharedModules.push({ file, message: `workspace import '${specifier}' is not owned by a declared dependency` });
  }
}

function checkPublicExport(file, specifier, packageName, exportsMap, label) {
  if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) return;
  const exportKey = publicExportKey(specifier, packageName);
  if (!Object.prototype.hasOwnProperty.call(exportsMap, exportKey)) {
    unownedSharedModules.push({ file, message: `${label} import '${specifier}' is not a declared public package export` });
  }
}

const appManifest = JSON.parse(read(appManifestPath));
const sharedManifest = JSON.parse(read(sharedManifestPath));
const dshManifest = JSON.parse(read(dshManifestPath));
const appDeclared = dependencyNames(appManifest);
const sharedDeclared = dependencyNames(sharedManifest);
const dshDeclared = dependencyNames(dshManifest);
const sharedExports = sharedManifest.exports ?? {};
const dshExports = dshManifest.exports ?? {};
const retiredAliases = ["@dsh-cp/", "@dsh-shared/", "@dsh-clients/", "@platform-control/"];

if (appManifest.name !== appPackage) unownedSharedModules.push({ file: appManifestPath, message: `runtime application must be named '${appPackage}', not '${appManifest.name ?? "<missing>"}'` });
if (sharedManifest.name !== sharedPackage) unownedSharedModules.push({ file: sharedManifestPath, message: `shared control-panel package must own '${sharedPackage}'` });
if (appManifest.exports !== undefined) unownedSharedModules.push({ file: appManifestPath, message: "runtime application must not expose source-library exports" });

for (const file of listCodeFiles().filter((candidate) => candidate.startsWith(`${appRoot}/`))) {
  for (const { specifier } of findImportSpecifiers(read(file))) {
    if (specifier.startsWith(".")) {
      const resolved = resolveRelativeImport(file, specifier);
      if (!resolved.startsWith(`${appRoot}/`) && resolved !== appRoot) forbiddenCrossServiceImports.push({ file, message: `relative import escapes control-panel runtime boundary: ${specifier}` });
      continue;
    }
    if (retiredAliases.some((prefix) => specifier.startsWith(prefix))) { forbiddenCrossServiceImports.push({ file, message: `retired source alias '${specifier}' bypasses a public package boundary` }); continue; }
    if (specifier === appPackage || specifier.startsWith(`${appPackage}/`)) forbiddenCrossServiceImports.push({ file, message: `runtime application self-import '${specifier}' exposes application internals` });
    checkPublicExport(file, specifier, sharedPackage, sharedExports, "control-panel shared UI");
    checkPublicExport(file, specifier, dshPackage, dshExports, "DSH control-panel");
    checkDeclaredWorkspaceImport(file, specifier, appDeclared);
  }
}

for (const file of listCodeFiles().filter((candidate) => candidate.startsWith(`${sharedRoot}/`))) {
  for (const { specifier } of findImportSpecifiers(read(file))) {
    if (specifier.startsWith(".")) {
      const resolved = resolveRelativeImport(file, specifier);
      if (!resolved.startsWith(`${sharedRoot}/`) && resolved !== sharedRoot) forbiddenCrossServiceImports.push({ file, message: `shared control-panel import escapes its package boundary: ${specifier}` });
      continue;
    }
    if (specifier === appPackage || specifier.startsWith(`${appPackage}/`) || specifier === dshPackage || specifier.startsWith(`${dshPackage}/`) || specifier === wltPackage || specifier.startsWith(`${wltPackage}/`) || retiredAliases.some((prefix) => specifier.startsWith(prefix))) {
      forbiddenCrossServiceImports.push({ file, message: `shared presentation package depends on runtime or domain source '${specifier}'` });
      continue;
    }
    checkDeclaredWorkspaceImport(file, specifier, sharedDeclared);
  }
}

for (const file of listCodeFiles().filter((candidate) => candidate.startsWith(`${dshControlPanelRoot}/`))) {
  for (const { specifier } of findImportSpecifiers(read(file))) {
    if (specifier.startsWith(".")) {
      const resolved = resolveRelativeImport(file, specifier);
      if (resolved.startsWith("apps/")) forbiddenCrossServiceImports.push({ file, message: `DSH control-panel import reaches runtime application source: ${specifier}` });
      if (resolved.startsWith("services/wlt/")) forbiddenCrossServiceImports.push({ file, message: `DSH control-panel import reaches WLT internals; use '${wltPackage}' public boundary: ${specifier}` });
      continue;
    }
    if (specifier === appPackage || specifier.startsWith(`${appPackage}/`)) { forbiddenCrossServiceImports.push({ file, message: `DSH control-panel depends on runtime application '${specifier}'` }); continue; }
    if (retiredAliases.some((prefix) => specifier.startsWith(prefix))) { forbiddenCrossServiceImports.push({ file, message: `DSH control-panel uses retired source alias '${specifier}'` }); continue; }
    checkPublicExport(file, specifier, sharedPackage, sharedExports, "control-panel shared UI");
    checkDeclaredWorkspaceImport(file, specifier, dshDeclared);
  }
}

for (const dependency of [sharedPackage, dshPackage, "@bthwani/ui-kit"]) if (!appDeclared.has(dependency)) unownedSharedModules.push({ file: appManifestPath, message: `control-panel runtime is missing declared dependency '${dependency}'` });
for (const dependency of [sharedPackage, "@bthwani/ui-kit"]) if (!dshDeclared.has(dependency)) unownedSharedModules.push({ file: dshManifestPath, message: `DSH control-panel is missing declared dependency '${dependency}'` });
if (dshDeclared.has(appPackage)) forbiddenCrossServiceImports.push({ file: dshManifestPath, message: `DSH must not depend on runtime application '${appPackage}'` });

for (const retiredPath of [
  `${appRoot}/src/components`, `${appRoot}/src/shell/DataTablePageFrame.tsx`, `${appRoot}/src/shell/DetailPageFrame.tsx`, `${appRoot}/src/shell/EditorPageFrame.tsx`, `${appRoot}/src/shell/FinanceReadOnlyFrame.tsx`, `${appRoot}/src/shell/MetricsPageFrame.tsx`, `${appRoot}/src/shell/OperationsRoomFrame.tsx`, `${appRoot}/src/shell/OverviewPageFrame.tsx`, `${appRoot}/src/shell/PaginationToolbar.tsx`, `${appRoot}/src/shell/QueuePageFrame.tsx`, `${appRoot}/src/shell/ReviewPageFrame.tsx`, `${appRoot}/src/shell/SettingsPageFrame.tsx`, `${appRoot}/src/shell/frameTokens.ts`, `${appRoot}/tsconfig.cancellation-journey.json`, `${appRoot}/tsconfig.order-journey.json`, `${appRoot}/tsconfig.partner-journey.json`,
]) if (fs.existsSync(path.join(repoRoot, retiredPath))) forbiddenCrossServiceImports.push({ file: retiredPath, message: "retired application-owned shared source remains live after workspace extraction" });

const appTsconfig = JSON.parse(read(appTsconfigPath));
for (const [alias, targets] of Object.entries(appTsconfig.compilerOptions?.paths ?? {})) {
  for (const target of Array.isArray(targets) ? targets : []) {
    const normalized = toPosix(target);
    if (normalized.includes("../services/") || normalized.includes("../core/") || normalized.includes("../shared/") || /apps\/app-[^/]+\/runtime\/node_modules/.test(normalized)) forbiddenCrossServiceImports.push({ file: appTsconfigPath, message: `path alias '${alias}' crosses a package or application source boundary: ${target}` });
  }
}

for (const exceptionFile of [`${appRoot}/architecture-exceptions.json`, `${appRoot}/architecture-allowlist.json`, `${sharedRoot}/architecture-exceptions.json`, `${sharedRoot}/architecture-allowlist.json`, `${dshControlPanelRoot}/architecture-exceptions.json`, `${dshControlPanelRoot}/architecture-allowlist.json`]) {
  if (fs.existsSync(path.join(repoRoot, exceptionFile))) unexplainedArchitectureExceptions.push({ file: exceptionFile, message: "architecture exceptions require governed ownership and are not accepted for this contract" });
}

console.log(`forbidden_cross_service_imports: ${forbiddenCrossServiceImports.length}`);
console.log(`unowned_shared_modules: ${unownedSharedModules.length}`);
console.log(`unexplained_architecture_exceptions: ${unexplainedArchitectureExceptions.length}`);
const violations = [...forbiddenCrossServiceImports, ...unownedSharedModules, ...unexplainedArchitectureExceptions];
if (violations.length === 0) console.log("control_panel_architecture_contract: PASS");
fail(guardId, violations);
