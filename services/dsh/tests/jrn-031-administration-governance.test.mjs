import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "../../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function assertIncludesAll(content, values, label) {
  for (const value of values) assert.ok(content.includes(value), `${label} is missing ${value}`);
}

test("JRN-031 product truth preserves ownership and independent approval", () => {
  const truth = JSON.parse(read("governance/product/contracts/jrn-031-administration-roles-approvals-audit.product-truth.json"));
  assert.equal(truth.journeyId, "JRN-031");
  assert.equal(truth.status, "PENDING_INDEPENDENT_APPROVAL");
  assert.equal(truth.truthOwner, "services/dsh");
  assert.equal(truth.identityTruthOwner, "core/identity");
  assert.equal(truth.workforceTruthOwner, "core/workforce");
  assert.ok(truth.forbiddenActions.includes("maker_self_approval"));
  assert.ok(truth.forbiddenActions.includes("deleting_or_rewriting_audit_history"));
  assert.ok(truth.independentApprovalsRequired.includes("application-security"));
});

test("JRN-031 database owns rollback and append-only audit enforcement", () => {
  const migration = read("services/dsh/database/migrations/dsh-131_jrn031_governed_administration_closure.sql");
  assertIncludesAll(migration, [
    "CREATE TABLE IF NOT EXISTS dsh_admin_rollback_requests",
    "uq_dsh_admin_rollback_pending_source",
    "source_approval_id",
    "inverse_action_type",
    "dsh_admin_audit_append_only_guard",
    "BEFORE UPDATE OR DELETE ON dsh_admin_audit",
    "sensitivity IN ('internal','restricted')",
    "dsh_admin_roles_surfaces_scope",
    "status = 'pending' AND reviewed_by IS NULL",
  ], "JRN-031 migration");
});

test("JRN-031 backend enforces operation and control-panel scoped permissions", () => {
  const administration = read("services/dsh/backend/internal/administration/administration.go");
  const definitions = read("services/dsh/backend/internal/administration/role_definition_approvals.go");
  const rollback = read("services/dsh/backend/internal/administration/rollback_and_diagnostics.go");
  const permission = read("services/dsh/backend/internal/http/administration_permission.go");
  const approvalRoutes = read("services/dsh/backend/internal/http/administration_approval_routes.go");
  const rollbackRoutes = read("services/dsh/backend/internal/http/administration_rollback_diagnostics.go");
  assertIncludesAll(administration, ["role.surfaces ? 'control-panel'", "AdministrationPermissionCandidates"], "role authorization");
  assertIncludesAll(definitions, [
    '"administration.role.request"',
    '"administration.staff.approve"',
    '"administration.audit.read"',
    '"administration.rollback.approve"',
    '"control-panel"',
    "normalizeRoleDefinition",
  ], "role definition governance");
  assertIncludesAll(rollback, [
    "RequestDecisionRollback",
    "ReviewDecisionRollback",
    "checkerActorID == current.SourceApprovedBy",
    "inverseRoleAction",
    "GetAdministrationDiagnostics",
    "redactAuditDetail",
  ], "rollback and diagnostics owner");
  assertIncludesAll(permission, [
    "AdministrationPermissionCandidates",
    'permission.Surface != "control-panel"',
    "ActorHasPermission",
  ], "authorization gate");
  assert.doesNotMatch(permission, /HasRole\("operator"\)/, "broad operator role must not bypass operation permissions");
  assert.doesNotMatch(permission, /PhoneE164/, "administration authorization must not propagate phone PII");
  assertIncludesAll(approvalRoutes, [
    "handleListRoleDefinitionRequests",
    "AdministrationPermissionRoleApprove",
    "handleListRoleAssignmentApprovals",
    "AdministrationPermissionStaffApprove",
  ], "approval queue permissions");
  assertIncludesAll(rollbackRoutes, [
    "handleListRollbackRequests",
    "AdministrationPermissionRollbackApprove",
  ], "rollback queue permission");
});

test("JRN-031 administration projections minimize partner and captain sensitive fields", () => {
  const administration = read("services/dsh/backend/internal/administration/administration.go");
  const types = read("services/dsh/frontend/shared/administration/administration.types.ts");
  assert.doesNotMatch(administration, /json:"notes"/, "partner review notes must not leave the owner lifecycle");
  assert.doesNotMatch(administration, /json:"licenseNumber"/, "captain license number must not leave Workforce");
  assert.doesNotMatch(types, /readonly notes:/, "partner review notes must not exist in the administration shared type");
  assert.doesNotMatch(types, /readonly licenseNumber:/, "captain license number must not exist in the administration shared type");
});

test("JRN-031 audit writers do not persist raw reason or review note", () => {
  for (const relativePath of [
    "services/dsh/backend/internal/administration/role_assignment_approvals.go",
    "services/dsh/backend/internal/administration/role_definition_approvals.go",
    "services/dsh/backend/internal/administration/rollback_and_diagnostics.go",
  ]) {
    const source = read(relativePath);
    assert.ok(source.includes("writeAdminAudit"), `${relativePath} must use the redacted audit writer`);
    assert.ok(!source.includes('"; reason="+reason'), `${relativePath} must not append raw reason to audit detail`);
    assert.ok(!source.includes('"; note="+reviewNote'), `${relativePath} must not append raw review note to audit detail`);
  }
});

test("JRN-031 routes expose role approval rollback diagnostics and audit", () => {
  const routeTest = read("services/dsh/backend/internal/http/journey_031_routes_test.go");
  assertIncludesAll(routeTest, [
    '"POST /dsh/operator/admin/roles/requests"',
    '"POST /dsh/operator/admin/role-requests/{requestId}/review"',
    '"POST /dsh/operator/admin/staff/{staffId}/roles"',
    '"POST /dsh/operator/admin/approvals/{approvalId}/review"',
    '"POST /dsh/operator/admin/approvals/{approvalId}/rollback-requests"',
    '"POST /dsh/operator/admin/rollback-requests/{requestId}/review"',
    '"GET /dsh/operator/admin/diagnostics"',
    '"GET /dsh/operator/admin/audit"',
  ], "JRN-031 route registration test");
});

test("JRN-031 shared brain binds all live administration routes", () => {
  const api = read("services/dsh/frontend/shared/administration/administration.api.ts");
  const controller = read("services/dsh/frontend/shared/administration/use-administration-controller.tsx");
  assertIncludesAll(api, [
    "requestRoleDefinition",
    "requestStaffRoleChange",
    "requestDecisionRollback",
    "fetchRollbackRequests",
    "reviewRollbackRequest",
    "fetchAdministrationDiagnostics",
    "fetchAdminAudit",
  ], "administration API");
  assertIncludesAll(controller, [
    "useRoleDefinitionApprovalController",
    "useRoleAssignmentApprovalController",
    "useAdministrationRollbackController",
    "useAdministrationDiagnosticsController",
  ], "administration controllers");
});

test("JRN-031 control panel composes the workflow and delegates owner mutations", () => {
  const screen = read("services/dsh/frontend/control-panel/administration/GovernedAdministrationScreen.tsx");
  const dashboard = read("services/dsh/frontend/control-panel/administration/AdministrationDashboardScreen.tsx");
  const partnerOwner = read("services/dsh/frontend/control-panel/partners/PartnerDetailOperationalScreen.tsx");
  const captainOwner = read("services/dsh/frontend/control-panel/hr/CaptainDetailView.tsx");
  const roleQueue = read("services/dsh/frontend/control-panel/administration/RoleDefinitionApprovalQueue.tsx");
  const rollbackQueue = read("services/dsh/frontend/control-panel/administration/DecisionRollbackQueue.tsx");
  const diagnostics = read("services/dsh/frontend/control-panel/administration/AdministrationDiagnosticsPanel.tsx");
  assertIncludesAll(screen, [
    "AdministrationDashboardScreen",
    "AdministrationDiagnosticsPanel",
    "RoleDefinitionApprovalQueue",
    "RoleAssignmentApprovalQueue",
    "DecisionRollbackQueue",
  ], "governed administration screen");
  assertIncludesAll(dashboard, [
    "/dsh/partners/",
    "/dsh/hr?",
    "فتح التفعيل/الحظر",
    "فتح ملف الاعتماد",
    "role.surfaces",
  ], "administration owner delegation");
  assertIncludesAll(partnerOwner, ["detail.transition", "expectedVersion", "reason"], "partner lifecycle owner");
  assertIncludesAll(captainOwner, ["useCaptainDetailController", "اعتماد الرخصة", "licenseExpiresAt"], "captain credential owner");
  assertIncludesAll(roleQueue, ["AVAILABLE_PERMISSIONS", "AVAILABLE_SURFACES", '"control-panel"'], "role queue");
  assertIncludesAll(rollbackQueue, ["requestRollback", "اعتماد التراجع", "sourceApprovedBy"], "rollback queue");
  assertIncludesAll(diagnostics, ["PII", "pendingRollbackCount", "recentRestrictedAuditCount"], "diagnostics panel");
  for (const source of [roleQueue, rollbackQueue, diagnostics]) {
    assert.ok(!source.includes("fetch("), "surface UI must not bypass the shared administration brain");
    assert.ok(!source.includes("axios"), "surface UI must not use a parallel HTTP client");
  }
});

test("JRN-031 canonical contract contains every governed operation", () => {
  const contract = read("services/dsh/contracts/dsh.administration.openapi.yaml");
  assertIncludesAll(contract, [
    "operationId: requestDshAdministrationRoleDefinition",
    "operationId: reviewDshAdministrationRoleDefinitionRequest",
    "operationId: requestDshStaffRoleChange",
    "operationId: reviewDshStaffRoleChange",
    "operationId: requestDshAdministrationDecisionRollback",
    "operationId: reviewDshAdministrationDecisionRollback",
    "operationId: getDshAdministrationDiagnostics",
    "operationId: listDshAdministrationAudit",
    "contains: { const: control-panel }",
    "Redacted allowlisted metadata only",
  ], "JRN-031 canonical OpenAPI contract");
});
