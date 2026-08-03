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

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function extractBracketEnumValues(block) {
  return sortedUnique([...block.matchAll(/^\s*([a-z][a-z0-9_]*)\s*,?\s*$/gm)].map((match) => match[1]));
}

function extractQuotedUnionValues(block) {
  return sortedUnique([...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
}

function checkWltPaymentSessionContractBinding() {
  const contractFile = "services/wlt/contracts/wlt.payments.openapi.yaml";
  const typesFile = "services/wlt/frontend/shared/dsh/payment/payment-session.types.ts";
  const contract = read(contractFile);
  const types = read(typesFile);

  const paymentStatusBlock = contract.match(/PaymentStatus:\s*\n\s*type:\s*string\s*\n\s*enum:\s*\n\s*\[\s*\n([\s\S]*?)\n\s*\]/)?.[1] ?? "";
  const contractStatuses = extractBracketEnumValues(paymentStatusBlock);
  const manualStatusBlock = types.match(/export\s+type\s+WltPaymentSessionStatus\s*=\s*([\s\S]*?);/)?.[1] ?? "";
  const manualStatuses = extractQuotedUnionValues(manualStatusBlock);

  if (contractStatuses.length === 0 || manualStatuses.length === 0 || contractStatuses.join("|") !== manualStatuses.join("|")) {
    violations.push({
      file: typesFile,
      message: `WLT_PAYMENT_STATUS_DTO_DRIFT contract=${contractStatuses.join(",")} manual=${manualStatuses.join(",")}`,
    });
  }

  const paymentSessionBlock = contract.match(/PaymentSession:\s*\n([\s\S]*?)\n    CreatePaymentSessionRequest:/)?.[1] ?? "";
  const contractPropertiesBlock = paymentSessionBlock.match(/\n      properties:\s*\n([\s\S]*)/)?.[1] ?? "";
  const contractProperties = sortedUnique(
    [...contractPropertiesBlock.matchAll(/^\s{8}([A-Za-z][A-Za-z0-9]*):\s*\{/gm)].map((match) => match[1]),
  );
  const manualSessionBlock = types.match(/export\s+type\s+WltPaymentSession\s*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  const manualProperties = sortedUnique(
    [...manualSessionBlock.matchAll(/readonly\s+([A-Za-z][A-Za-z0-9]*)\??:/g)].map((match) => match[1]),
  );

  if (contractProperties.length === 0 || manualProperties.length === 0 || contractProperties.join("|") !== manualProperties.join("|")) {
    violations.push({
      file: typesFile,
      message: `WLT_PAYMENT_SESSION_DTO_DRIFT contract=${contractProperties.join(",")} manual=${manualProperties.join(",")}`,
    });
  }
}

checkWltPaymentSessionContractBinding();

for (const file of listCodeFiles()) {
  const content = read(file);
  const surfaceMatch = file.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
  const isSurface = surfaceMatch && surfaceMatch[2] !== "shared";
  const currentSurface = isSurface ? surfaceMatch[2] : null;
  const isShared = file.startsWith("shared/") || file.includes("/frontend/shared/");

  if (/PUT\s+\/dsh\/operator\/workforce\/scopes\//.test(content) || /handleUpdateOperatorWorkforceScopes/.test(content)) {
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

  if (file.startsWith(wltSharedDshPath) && !mutationApproved) {
    const httpMutationRegex = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i;
    if (httpMutationRegex.test(content)) {
      violations.push({ file, message: "FORBIDDEN: mutation HTTP method in read-only boundary file" });
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
