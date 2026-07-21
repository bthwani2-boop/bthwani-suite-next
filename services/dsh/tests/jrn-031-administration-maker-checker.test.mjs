import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("JRN-031 administration maker-checker closure", () => {
  const migration = source("../database/migrations/dsh-076_admin_role_assignment_approvals.sql");
  const domain = source("../backend/internal/administration/role_assignment_approvals.go");
  const routes = source("../backend/internal/http/administration_approval_routes.go");
  const main = source("../backend/cmd/dsh-api/main.go");
  const contract = source("../contracts/dsh.administration.openapi.yaml");
  const adapter = source("../frontend/shared/administration/administration.api.ts");
  const controller = source("../frontend/shared/administration/use-administration-controller.tsx");
  const queue = source("../frontend/control-panel/administration/RoleAssignmentApprovalQueue.tsx");
  const page = source("../../apps/control-panel/runtime/src/app/dsh/administration/page.tsx");

  it("persists a versioned approval queue with self-assignment protection", () => {
    assert.match(migration, /dsh_admin_approval_requests/);
    assert.match(migration, /requested_by <> target_actor_id/);
    assert.match(migration, /status IN \('pending','approved','rejected'\)/);
    assert.match(migration, /uq_dsh_admin_pending_role_assignment/);
    assert.match(migration, /version\s+INTEGER/);
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
    assert.match(queue, /useRoleAssignmentApprovalController/);
    assert.match(queue, /requestRoleAssignment/);
    assert.match(queue, /اعتماد من مراجع مستقل/);
    assert.doesNotMatch(queue, /fetch\(|axios\.|createDshRawHttpClient/);
    assert.doesNotMatch(queue, /style=\{\{/);
    assert.match(page, /GovernedAdministrationScreen/);
  });
});
