import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshRawHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshRole,
  DshStaffMember,
  DshPartnerActivation,
  DshCaptainCredential,
  DshAdminAuditEntry,
  DshRoleAssignmentApproval,
  DshRoleAssignmentApprovalStatus,
} from "./administration.types";

const { req } = createDshRawHttpClient(resolveDshApiBaseUrl(), "adm");

export const fetchRoles = () => req<{ roles: DshRole[] }>("/dsh/operator/admin/roles");
export const fetchStaff = () => req<{ staff: DshStaffMember[] }>("/dsh/operator/admin/staff");

export const requestStaffRoleAssignment = (staffId: string, roleId: string, reason: string) =>
  req<{ approval: DshRoleAssignmentApproval }>(`/dsh/operator/admin/staff/${staffId}/roles`, {
    method: "POST", body: JSON.stringify({ roleId, reason }),
  });

export const fetchRoleAssignmentApprovals = (status: DshRoleAssignmentApprovalStatus | "" = "pending") =>
  req<{ approvals: DshRoleAssignmentApproval[] }>(
    `/dsh/operator/admin/approvals${status ? `?status=${status}` : ""}`,
  );

export const reviewRoleAssignmentApproval = (
  approvalId: string,
  body: { decision: "approved" | "rejected"; reviewNote: string; expectedVersion: number },
) => req<{ approval: DshRoleAssignmentApproval; assignment: DshStaffMember | null }>(
  `/dsh/operator/admin/approvals/${approvalId}/review`,
  { method: "POST", body: JSON.stringify(body) },
);

export const fetchPartnerActivations = (status?: string) =>
  req<{ activations: DshPartnerActivation[] }>(`/dsh/operator/admin/partners${status ? `?status=${status}` : ""}`);

export const fetchCaptainCredentials = (status?: string) =>
  req<{ credentials: DshCaptainCredential[] }>(`/dsh/operator/admin/captains${status ? `?status=${status}` : ""}`);

export const fetchAdminAudit = (actorId?: string) =>
  req<{ audit: DshAdminAuditEntry[] }>(`/dsh/operator/admin/audit${actorId ? `?actorId=${actorId}` : ""}`);
