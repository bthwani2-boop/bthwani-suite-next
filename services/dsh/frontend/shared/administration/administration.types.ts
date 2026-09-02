import type { operations } from "../../../clients/generated/dsh-api";

type RoleDefinitionReviewResponse =
  operations["post_dsh_operator_admin_role_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type RoleAssignmentReviewResponse =
  operations["post_dsh_operator_admin_approvals__approvalId__review"]["responses"][200]["content"]["application/json"];
type RollbackReviewResponse =
  operations["post_dsh_operator_admin_rollback_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type DiagnosticsResponse =
  operations["get_dsh_operator_admin_diagnostics"]["responses"][200]["content"]["application/json"];

export type DshPermissionVocabularyEntry =
  operations["get_dsh_operator_admin_permission_vocabulary"]["responses"][200]["content"]["application/json"]["permissions"][number];
export type DshRole =
  operations["listDshAdminRoles"]["responses"][200]["content"]["application/json"]["roles"][number];
export type DshRolePermission = DshRole["permissions"][number];
export type DshStaffMember =
  operations["listDshAdminStaff"]["responses"][200]["content"]["application/json"]["staff"][number];
export type DshAdministrationApprovalStatus = RoleAssignmentReviewResponse["approval"]["status"];
export type DshRoleAssignmentApprovalStatus = DshAdministrationApprovalStatus;
export type DshRoleChangeAction = RoleAssignmentReviewResponse["approval"]["actionType"];
export type DshRoleAssignmentApproval = RoleAssignmentReviewResponse["approval"];
export type DshRoleDefinitionRequest = RoleDefinitionReviewResponse["request"];
export type DshAdministrationRollbackRequest = RollbackReviewResponse["request"];
export type DshAdministrationDiagnostics = DiagnosticsResponse["diagnostics"];
export type DshAdminAuditEntry =
  operations["listDshAdminAudit"]["responses"][200]["content"]["application/json"]["entries"][number];

export type DshAdminState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: T }
  | { readonly kind: "error"; readonly message: string };
