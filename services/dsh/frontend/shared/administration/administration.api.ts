import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { operations } from "../../../clients/generated/dsh-api";
import type {
  DshRoleAssignmentApprovalStatus,
  DshRoleChangeAction,
  DshAdministrationApprovalStatus,
} from "./administration.types";

type RolesListResponse =
  operations["listDshAdminRoles"]["responses"][200]["content"]["application/json"];
type PermissionVocabularyResponse =
  operations["get_dsh_operator_admin_permission_vocabulary"]["responses"][200]["content"]["application/json"];
type RoleDefinitionCreateInput =
  operations["post_dsh_operator_admin_roles_requests"]["requestBody"]["content"]["application/json"];
type RoleDefinitionCreateResponse =
  operations["post_dsh_operator_admin_roles_requests"]["responses"][200]["content"]["application/json"];
type RoleDefinitionListResponse =
  operations["get_dsh_operator_admin_role_requests"]["responses"][200]["content"]["application/json"];
type RoleDefinitionReviewResponse =
  operations["post_dsh_operator_admin_role_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type RoleDefinitionReviewInput =
  operations["post_dsh_operator_admin_role_requests__requestId__review"]["requestBody"]["content"]["application/json"];
type StaffListResponse =
  operations["listDshAdminStaff"]["responses"][200]["content"]["application/json"];
type RoleChangeInput =
  operations["assignDshStaffRole"]["requestBody"]["content"]["application/json"];
type RoleAssignmentCreateResponse =
  operations["assignDshStaffRole"]["responses"][200]["content"]["application/json"];
type RoleAssignmentListResponse =
  operations["get_dsh_operator_admin_approvals"]["responses"][200]["content"]["application/json"];
type RoleAssignmentReviewResponse =
  operations["post_dsh_operator_admin_approvals__approvalId__review"]["responses"][200]["content"]["application/json"];
type RoleAssignmentReviewInput =
  operations["post_dsh_operator_admin_approvals__approvalId__review"]["requestBody"]["content"]["application/json"];
type RollbackCreateInput =
  operations["post_dsh_operator_admin_approvals__approvalId__rollback_requests"]["requestBody"]["content"]["application/json"];
type RollbackCreateResponse =
  operations["post_dsh_operator_admin_approvals__approvalId__rollback_requests"]["responses"][200]["content"]["application/json"];
type RollbackListResponse =
  operations["get_dsh_operator_admin_rollback_requests"]["responses"][200]["content"]["application/json"];
type RollbackReviewResponse =
  operations["post_dsh_operator_admin_rollback_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type RollbackReviewInput =
  operations["post_dsh_operator_admin_rollback_requests__requestId__review"]["requestBody"]["content"]["application/json"];
type AdministrationDiagnosticsResponse =
  operations["get_dsh_operator_admin_diagnostics"]["responses"][200]["content"]["application/json"];
type RoleDefinitionReplacementResponse =
  operations["post_dsh_operator_admin_role_requests__requestId__replacements"]["responses"][200]["content"]["application/json"];
type RoleAssignmentReplacementResponse =
  operations["post_dsh_operator_admin_approvals__approvalId__replacements"]["responses"][200]["content"]["application/json"];
type RollbackReplacementResponse =
  operations["post_dsh_operator_admin_rollback_requests__requestId__replacements"]["responses"][200]["content"]["application/json"];
type TerminalFailureReplacementInput =
  operations["post_dsh_operator_admin_role_requests__requestId__replacements"]["requestBody"]["content"]["application/json"];
type AdminAuditResponse =
  operations["listDshAdminAudit"]["responses"][200]["content"]["application/json"];

const { request: req } = createDshHttpClient(resolveDshApiBaseUrl(), "adm");

export const fetchRoles = () => req<RolesListResponse>("/dsh/operator/admin/roles");

export const fetchPermissionVocabulary = () =>
  req<PermissionVocabularyResponse>("/dsh/operator/admin/permission-vocabulary");

export const requestRoleDefinition = (body: RoleDefinitionCreateInput) => req<RoleDefinitionCreateResponse>("/dsh/operator/admin/roles/requests", {
  method: "POST",
  body,
});

export const fetchRoleDefinitionRequests = (status: DshAdministrationApprovalStatus | "" = "pending") =>
  req<RoleDefinitionListResponse>(
    `/dsh/operator/admin/role-requests${status ? `?status=${status}` : ""}`,
  );

export const reviewRoleDefinitionRequest = (
  requestId: string,
  body: RoleDefinitionReviewInput,
) => req<RoleDefinitionReviewResponse>(
  `/dsh/operator/admin/role-requests/${requestId}/review`,
  { method: "POST", body },
);

export const replaceFailedRoleDefinitionRequest = (
  requestId: string,
  body: TerminalFailureReplacementInput,
) => req<RoleDefinitionReplacementResponse>(
  `/dsh/operator/admin/role-requests/${requestId}/replacements`,
  { method: "POST", body },
);

export const fetchStaff = () => req<StaffListResponse>("/dsh/operator/admin/staff");

export const requestStaffRoleChange = (
  staffId: string,
  roleName: string,
  actionType: DshRoleChangeAction,
  reason: string,
) => {
  const body: RoleChangeInput = { roleName, actionType, reason };
  return req<RoleAssignmentCreateResponse>(`/dsh/operator/admin/staff/${staffId}/roles`, {
  method: "POST",
  body,
  });
};

export const fetchRoleAssignmentApprovals = (status: DshRoleAssignmentApprovalStatus | "" = "pending") =>
  req<RoleAssignmentListResponse>(
    `/dsh/operator/admin/approvals${status ? `?status=${status}` : ""}`,
  );

export const reviewRoleAssignmentApproval = (
  approvalId: string,
  body: RoleAssignmentReviewInput,
) => req<RoleAssignmentReviewResponse>(
  `/dsh/operator/admin/approvals/${approvalId}/review`,
  { method: "POST", body },
);

export const replaceFailedRoleAssignmentApproval = (
  approvalId: string,
  body: TerminalFailureReplacementInput,
) => req<RoleAssignmentReplacementResponse>(
  `/dsh/operator/admin/approvals/${approvalId}/replacements`,
  { method: "POST", body },
);

export const requestDecisionRollback = (approvalId: string, reason: string) =>
  req<RollbackCreateResponse>(
    `/dsh/operator/admin/approvals/${approvalId}/rollback-requests`,
    { method: "POST", body: { reason } satisfies RollbackCreateInput },
  );

export const fetchRollbackRequests = (status: DshAdministrationApprovalStatus | "" = "pending") =>
  req<RollbackListResponse>(
    `/dsh/operator/admin/rollback-requests${status ? `?status=${status}` : ""}`,
  );

export const reviewRollbackRequest = (
  requestId: string,
  body: RollbackReviewInput,
) => req<RollbackReviewResponse>(
  `/dsh/operator/admin/rollback-requests/${requestId}/review`,
  { method: "POST", body },
);

export const replaceFailedRollbackRequest = (
  requestId: string,
  body: TerminalFailureReplacementInput,
) => req<RollbackReplacementResponse>(
  `/dsh/operator/admin/rollback-requests/${requestId}/replacements`,
  { method: "POST", body },
);

export const fetchAdministrationDiagnostics = () =>
  req<AdministrationDiagnosticsResponse>("/dsh/operator/admin/diagnostics");

export const fetchAdminAudit = (actorId?: string) =>
  req<AdminAuditResponse>(`/dsh/operator/admin/audit${actorId ? `?actorId=${encodeURIComponent(actorId)}` : ""}`);
