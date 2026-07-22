import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("JRN-031 administration maker-checker closure", () => {
  const approvalMigration = source("../database/migrations/dsh-076_admin_role_assignment_approvals.sql");
  const permissionMigration = source("../database/migrations/dsh-077_admin_role_permissions.sql");
  const roleDefinitionMigration = source("../database/migrations/dsh-078_admin_role_definition_approvals.sql");
  const revocationMigration = source("../database/migrations/dsh-079_admin_role_assignment_revocations.sql");
  const assignmentDomain = source("../backend/internal/administration/role_assignment_approvals.go");
  const roleDefinitionDomain = source("../backend/internal/administration/role_definition_approvals.go");
  const administration = source("../backend/internal/administration/administration.go");
  const routes = source("../backend/internal/http/administration_approval_routes.go");
  const permissionGate = source("../backend/internal/http/administration_permission.go");
  const administrationHttp = source("../backend/internal/http/administration.go");
  const main = source("../backend/cmd/dsh-api/main.go");
  const contract = source("../contracts/dsh.administration.openapi.yaml");
  const adapter = source("../frontend/shared/administration/administration.api.ts");
  const controller = source("../frontend/shared/administration/use-administration-controller.tsx");
  const registry = source("../frontend/shared/administration/administration-registry.ts");
  const dashboard = source("../frontend/control-panel/administration/AdministrationDashboardScreen.tsx");
  const roleQueue = source("../frontend/control-panel/administration/RoleDefinitionApprovalQueue.tsx");
  const assignmentQueue = source("../frontend/control-panel/administration/RoleAssignmentApprovalQueue.tsx");
  const governedScreen = source("../frontend/control-panel/administration/GovernedAdministrationScreen.tsx");
  const page = source("../../../apps/control-panel/runtime/src/app/dsh/administration/page.tsx");

  it("persists versioned role-change queues with self-change protection", () => {
    assert.match(approvalMigration, /dsh_admin_approval_requests/);
    assert.match(approvalMigration, /requested_by <> target_actor_id/);
    assert.match(approvalMigration, /status IN \('pending','approved','rejected'\)/);
    assert.match(approvalMigration, /version\s+INTEGER/);
    assert.match(revocationMigration, /staff_role_revocation/);
    assert.match(revocationMigration, /uq_dsh_admin_pending_role_change/);
  });

  it("applies assignment and rollback only inside independent approval transactions", () => {
    assert.match(assignmentDomain, /BeginTx/);
    assert.match(assignmentDomain, /RequestStaffRoleRevocation/);
    assert.match(assignmentDomain, /checkerActorID == current\.RequestedBy/);
    assert.match(assignmentDomain, /checkerActorID == current\.TargetActorID/);
    assert.match(assignmentDomain, /current\.Status != "pending" \|\| current\.Version != expectedVersion/);
    assert.match(assignmentDomain, /INSERT INTO dsh_admin_staff_assignments/);
    assert.match(assignmentDomain, /DELETE FROM dsh_admin_staff_assignments/);
    assert.match(assignmentDomain, /current\.ActionType\+"_"\+decision/);
    assert.match(assignmentDomain, /tx\.Commit/);
  });

  it("creates role definitions only after independent approval", () => {
    assert.match(roleDefinitionMigration, /dsh_admin_role_definition_requests/);
    assert.match(roleDefinitionMigration, /uq_dsh_admin_pending_role_definition/);
    assert.match(roleDefinitionDomain, /governedAdministrationPermissions/);
    assert.match(roleDefinitionDomain, /current\.RequestedBy == checkerActorID/);
    assert.match(roleDefinitionDomain, /INSERT INTO dsh_admin_roles/);
    assert.match(roleDefinitionDomain, /role_definition_requested/);
    assert.match(roleDefinitionDomain, /role_definition_"\+decision/);
    assert.match(routes, /POST \/dsh\/operator\/admin\/roles\/requests/);
    assert.match(routes, /POST \/dsh\/operator\/admin\/role-requests\/\{requestId\}\/review/);
    assert.match(contract, /operationId: requestDshAdministrationRoleDefinition/);
    assert.match(contract, /operationId: reviewDshAdministrationRoleDefinitionRequest/);
  });

  it("binds approved assignments to real DSH permission checks", () => {
    assert.match(permissionMigration, /ADD COLUMN IF NOT EXISTS permissions JSONB/);
    assert.match(permissionMigration, /jsonb_typeof\(permissions\) = 'array'/);
    assert.match(administration, /func ActorHasPermission/);
    assert.match(administration, /role\.permissions \? \$2/);
    assert.match(permissionGate, /identity\.Resolve/);
    assert.match(permissionGate, /administration\.ActorHasPermission/);
    assert.match(permissionGate, /AUTHORIZATION_UNAVAILABLE/);
    assert.match(permissionGate, /approved-role:/);
    assert.match(routes, /requireAdministrationPermission/);
    assert.match(administrationHttp, /requireAdministrationPermission/);
  });

  it("removes obsolete direct administration mutation paths and mock truth", () => {
    assert.doesNotMatch(administration, /func CreateRole\(/);
    assert.doesNotMatch(administration, /func AssignStaffRole\(/);
    assert.doesNotMatch(administration, /func ActivatePartner\(/);
    assert.doesNotMatch(administration, /func BlockPartner\(/);
    assert.doesNotMatch(administration, /func UpsertCaptainCredential\(/);
    assert.doesNotMatch(administrationHttp, /handleAssignStaffRole/);
    assert.doesNotMatch(administrationHttp, /handleCreateRole/);
    assert.doesNotMatch(administrationHttp, /handleActivatePartner/);
    assert.doesNotMatch(administrationHttp, /handleUpsertCaptainCredential/);
    assert.doesNotMatch(adapter, /createRole|activatePartner|blockPartner|upsertCaptainCredential/);
    assert.doesNotMatch(registry, /ADMIN_ROLES|ADMIN_BOTTOM_CARDS|محاكاة محلية|وضع تجريبي/);
    assert.doesNotMatch(dashboard, /ADMIN_ROLES|mock|محاكاة/);
    assert.doesNotMatch(dashboard, /style=\{\{/);
  });

  it("mounts governed routes without direct role mutation endpoints", () => {
    assert.match(main, /RegisterAdministrationRoutes/);
    assert.match(routes, /POST \/dsh\/operator\/admin\/staff\/\{staffId\}\/roles/);
    assert.match(routes, /GET \/dsh\/operator\/admin\/approvals/);
    assert.match(routes, /POST \/dsh\/operator\/admin\/approvals\/\{approvalId\}\/review/);
    assert.match(routes, /RoleChangeAssign/);
    assert.match(routes, /RoleChangeRevoke/);
    assert.doesNotMatch(routes, /handleAssignStaffRole/);
    assert.doesNotMatch(routes, /handleCreateRole/);
    assert.doesNotMatch(routes, /handleActivatePartner/);
    assert.doesNotMatch(routes, /handleUpsertCaptainCredential/);
  });

  it("binds contract, shared brain, and control-panel queues", () => {
    assert.match(contract, /operationId: requestDshStaffRoleChange/);
    assert.match(contract, /operationId: reviewDshStaffRoleChange/);
    assert.match(contract, /staff_role_revocation/);
    assert.match(contract, /required: \[roleId, actionType, reason\]/);
    assert.match(adapter, /requestStaffRoleChange/);
    assert.match(adapter, /actionType/);
    assert.match(adapter, /fetchRoleAssignmentApprovals/);
    assert.match(adapter, /reviewRoleAssignmentApproval/);
    assert.match(adapter, /requestRoleDefinition/);
    assert.match(adapter, /reviewRoleDefinitionRequest/);
    assert.match(controller, /requestRoleRevocation/);
    assert.match(controller, /useRoleAssignmentApprovalController/);
    assert.match(controller, /useRoleDefinitionApprovalController/);
    assert.match(controller, /useAdministrationRolesController/);
    assert.match(assignmentQueue, /requestRoleAssignment/);
    assert.match(assignmentQueue, /requestRoleRevocation/);
    assert.match(assignmentQueue, /إرسال طلب سحب/);
    assert.match(assignmentQueue, /اعتماد من مراجع مستقل/);
    assert.match(roleQueue, /useRoleDefinitionApprovalController/);
    assert.match(roleQueue, /إرسال تعريف الدور للمراجعة/);
    assert.match(roleQueue, /اعتماد تعريف الدور/);
    assert.match(dashboard, /useAdministrationRolesController/);
    assert.match(dashboard, /useAdminAuditController/);
    assert.doesNotMatch(assignmentQueue, /fetch\(|axios\.|createDshRawHttpClient/);
    assert.doesNotMatch(roleQueue, /fetch\(|axios\.|createDshRawHttpClient/);
    assert.doesNotMatch(assignmentQueue, /style=\{\{/);
    assert.doesNotMatch(roleQueue, /style=\{\{/);
    assert.match(governedScreen, /RoleDefinitionApprovalQueue/);
    assert.match(page, /GovernedAdministrationScreen/);
  });
});
