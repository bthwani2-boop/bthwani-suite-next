import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("JRN-031 administration maker-checker closure", () => {
  const approvalMigration = source("../database/migrations/dsh-076_admin_role_assignment_approvals.sql");
  const permissionMigration = source("../database/migrations/dsh-077_admin_role_permissions.sql");
  const domain = source("../backend/internal/administration/role_assignment_approvals.go");
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
  const queue = source("../frontend/control-panel/administration/RoleAssignmentApprovalQueue.tsx");
  const page = source("../../../apps/control-panel/runtime/src/app/dsh/administration/page.tsx");

  it("persists a versioned approval queue with self-assignment protection", () => {
    assert.match(approvalMigration, /dsh_admin_approval_requests/);
    assert.match(approvalMigration, /requested_by <> target_actor_id/);
    assert.match(approvalMigration, /status IN \('pending','approved','rejected'\)/);
    assert.match(approvalMigration, /uq_dsh_admin_pending_role_assignment/);
    assert.match(approvalMigration, /version\s+INTEGER/);
  });

  it("applies assignments only inside independent approval transactions", () => {
    assert.match(domain, /BeginTx/);
    assert.match(domain, /checkerActorID == current\.RequestedBy/);
    assert.match(domain, /checkerActorID == current\.TargetActorID/);
    assert.match(domain, /current\.Status != "pending" \|\| current\.Version != expectedVersion/);
    assert.match(domain, /INSERT INTO dsh_admin_staff_assignments/);
    assert.match(domain, /staff_role_assignment_requested/);
    assert.match(domain, /staff_role_assignment_"\+decision/);
    assert.match(domain, /tx\.Commit/);
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

  it("mounts governed routes without mounting legacy direct mutations", () => {
    assert.match(main, /RegisterAdministrationRoutes/);
    assert.match(routes, /POST \/dsh\/operator\/admin\/staff\/\{staffId\}\/roles/);
    assert.match(routes, /GET \/dsh\/operator\/admin\/approvals/);
    assert.match(routes, /POST \/dsh\/operator\/admin\/approvals\/\{approvalId\}\/review/);
    assert.match(routes, /handleRequestStaffRoleAssignment/);
    assert.match(routes, /handleReviewStaffRoleAssignment/);
    assert.doesNotMatch(routes, /handleAssignStaffRole/);
    assert.doesNotMatch(routes, /handleCreateRole/);
    assert.doesNotMatch(routes, /handleActivatePartner/);
    assert.doesNotMatch(routes, /handleUpsertCaptainCredential/);
  });

  it("binds contract, shared brain, and control-panel queue", () => {
    assert.match(contract, /operationId: requestDshStaffRoleAssignment/);
    assert.match(contract, /operationId: reviewDshRoleAssignmentApproval/);
    assert.match(contract, /expectedVersion/);
    assert.match(adapter, /fetchRoleAssignmentApprovals/);
    assert.match(adapter, /reviewRoleAssignmentApproval/);
    assert.match(controller, /useRoleAssignmentApprovalController/);
    assert.match(controller, /useAdministrationRolesController/);
    assert.match(queue, /useRoleAssignmentApprovalController/);
    assert.match(queue, /requestRoleAssignment/);
    assert.match(queue, /اعتماد من مراجع مستقل/);
    assert.match(dashboard, /useAdministrationRolesController/);
    assert.match(dashboard, /useAdminAuditController/);
    assert.doesNotMatch(queue, /fetch\(|axios\.|createDshRawHttpClient/);
    assert.doesNotMatch(queue, /style=\{\{/);
    assert.match(page, /GovernedAdministrationScreen/);
  });
});
