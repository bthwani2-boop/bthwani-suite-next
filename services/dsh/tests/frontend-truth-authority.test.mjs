import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function repositoryPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(repositoryPath(relativePath), "utf8");
}

function listSourceFiles(relativeRoot) {
  const absoluteRoot = repositoryPath(relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];

  const files = [];
  const stack = [absoluteRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", "dist", "build", ".next", "coverage", "generated"].includes(entry.name)) {
          continue;
        }
        stack.push(absolutePath);
        continue;
      }
      if (!/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) continue;
      if (/\.(?:test|spec)\./.test(entry.name)) continue;
      files.push(absolutePath);
    }
  }

  return files;
}

function relativeToRepository(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).split(path.sep).join("/");
}

const retiredParallelAuthorities = [
  "services/dsh/frontend/shared/checkout/checkout-contract.ts",
  "services/dsh/frontend/shared/checkout/dsh-client-binding.contracts.ts",
  "services/dsh/frontend/shared/identity-access/dsh-role-permission.model.ts",
  "services/wlt/frontend/shared/dsh/payment/wlt-payment-session.types.ts",
  "services/wlt/frontend/control-panel/_skeleton-proof/WltFinanceReadOnlySkeletonProof.tsx",
];

const numericFinancialTruthPatterns = [
  /\b(?:commissionRate|platformCommissionRate|platformFeeRate|serviceFeeRate|feeRate|settlementRate|refundRate|payoutRate|commissionPercent|commissionPercentage|commissionBasisPoints|commissionBps)\s*:\s*-?\d+(?:\.\d+)?\b/g,
  /\b(?:commissionRate|platformCommissionRate|platformFeeRate|serviceFeeRate|feeRate|settlementRate|refundRate|payoutRate|commissionPercent|commissionPercentage|commissionBasisPoints|commissionBps)\s*=\s*-?\d+(?:\.\d+)?\b/g,
];

describe("DSH/WLT frontend truth authority", () => {
  it("keeps retired parallel contract and authorization authorities deleted", () => {
    for (const relativePath of retiredParallelAuthorities) {
      assert.equal(
        fs.existsSync(repositoryPath(relativePath)),
        false,
        `retired parallel authority must stay deleted: ${relativePath}`,
      );
    }
  });

  it("keeps the shared delivery contract presentation-only", () => {
    const source = read("services/dsh/frontend/shared/delivery/delivery.contract.ts");
    const forbiddenAuthorityMarkers = [
      "defaultServiceModes",
      "operationalOwner",
      "financialOwner",
      "requiresCaptain",
      "requiresPartnerCourier",
      "requiresCustomerPickup",
      "cartSummaryBehavior",
      "clientCheckoutBehavior",
      "partnerPreparationBehavior",
      "controlPanelDispatchBehavior",
      "trackingTimelineBehavior",
      "notificationEvents",
      "wltDisplayImpactOnly",
      "forbiddenUiClaims",
    ];

    for (const marker of forbiddenAuthorityMarkers) {
      assert.equal(
        source.includes(marker),
        false,
        `delivery presentation contract must not regain operational or financial authority: ${marker}`,
      );
    }
  });

  it("does not synthesize audit or RBAC truth in operations surfaces", () => {
    const detailWorkspace = read(
      "services/dsh/frontend/control-panel/operations/AuditTrailDetailWorkspace.tsx",
    );
    const auditScreen = read(
      "services/dsh/frontend/control-panel/operations/AuditSupportSlaScreen.tsx",
    );

    for (const marker of [
      "DshAuditEntry",
      "DSH_AUDIT_ENTRIES",
      "getDshRolePermission",
      "getDshRoleArabicName",
      "UI preview",
      "no runtime auth",
    ]) {
      assert.equal(
        detailWorkspace.includes(marker),
        false,
        `audit detail must not restore local audit or RBAC authority: ${marker}`,
      );
    }

    for (const marker of [
      "getDynamicUiAudits",
      "resolveAuditEntry",
      "التدقيقات اليدوية",
      "سجل التدقيق والمتابعة (Preview)",
    ]) {
      assert.equal(
        auditScreen.includes(marker),
        false,
        `audit screen must not restore preview audit truth: ${marker}`,
      );
    }
  });

  it("does not hard-code financial rates in DSH frontend source", () => {
    const violations = [];

    for (const absolutePath of listSourceFiles("services/dsh/frontend")) {
      const source = fs.readFileSync(absolutePath, "utf8");
      for (const pattern of numericFinancialTruthPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(source)) !== null) {
          const line = source.slice(0, match.index).split("\n").length;
          violations.push(`${relativeToRepository(absolutePath)}:${line}:${match[0]}`);
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `financial rates must be returned by governed DSH/WLT contracts, not defined in frontend source:\n${violations.join("\n")}`,
    );
  });

  it("does not retain contract-only runtime placeholders in live frontend roots", () => {
    const violations = [];

    for (const relativeRoot of ["services/dsh/frontend", "services/wlt/frontend"]) {
      for (const absolutePath of listSourceFiles(relativeRoot)) {
        const source = fs.readFileSync(absolutePath, "utf8");
        if (/\bCONTRACT_ONLY\b/.test(source)) {
          violations.push(relativeToRepository(absolutePath));
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `contract-only placeholders are not live runtime implementations:\n${violations.join("\n")}`,
    );
  });
});
