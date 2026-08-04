import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseIndexedContractModules, parseOpenApiContract } from "./_openapi-utils.mjs";
import { MUTATION_METHODS, extractApiCallSites, pathsAreCompatible } from "./lib/api-operations.mjs";

const guardId = "fullstack-boundary-gate";
const violations = [];

const tsconfigPath = path.join(repoRoot, "tsconfig.base.json");
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
const aliases = tsconfig?.compilerOptions?.paths ?? {};

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

// services/wlt/frontend/shared/dsh is the WLT-side integration layer. It may
// issue mutations, but only through the governed DSH facade: every mutating
// call must resolve to a real operation on a canonical DSH contract. That is an
// operation-level authority check, not a directory-level exemption, so a call
// to WLT directly, to an unknown path, or with a runtime-computed method is
// still a violation.
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

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function extractBracketEnumValues(block) {
  return sortedUnique([...block.matchAll(/^\s*([a-z][a-z0-9_]*)\s*,?\s*$/gm)].map((match) => match[1]));
}

function extractQuotedUnionValues(block) {
  return sortedUnique([...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
}



for (const file of listCodeFiles()) {
  const content = read(file);
  const surfaceMatch = file.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
  const isSurface = surfaceMatch && surfaceMatch[2] !== "shared";
  const currentSurface = isSurface ? surfaceMatch[2] : null;
  const isShared = file.startsWith("shared/") || file.includes("/frontend/shared/");

  if (!file.startsWith("tools/guards/") && (/PUT\s+\/dsh\/operator\/workforce\/scopes\//.test(content) || /handleUpdateOperatorWorkforceScopes/.test(content))) {
    violations.push({
      file,
      message: "FORBIDDEN: DSH may read Workforce scopes only; assignment/scope mutations belong to Workforce",
    });
  }

  if (isSurface) {
    if (/\bfetch\(/.test(content)) {
      violations.push({ file, message: "direct fetch() call in surface — move to shared API adapter" });
    }
    if (/\baxios\b/.test(content)) {
      violations.push({ file, message: "axios import in surface — move to shared API adapter" });
    }
    if (/process\.env/.test(content)) {
      violations.push({ file, message: "direct process.env access in surface — move to shared brain config" });
    }
    if (/\bnew\s+URL\(/.test(content)) {
      violations.push({ file, message: "direct new URL() call in surface — move to config/adapter" });
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/https?:\/\//.test(line) && !/^\s*(\/\/|\/\*|\*)/.test(line)) {
        if (!/https?:\/\/(?:\.\.\.|example\.com)/i.test(line)) {
          violations.push({
            file,
            line: i + 1,
            message: `hardcoded runtime URL in surface: "${line.trim()}"`,
          });
        }
      }
    }
  }

  const isDshFrontendOrAppRuntime = file.startsWith("services/dsh/frontend/") || file.startsWith("apps/");
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
        violations.push({
          file,
          line: site.line,
          message: `FORBIDDEN: ${site.method} to a runtime-computed path cannot be proven against a governed DSH operation; pass an explicit contract path`,
        });
        continue;
      }
      // A computed method is unprovable, so it is rejected regardless of path.
      if (site.methodSource === "dynamic") {
        violations.push({
          file,
          line: site.line,
          message: `FORBIDDEN: runtime-computed HTTP method for '${site.path}' cannot be proven against a governed DSH operation`,
        });
        continue;
      }
      // "absent" means a read helper such as tryGet(path, mapper): no options
      // object, so the call carries no mutation intent.
      if (site.methodSource === "absent" || !MUTATION_METHODS.has(site.method)) continue;

      if (!site.path.startsWith("/dsh/")) {
        violations.push({
          file,
          line: site.line,
          message: `FORBIDDEN: ${site.method} ${site.path} does not go through the governed DSH facade; surfaces must never mutate WLT directly`,
        });
        continue;
      }
      if (!governedDshOperationExists(site.method, site.path)) {
        violations.push({
          file,
          line: site.line,
          message: `FORBIDDEN: ${site.method} ${site.path} is not a governed DSH contract operation`,
        });
      }
    }
  }

  const specs = findImportSpecifiers(content);
  for (const { specifier, index } of specs) {
    const resolved = resolveSpecifier(file, specifier);
    if (resolved.includes("node_modules/")) continue;

    if (isSurface) {
      const resolvedSurfaceMatch = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
      if (resolvedSurfaceMatch) {
        const resolvedSurface = resolvedSurfaceMatch[2];
        if (resolvedSurface !== "shared" && resolvedSurface !== currentSurface) {
          violations.push({
            file,
            line: lineNumber(content, index),
            message: `FORBIDDEN: importing from other surface '${resolvedSurface}' (resolved: ${resolved})`,
          });
        }
      }

      // Shared API adapters are the approved surface boundary. Surfaces still
      // cannot reach backend/generated clients or internal controller cores.
      if (
        /^services\/[^/]+\/(backend|clients|generated)\//.test(resolved) ||
        resolved.endsWith(".controller-core") ||
        resolved.includes(".controller-core.") ||
        resolved.includes(".controller-core/")
      ) {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: importing backend/client/generated/controller-core directly (resolved: ${resolved})`,
        });
      }
    }

    if (isShared) {
      const resolvedSurfaceMatch = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
      if (resolvedSurfaceMatch && resolvedSurfaceMatch[2] !== "shared") {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: shared brain importing from surface '${resolvedSurfaceMatch[2]}' (resolved: ${resolved})`,
        });
      }

      if (resolved.startsWith("apps/")) {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: shared brain importing from apps runtime (resolved: ${resolved})`,
        });
      }
    }
  }
}

fail(guardId, violations);
