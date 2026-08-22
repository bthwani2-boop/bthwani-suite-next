import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseIndexedContractModules, parseOpenApiContract } from "./_openapi-utils.mjs";
import { MUTATION_METHODS, extractApiCallSites, pathsAreCompatible } from "./lib/api-operations.mjs";
import { isForbiddenAppRuntimeDshImport } from "./lib/fullstack-boundary-rules.mjs";

const guardId = "fullstack-boundary-gate";
const violations = [];

const tsconfigPath = path.join(repoRoot, "tsconfig.base.json");
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
const aliases = tsconfig?.compilerOptions?.paths ?? {};

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
const APP_RUNTIME_ROOT = "apps/";

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

function resolveSpecifier(file, specifier) {
  for (const [alias, targets] of Object.entries(aliases)) {
    const target = targets[0];
    if (!target) continue;
    if (specifier === alias) return target;
    if (alias.endsWith("/*") && specifier.startsWith(alias.slice(0, -2))) {
      return target.replace(/\/\*$/, specifier.slice(alias.length - 2));
    }
  }
  if (specifier.startsWith(".") || specifier.startsWith("..")) {
    const baseDir = path.dirname(file);
    const resolved = path.resolve(repoRoot, baseDir, specifier);
    return toPosix(path.relative(repoRoot, resolved));
  }
  return specifier;
}

const wltSharedDshPath = "services/wlt/frontend/shared/dsh/";

const governedOperations = (() => {
  const masterContractPath = "contracts/openapi/index.yaml";
  try {
    const entryModules = parseIndexedContractModules(masterContractPath)
      .filter((module) => module.exists)
      .map((module) => module.file);
    const allModules = new Set(entryModules);
    for (const entry of entryModules) {
      for (const nested of parseIndexedContractModules(entry)) {
        if (nested.exists) allModules.add(nested.file);
      }
    }
    return [...allModules].flatMap((relative) => parseOpenApiContract(relative));
  } catch (error) {
    violations.push({
      file: masterContractPath,
      message: `GOVERNED_OPERATIONS_UNRESOLVABLE ${error.message}`,
    });
    return [];
  }
})();

function governedDshOperationExists(method, rawPath) {
  return governedOperations.some(
    (operation) => operation.method === method && pathsAreCompatible(rawPath, operation.path),
  );
}

const FINANCIAL_MUTATION_PATTERNS = [
  /wallet_balance_mutation/,
  /payment_confirmation/,
  /refund_finalization/,
  /settlement_posting/,
  /ledger_entry_mutation/,
  /\bmutateWallet\b/,
  /\bconfirmPayment\b/,
  /\bfinalizeRefund\b/,
];

for (const file of listCodeFiles()) {
  const content = read(file);
  const surfaceMatch = file.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
  const isSurface = surfaceMatch && surfaceMatch[2] !== "shared";
  const currentSurface = isSurface ? surfaceMatch[2] : null;
  const isShared = file.startsWith("shared/") || file.includes("/frontend/shared/");
  const isControlPanel = startsWithAny(file, CONTROL_PANEL_ROOTS);
  const isMobile = startsWithAny(file, MOBILE_ROOTS);

  if (!file.startsWith("tools/guards/") && (/PUT\s+\/dsh\/operator\/workforce\/scopes\//.test(content) || /handleUpdateOperatorWorkforceScopes/.test(content))) {
    violations.push({
      file,
      message: "FORBIDDEN: DSH may read Workforce scopes only; assignment/scope mutations belong to Workforce",
    });
  }

  if (isSurface) {
    if (/\bfetch\(/.test(content)) violations.push({ file, message: "direct fetch() call in surface — move to shared API adapter" });
    if (/\baxios\b/.test(content)) violations.push({ file, message: "axios import in surface — move to shared API adapter" });
    if (/process\.env/.test(content)) violations.push({ file, message: "direct process.env access in surface — move to shared brain config" });
    if (/\bnew\s+URL\(/.test(content)) violations.push({ file, message: "direct new URL() call in surface — move to config/adapter" });

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/https?:\/\//.test(line) && !/^\s*(\/\/|\/\*|\*)/.test(line) && !/https?:\/\/(?:\.\.\.|example\.com)/i.test(line)) {
        violations.push({ file, line: i + 1, message: `hardcoded runtime URL in surface: "${line.trim()}"` });
      }
    }
  }

  const isDshFrontendOrAppRuntime = file.startsWith("services/dsh/frontend/") || file.startsWith("apps/");
  const isAppRuntime = file.startsWith(APP_RUNTIME_ROOT);
  if (isDshFrontendOrAppRuntime) {
    for (const pattern of FINANCIAL_MUTATION_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({ file, message: `FORBIDDEN: DSH surface/app runtime contains financial mutation '${pattern.source}' — only WLT owns financial mutations` });
      }
    }
  }

  if (file.startsWith(wltSharedDshPath)) {
    for (const site of extractApiCallSites(file, content, { reportUnresolvedMutationPaths: true })) {
      if (site.path === null) {
        violations.push({ file, line: site.line, message: `FORBIDDEN: ${site.method} to a runtime-computed path cannot be proven against a governed DSH operation` });
        continue;
      }
      if (site.methodSource === "dynamic") {
        violations.push({ file, line: site.line, message: `FORBIDDEN: runtime-computed HTTP method for '${site.path}' cannot be proven against a governed DSH operation` });
        continue;
      }
      if (site.methodSource === "absent" || !MUTATION_METHODS.has(site.method)) continue;
      if (!site.path.startsWith("/dsh/")) {
        violations.push({ file, line: site.line, message: `FORBIDDEN: ${site.method} ${site.path} bypasses the governed DSH facade` });
        continue;
      }
      if (!governedDshOperationExists(site.method, site.path)) {
        violations.push({ file, line: site.line, message: `FORBIDDEN: ${site.method} ${site.path} is not a governed DSH contract operation` });
      }
    }
  }

  for (const { specifier, index } of findImportSpecifiers(content)) {
    const resolved = resolveSpecifier(file, specifier);
    if (resolved.includes("node_modules/")) continue;
    const line = lineNumber(content, index);

    if (isControlPanel) {
      if (isNativePackage(specifier)) {
        violations.push({ file, line, message: `FORBIDDEN: control-panel imports native package '${specifier}' directly` });
      }
      if (startsWithAny(`${resolved}/`, MOBILE_ROOTS) || resolved.startsWith(MOBILE_SHARED_ROOT)) {
        violations.push({ file, line, message: `FORBIDDEN: control-panel imports mobile-owned code '${specifier}' (resolved: ${resolved})` });
      }
    }

    if (isMobile) {
      if (isWebOnlyPackage(specifier)) {
        violations.push({ file, line, message: `FORBIDDEN: mobile surface imports web-only package '${specifier}'` });
      }
      if (startsWithAny(`${resolved}/`, CONTROL_PANEL_ROOTS) || resolved.startsWith(WEB_SHARED_ROOT)) {
        violations.push({ file, line, message: `FORBIDDEN: mobile surface imports web-owned code '${specifier}' (resolved: ${resolved})` });
      }
    }

    if (isSurface) {
      const resolvedSurfaceMatch = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
      if (resolvedSurfaceMatch) {
        const resolvedSurface = resolvedSurfaceMatch[2];
        if (resolvedSurface !== "shared" && resolvedSurface !== currentSurface) {
          violations.push({ file, line, message: `FORBIDDEN: importing from other surface '${resolvedSurface}' (resolved: ${resolved})` });
        }
      }
      if (
        /^services\/[^/]+\/(backend|clients|generated)\//.test(resolved) ||
        resolved.endsWith(".controller-core") ||
        resolved.includes(".controller-core.") ||
        resolved.includes(".controller-core/")
      ) {
        violations.push({ file, line, message: `FORBIDDEN: importing backend/client/generated/controller-core directly (resolved: ${resolved})` });
      }
    }

    if (isAppRuntime && isForbiddenAppRuntimeDshImport(file, resolved)) {
      violations.push({ file, line, message: `FORBIDDEN: app runtime imports DSH implementation directly; use an @bthwani/dsh public export (resolved: ${resolved})` });
    }

    if (isShared) {
      const resolvedSurfaceMatch = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
      if (resolvedSurfaceMatch && resolvedSurfaceMatch[2] !== "shared") {
        violations.push({ file, line, message: `FORBIDDEN: shared brain importing from surface '${resolvedSurfaceMatch[2]}' (resolved: ${resolved})` });
      }
      if (resolved.startsWith("apps/")) {
        violations.push({ file, line, message: `FORBIDDEN: shared brain importing from apps runtime (resolved: ${resolved})` });
      }
    }
  }
}

fail(guardId, violations);
