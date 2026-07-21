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
export const createRole = (body: { name: string; description?: string }) =>
  req<{ role: DshRole }>("/dsh/operator/admin/roles", { method: "POST", body: JSON.stringify(body) });

export const fetchStaff = () => req<{ staff: DshStaffMember[] }>("/dsh/operator/admin/staff");
export const assignStaffRole = (staffId: string, roleId: string, reason: string) =>
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
export const activatePartner = (partnerId: string, notes?: string) =>
  req<{ activation: DshPartnerActivation }>(`/dsh/operator/admin/partners/${partnerId}/activate`, {
    method: "POST", body: JSON.stringify({ notes: notes ?? "" }),
  });
export const blockPartner = (partnerId: string, notes?: string) =>
  req<{ activation: DshPartnerActivation }>(`/dsh/operator/admin/partners/${partnerId}/block`, {
    method: "POST", body: JSON.stringify({ notes: notes ?? "" }),
  });

export const fetchCaptainCredentials = (status?: string) =>
  req<{ credentials: DshCaptainCredential[] }>(`/dsh/operator/admin/captains${status ? `?status=${status}` : ""}`);
export const upsertCaptainCredential = (captainId: string, body: { licenseNumber?: string; vehicleType?: string; status?: string }) =>
  req<{ credential: DshCaptainCredential }>(`/dsh/operator/admin/captains/${captainId}/credential`, {
    method: "POST", body: JSON.stringify(body),
  });

export const fetchAdminAudit = (actorId?: string) =>
  req<{ audit: DshAdminAuditEntry[] }>(`/dsh/operator/admin/audit${actorId ? `?actorId=${actorId}` : ""}`);
