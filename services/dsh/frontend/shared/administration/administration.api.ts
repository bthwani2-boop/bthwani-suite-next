import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshRawHttpClient } from "../_kernel/dsh-http-request";
import type { operations } from "../../../clients/generated/dsh-api";
import type {
  DshRole,
  DshStaffMember,
  DshPartnerActivation,
  DshCaptainCredential,
  DshAdminAuditEntry,
  DshRoleAssignmentApproval,
  DshRoleAssignmentApprovalStatus,
  DshRoleChangeAction,
  DshRoleDefinitionRequest,
  DshAdministrationApprovalStatus,
  DshAdministrationRollbackRequest,
  DshPermissionVocabularyEntry,
} from "./administration.types";

type RoleDefinitionReviewResponse =
  operations["post_dsh_operator_admin_role_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type RoleAssignmentReviewResponse =
  operations["post_dsh_operator_admin_approvals__approvalId__review"]["responses"][200]["content"]["application/json"];
type RollbackReviewResponse =
  operations["post_dsh_operator_admin_rollback_requests__requestId__review"]["responses"][200]["content"]["application/json"];
type AdministrationDiagnosticsResponse =
  operations["get_dsh_operator_admin_diagnostics"]["responses"][200]["content"]["application/json"];

const { req } = createDshRawHttpClient(resolveDshApiBaseUrl(), "adm");

export const fetchRoles = () => req<{ roles: DshRole[] }>("/dsh/operator/admin/roles");

export const fetchPermissionVocabulary = () =>
  req<{ permissions: DshPermissionVocabularyEntry[] }>("/dsh/operator/admin/permission-vocabulary");

export const requestRoleDefinition = (body: {
  name: string;
  description: string;
  active: boolean;
  permissions: readonly string[];
  reason: string;
}) => req<{ request: DshRoleDefinitionRequest }>("/dsh/operator/admin/roles/requests", {
  method: "POST",
  body: JSON.stringify(body),
});

export const fetchRoleDefinitionRequests = (status: DshAdministrationApprovalStatus | "" = "pending") =>
  req<{ requests: DshRoleDefinitionRequest[] }>(
    `/dsh/operator/admin/role-requests${status ? `?status=${status}` : ""}`,
  );

export const reviewRoleDefinitionRequest = (
  requestId: string,
  body: { decision: "approved" | "rejected"; reviewNote: string; expectedVersion: number },
) => req<RoleDefinitionReviewResponse>(
  `/dsh/operator/admin/role-requests/${requestId}/review`,
  { method: "POST", body: JSON.stringify(body) },
);

export const fetchStaff = () => req<{ staff: DshStaffMember[] }>("/dsh/operator/admin/staff");

export const requestStaffRoleChange = (
  staffId: string,
  roleName: string,
  actionType: DshRoleChangeAction,
  reason: string,
) => req<{ approval: DshRoleAssignmentApproval }>(`/dsh/operator/admin/staff/${staffId}/roles`, {
  method: "POST",
  body: JSON.stringify({ roleName, actionType, reason }),
});

export const fetchRoleAssignmentApprovals = (status: DshRoleAssignmentApprovalStatus | "" = "pending") =>
  req<{ approvals: DshRoleAssignmentApproval[] }>(
    `/dsh/operator/admin/approvals${status ? `?status=${status}` : ""}`,
  );

export const reviewRoleAssignmentApproval = (
  approvalId: string,
  body: { decision: "approved" | "rejected"; reviewNote: string; expectedVersion: number },
) => req<RoleAssignmentReviewResponse>(
  `/dsh/operator/admin/approvals/${approvalId}/review`,
  { method: "POST", body: JSON.stringify(body) },
);

export const requestDecisionRollback = (approvalId: string, reason: string) =>
  req<{ request: DshAdministrationRollbackRequest }>(
    `/dsh/operator/admin/approvals/${approvalId}/rollback-requests`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );

export const fetchRollbackRequests = (status: DshAdministrationApprovalStatus | "" = "pending") =>
  req<{ requests: DshAdministrationRollbackRequest[] }>(
    `/dsh/operator/admin/rollback-requests${status ? `?status=${status}` : ""}`,
  );

export const reviewRollbackRequest = (
  requestId: string,
  body: { decision: "approved" | "rejected"; reviewNote: string; expectedVersion: number },
) => req<RollbackReviewResponse>(
  `/dsh/operator/admin/rollback-requests/${requestId}/review`,
  { method: "POST", body: JSON.stringify(body) },
);

export const fetchAdministrationDiagnostics = () =>
  req<AdministrationDiagnosticsResponse>("/dsh/operator/admin/diagnostics");

export const fetchPartnerActivations = (status?: string) =>
  req<{ activations: DshPartnerActivation[] }>(`/dsh/operator/admin/partners${status ? `?status=${status}` : ""}`);

export const fetchCaptainCredentials = (status?: string) =>
  req<{ credentials: DshCaptainCredential[] }>(`/dsh/operator/admin/captains${status ? `?status=${status}` : ""}`);

export const fetchAdminAudit = (actorId?: string) =>
  req<{ audit: DshAdminAuditEntry[] }>(`/dsh/operator/admin/audit${actorId ? `?actorId=${actorId}` : ""}`);
