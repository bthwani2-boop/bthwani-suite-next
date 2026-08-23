import type { components, operations } from "../../../clients/generated/dsh-api";

type RoleDefinitionReviewResponse =
  operations["post_dsh_operator_admin_role_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type RoleAssignmentReviewResponse =
  operations["post_dsh_operator_admin_approvals__approvalId__review"]["responses"][200]["content"]["application/json"];
type RollbackReviewResponse =
  operations["post_dsh_operator_admin_rollback_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type DiagnosticsResponse =
  operations["get_dsh_operator_admin_diagnostics"]["responses"][200]["content"]["application/json"];

export type DshAdministrationSurface =
  | "control-panel";

export type DshPermissionVocabularyEntry =
  operations["get_dsh_operator_admin_permission_vocabulary"]["responses"][200]["content"]["application/json"]["permissions"][number];
export type DshRole = components["schemas"]["DshAdminRole"];
export type DshRolePermission = DshRole["permissions"][number];
export type DshStaffMember = components["schemas"]["DshStaffMember"];
export type DshCanonicalRoleAssignment = NonNullable<RoleAssignmentReviewResponse["assignment"]>;
export type DshAdministrationApprovalStatus = RoleAssignmentReviewResponse["approval"]["status"];
export type DshMutationExecutionStatus = RoleAssignmentReviewResponse["approval"]["executionStatus"];
export type DshRoleAssignmentApprovalStatus = DshAdministrationApprovalStatus;
export type DshRoleChangeAction = RoleAssignmentReviewResponse["approval"]["actionType"];
export type DshRoleAssignmentApproval = RoleAssignmentReviewResponse["approval"];
export type DshRoleDefinitionRequest = RoleDefinitionReviewResponse["request"];
export type DshAdministrationRollbackRequest = RollbackReviewResponse["request"];
export type DshAdministrationDiagnostics = DiagnosticsResponse["diagnostics"];

export type DshPartnerActivation = {
  readonly id: string;
  readonly partnerId: string;
  readonly status: "submitted" | "ops_approved" | "partner_active" | "blocked";
  readonly reviewedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshCaptainCredential = {
  readonly id: string;
  readonly captainId: string;
  readonly vehicleType: string;
  readonly status: "pending" | "approved" | "rejected" | "suspended";
  readonly reviewedBy: string;
  readonly updatedAt: string;
};

export type DshAdminAuditEntry = {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetId: string;
  readonly detail: string;
  readonly sensitivity: "internal" | "restricted";
  readonly correlationId: string;
  readonly createdAt: string;
};

export type DshAdminState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: T }
  | { readonly kind: "error"; readonly message: string };
