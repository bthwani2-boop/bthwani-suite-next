import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "../..");
const failures = [];

function resolve(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function read(relativePath) {
  try {
    return fs.readFileSync(resolve(relativePath), "utf8");
  } catch (error) {
    failures.push(`${relativePath}: missing or unreadable (${error.message})`);
    return "";
  }
}

function readJson(relativePath) {
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`${relativePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function requireIncludes(source, expected, label) {
  for (const value of expected) {
    if (!source.includes(value)) failures.push(`${label}: missing ${value}`);
  }
}

function requireAbsent(source, forbidden, label) {
  for (const value of forbidden) {
    if (source.includes(value)) failures.push(`${label}: forbidden value present: ${value}`);
  }
}

const truthPath = "governance/product/contracts/jrn-031-administration-roles-approvals-audit.product-truth.json";
const ledgerPath = "governance/approvals/jrn-031-independent-approvals.json";
const evidencePath = "governance/evidence/jrn-031-administration-governance-evidence.md";
const ciPath = ".github/workflows/ci.yml";

const truth = readJson(truthPath);
const ledger = readJson(ledgerPath);
const evidence = read(evidencePath);
const ci = read(ciPath);

const requiredApprovals = [
  "product-manager",
  "product-owner",
  "independent-quality",
  "application-security",
  "release-production",
];

if (truth) {
  if (truth.journeyId !== "JRN-031") failures.push("product truth: journeyId must be JRN-031");
  if (truth.status !== "PENDING_INDEPENDENT_APPROVAL") failures.push("product truth: status must remain PENDING_INDEPENDENT_APPROVAL until independent reviews exist");
  if (truth.scopeBoundary !== "platform-control-plane") failures.push("product truth: scopeBoundary must be platform-control-plane");
  if (JSON.stringify(truth.independentApprovalsRequired) !== JSON.stringify(requiredApprovals)) {
    failures.push("product truth: independent approval roles do not match the governed set");
  }
}

if (ledger) {
  if (ledger.journeyId !== "JRN-031") failures.push("approval ledger: journeyId must be JRN-031");
  if (ledger.approvalState !== "PENDING_INDEPENDENT_APPROVAL") failures.push("approval ledger: approvalState must remain pending until all reviews are recorded");
  if (!ledger.rules?.selfApprovalForbidden || !ledger.rules?.implementationAgentCannotApprove) {
    failures.push("approval ledger: self-approval protections must remain enabled");
  }
  const roles = ledger.approvals?.map((approval) => approval.role) ?? [];
  if (JSON.stringify(roles) !== JSON.stringify(requiredApprovals)) failures.push("approval ledger: approval roles do not match the governed set");
  for (const approval of ledger.approvals ?? []) {
    if (approval.status === "approved") {
      if (!approval.approver || !approval.reviewUrl || !approval.reviewedCommit || !approval.reviewedAt) {
        failures.push(`approval ledger: approved ${approval.role} entry is missing immutable review evidence`);
      }
    } else if (approval.status !== "pending") {
      failures.push(`approval ledger: unsupported status ${approval.status} for ${approval.role}`);
    } else if (approval.approver || approval.reviewUrl || approval.reviewedCommit || approval.reviewedAt) {
      failures.push(`approval ledger: pending ${approval.role} entry must not contain fabricated approval evidence`);
    }
  }
}

requireIncludes(ci, [
  "jrn031:",
  "Verify JRN-031 administration governance",
  "services/dsh/database/tests/jrn-031-administration-governance.sql",
  "services/dsh/tests/jrn-031-administration-maker-checker.test.mjs",
  "services/dsh/tests/jrn-031-administration-governance.test.mjs",
  "tsconfig.jrn-031.json",
  "dsh.administration.openapi.yaml",
  "jrn-031-closure-gate.mjs",
], "consolidated CI");

requireIncludes(evidence, [
  "IMPLEMENTED_AND_VERIFIED_READY_FOR_INDEPENDENT_APPROVAL",
  "governance/approvals/jrn-031-independent-approvals.json",
  ".github/workflows/ci.yml",
  "PENDING_INDEPENDENT_APPROVAL",
], "closure evidence");
requireAbsent(evidence, ["The permanent JRN-031 verification workflow remains in the repository."], "closure evidence");

const migration = read("services/dsh/database/migrations/dsh-131_jrn031_governed_administration_closure.sql");
requireIncludes(migration, [
  "dsh_admin_roles_surfaces_scope",
  "dsh_admin_rollback_requests",
  "dsh_admin_audit_append_only_guard",
  "BEFORE UPDATE OR DELETE ON dsh_admin_audit",
], "JRN-031 migration");

const permission = read("services/dsh/backend/internal/http/administration_permission.go");
requireIncludes(permission, ["AdministrationPermissionCandidates", "ActorHasPermission", 'permission.Surface != "control-panel"'], "administration permission gate");
requireAbsent(permission, ['HasRole("operator")', "PhoneE164"], "administration permission gate");

const routes = read("services/dsh/backend/internal/http/journey_031_routes_test.go");
requireIncludes(routes, [
  "POST /dsh/operator/admin/roles/requests",
  "POST /dsh/operator/admin/approvals/{approvalId}/rollback-requests",
  "GET /dsh/operator/admin/diagnostics",
  "GET /dsh/operator/admin/audit",
], "JRN-031 protected routes");

const contract = read("services/dsh/contracts/dsh.administration.openapi.yaml");
requireIncludes(contract, [
  "operationId: requestDshAdministrationRoleDefinition",
  "operationId: requestDshStaffRoleChange",
  "operationId: requestDshAdministrationDecisionRollback",
  "operationId: getDshAdministrationDiagnostics",
  "operationId: listDshAdministrationAudit",
], "canonical administration contract");

for (const temporaryWorkflow of [
  ".github/workflows/jrn-031-administration-macos-verification.yml",
  ".github/workflows/jrn-031-go-diagnostic.yml",
]) {
  if (fs.existsSync(resolve(temporaryWorkflow))) failures.push(`${temporaryWorkflow}: temporary workflow must not remain after closure`);
}

if (failures.length > 0) {
  console.error("JRN-031 closure gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("JRN-031 closure gate passed: implementation, CI, evidence, and independent-approval boundaries are intact.");
