import fs from "node:fs";
import path from "node:path";
import {
  fail,
  findImportSpecifiers,
  lineNumber,
  listCodeFiles,
  read,
  repoRoot,
  toPosix,
} from "./_guard-utils.mjs";

const guardId = "dsh-platform-boundary-gate";
const violations = [];

const DSH_PACKAGE = "services/dsh/package.json";
const CONTROL_PANEL_ROOTS = [
  "services/dsh/frontend/control-panel/",
  "apps/control-panel/",
];
const MOBILE_ROOTS = [
  "services/dsh/frontend/app-client/",
  "services/dsh/frontend/app-partner/",
  "services/dsh/frontend/app-captain/",
  "services/dsh/frontend/app-field/",
  "apps/app-client/",
  "apps/app-partner/",
  "apps/app-captain/",
  "apps/app-field/",
];
const WEB_SHARED_ROOT = "services/dsh/frontend/shared/platform/web/";
const MOBILE_SHARED_ROOT = "services/dsh/frontend/shared/platform/mobile/";

function startsWithAny(value, prefixes) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function isNativePackage(specifier) {
  return specifier === "react-native"
    || specifier.startsWith("react-native/")
    || specifier.startsWith("react-native-")
    || specifier.startsWith("@react-native-")
    || specifier.startsWith("expo-")
    || specifier.startsWith("@expo/");
}

function isWebOnlyPackage(specifier) {
  return specifier === "next"
    || specifier.startsWith("next/")
    || specifier === "react-dom"
    || specifier.startsWith("react-dom/")
    || specifier === "react-native-web"
    || specifier.startsWith("react-native-web/")
    || specifier === "@bthwani/control-panel"
    || specifier.startsWith("@bthwani/control-panel/");
}

function resolveLocal(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  const absolute = path.resolve(repoRoot, path.dirname(file), specifier);
  return toPosix(path.relative(repoRoot, absolute));
}

for (const file of listCodeFiles()) {
  const isControlPanel = startsWithAny(file, CONTROL_PANEL_ROOTS);
  const isMobile = startsWithAny(file, MOBILE_ROOTS);
  if (!isControlPanel && !isMobile) continue;

  const content = read(file);
  for (const { specifier, index } of findImportSpecifiers(content)) {
    const line = lineNumber(content, index);
    const resolved = resolveLocal(file, specifier);

    if (isControlPanel) {
      if (isNativePackage(specifier)) {
        violations.push({
          file,
          line,
          message: `FORBIDDEN: control-panel imports native package '${specifier}' directly; use a web/platform-neutral adapter`,
        });
      }
      if (resolved && (startsWithAny(`${resolved}/`, MOBILE_ROOTS) || resolved.startsWith(MOBILE_SHARED_ROOT))) {
        violations.push({
          file,
          line,
          message: `FORBIDDEN: control-panel imports mobile-owned code '${specifier}' (resolved: ${resolved})`,
        });
      }
    }

    if (isMobile) {
      if (isWebOnlyPackage(specifier)) {
        violations.push({
          file,
          line,
          message: `FORBIDDEN: mobile surface imports web-only package '${specifier}'`,
        });
      }
      if (resolved && (startsWithAny(`${resolved}/`, CONTROL_PANEL_ROOTS) || resolved.startsWith(WEB_SHARED_ROOT))) {
        violations.push({
          file,
          line,
          message: `FORBIDDEN: mobile surface imports web-owned code '${specifier}' (resolved: ${resolved})`,
        });
      }
    }
  }
}

const dshPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, DSH_PACKAGE), "utf8"));
const boundary = dshPackage["x-bthwani-platform-boundary"];

if (!boundary || typeof boundary !== "object" || Array.isArray(boundary)) {
  violations.push({ file: DSH_PACKAGE, message: "missing x-bthwani-platform-boundary contract" });
} else {
  if (boundary.status !== "LEGACY_MIXED_PACKAGE_QUARANTINE") {
    violations.push({ file: DSH_PACKAGE, message: "platform boundary status must remain LEGACY_MIXED_PACKAGE_QUARANTINE until the split is completed" });
  }
  if (boundary.target !== "PLATFORM_NEUTRAL_CORE_WITH_EXPLICIT_WEB_AND_MOBILE_ADAPTERS") {
    violations.push({ file: DSH_PACKAGE, message: "platform boundary target must remain explicit core/web/mobile separation" });
  }
  if (boundary.canonicalNativeDependencyOwner !== "apps/*/runtime") {
    violations.push({ file: DSH_PACKAGE, message: "mobile runtimes must remain the canonical owners of native dependencies" });
  }

  const quarantine = Array.isArray(boundary.legacyNativeDependencyQuarantine)
    ? new Set(boundary.legacyNativeDependencyQuarantine)
    : new Set();
  const declaredDependencies = {
    ...(dshPackage.dependencies ?? {}),
    ...(dshPackage.peerDependencies ?? {}),
    ...(dshPackage.optionalDependencies ?? {}),
  };
  const nativeDependencies = Object.keys(declaredDependencies).filter(isNativePackage);

  for (const dependency of nativeDependencies) {
    if (!quarantine.has(dependency)) {
      violations.push({
        file: DSH_PACKAGE,
        message: `FORBIDDEN: new native dependency '${dependency}' added to @bthwani/dsh root; add it to the owning mobile runtime instead`,
      });
    }
  }
}

fail(guardId, violations);
