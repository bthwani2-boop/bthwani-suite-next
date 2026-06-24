import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshRole, DshStaffMember, DshPartnerActivation, DshCaptainCredential, DshAdminAuditEntry } from "./administration.types";

const base = resolveDshApiBaseUrl();
let c = 0;
const corrId = () => `adm-${Date.now()}-${++c}`;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const res = await fetch(new URL(path, base), {
    ...init,
    headers: {
      Accept: "application/json", "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, "X-Correlation-ID": corrId(),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw { kind: "http", status: res.status };
  return res.json() as Promise<T>;
}

export const fetchRoles = () => req<{ roles: DshRole[] }>("/dsh/operator/admin/roles");
export const createRole = (body: { name: string; description?: string }) =>
  req<{ role: DshRole }>("/dsh/operator/admin/roles", { method: "POST", body: JSON.stringify(body) });

export const fetchStaff = () => req<{ staff: DshStaffMember[] }>("/dsh/operator/admin/staff");
export const assignStaffRole = (staffId: string, roleId: string) =>
  req<{ assignment: DshStaffMember }>(`/dsh/operator/admin/staff/${staffId}/roles`, {
    method: "POST", body: JSON.stringify({ roleId }),
  });

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
