import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

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
const approvalPath = path.join(repoRoot, wltSharedDshPath, ".wlt-mutation-approved");
const mutationApproved = fs.existsSync(approvalPath);

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
  
  // 1. Identify surface
  // A file is in a surface if it matches services/*/frontend/<surface>/... where <surface> is not 'shared'
  const surfaceMatch = file.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
  const isSurface = surfaceMatch && surfaceMatch[2] !== "shared";
  const currentSurface = isSurface ? surfaceMatch[2] : null;

  // 2. Identify shared frontend
  const isShared = file.startsWith("shared/") || file.includes("/frontend/shared/");

  // 3. Surface code checks
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
    
    // Check for hardcoded URLs (ignoring comments and placeholder/example URLs)
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/https?:\/\//.test(line) && !/^\s*(\/\/|\/\*|\*)/.test(line)) {
        if (!/https?:\/\/(?:\.\.\.|example\.com)/i.test(line)) {
          violations.push({
            file,
            line: i + 1,
            message: `hardcoded runtime URL in surface: "${line.trim()}"`
          });
        }
      }
    }
  }

  // 4. DSH frontend / apps runtime financial mutation check
  const isDshFrontendOrAppRuntime = file.startsWith("services/dsh/frontend/") || file.startsWith("apps/");
  if (isDshFrontendOrAppRuntime) {
    for (const pattern of FINANCIAL_MUTATION_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({ file, message: `FORBIDDEN: DSH surface/app runtime contains financial mutation '${pattern.source}' — only WLT owns financial mutations` });
      }
    }
  }

  // 5. WLT shared boundary mutation HTTP methods check
  if (file.startsWith(wltSharedDshPath) && !mutationApproved) {
    const httpMutationRegex = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i;
    if (httpMutationRegex.test(content)) {
      violations.push({ file, message: "FORBIDDEN: mutation HTTP method in read-only boundary file" });
    }
  }

  // 6. Import-based checks
  const specs = findImportSpecifiers(content);
  for (const { specifier, index } of specs) {
    const resolved = resolveSpecifier(file, specifier);
    if (resolved.includes("node_modules/")) continue;

    if (isSurface) {
      // Surfaces must not import other surfaces
      const resolvedSurfaceMatch = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
      if (resolvedSurfaceMatch) {
        const resolvedSurface = resolvedSurfaceMatch[2];
        if (resolvedSurface !== "shared" && resolvedSurface !== currentSurface) {
          violations.push({
            file,
            line: lineNumber(content, index),
            message: `FORBIDDEN: importing from other surface '${resolvedSurface}' (resolved: ${resolved})`
          });
        }
      }

      // Surfaces must not import backend, generated, or clients directly
      if (
        /^services\/[^/]+\/(backend|clients|generated)\//.test(resolved) ||
        resolved.endsWith(".api") ||
        resolved.includes(".api.") ||
        resolved.includes(".api/") ||
        resolved.endsWith(".controller-core") ||
        resolved.includes(".controller-core.") ||
        resolved.includes(".controller-core/")
      ) {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: importing backend/client/generated/api/controller-core directly (resolved: ${resolved})`
        });
      }
    }

    if (isShared) {
      // Shared brain must not import from surfaces
      const resolvedSurfaceMatch = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
      if (resolvedSurfaceMatch && resolvedSurfaceMatch[2] !== "shared") {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: shared brain importing from surface '${resolvedSurfaceMatch[2]}' (resolved: ${resolved})`
        });
      }

      // Shared brain must not import from apps runtime
      if (resolved.startsWith("apps/")) {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: shared brain importing from apps runtime (resolved: ${resolved})`
        });
      }
    }
  }
}

fail(guardId, violations);
