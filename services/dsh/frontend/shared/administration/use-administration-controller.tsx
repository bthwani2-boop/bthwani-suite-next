import { useCallback, useEffect, useState } from "react";
import {
  fetchRoles, createRole,
  fetchStaff, assignStaffRole,
  fetchPartnerActivations, activatePartner, blockPartner,
  fetchCaptainCredentials, upsertCaptainCredential,
  fetchAdminAudit,
  fetchRoleAssignmentApprovals,
  reviewRoleAssignmentApproval,
} from "./administration.api";
import type {
  DshRole, DshStaffMember, DshPartnerActivation,
  DshCaptainCredential, DshAdminAuditEntry, DshAdminState,
  DshRoleAssignmentApproval, DshRoleAssignmentApprovalStatus,
} from "./administration.types";

export function useStaffController(authKind: string) {
  const [state, setState] = useState<DshAdminState<DshStaffMember[]>>({ kind: "idle" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "success", data: (await fetchStaff()).staff }); }
    catch (err) { setState({ kind: "error", message: msg(err) }); }
  }, []);
  useEffect(() => { if (authKind !== "authenticated") { setState({ kind: "idle" }); return; } load(); }, [authKind, load]);
  return {
    state, reload: load,
    requestRoleAssignment: async (staffId: string, roleId: string, reason: string) => {
      const response = await assignStaffRole(staffId, roleId, reason);
      return response.approval;
    },
  };
}

function msg(err: unknown): string {
  const e = err as { kind?: string; status?: number; message?: string } | undefined;
  if (e?.status === 401) return "الجلسة منتهية";
  if (e?.status === 403) return "لا تملك صلاحية تنفيذ هذا الإجراء";
  if (e?.status === 409) return "تغيّر طلب الاعتماد أو يوجد طلب مماثل معلق";
  return e?.message || "تعذّر تحميل البيانات";
}

function useRolesController(authKind: string) {
  const [state, setState] = useState<DshAdminState<DshRole[]>>({ kind: "idle" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "success", data: (await fetchRoles()).roles }); }
    catch (err) { setState({ kind: "error", message: msg(err) }); }
  }, []);
  useEffect(() => { if (authKind !== "authenticated") { setState({ kind: "idle" }); return; } load(); }, [authKind, load]);
  return {
    state, reload: load,
    create: async (body: { name: string; description?: string }) => { await createRole(body); await load(); },
  };
}

export function useRoleAssignmentApprovalController(
  authKind: string,
  status: DshRoleAssignmentApprovalStatus | "" = "pending",
) {
  const [state, setState] = useState<DshAdminState<DshRoleAssignmentApproval[]>>({ kind: "idle" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "success", data: (await fetchRoleAssignmentApprovals(status)).approvals }); }
    catch (err) { setState({ kind: "error", message: msg(err) }); }
  }, [status]);
  useEffect(() => { if (authKind !== "authenticated") { setState({ kind: "idle" }); return; } load(); }, [authKind, load]);

  const review = useCallback(async (
    approvalId: string,
    decision: "approved" | "rejected",
    expectedVersion: number,
    reviewNote: string,
  ) => {
    await reviewRoleAssignmentApproval(approvalId, { decision, expectedVersion, reviewNote });
    await load();
  }, [load]);

  return { state, reload: load, review };
}

function usePartnerActivationController(authKind: string, status?: string) {
  const [state, setState] = useState<DshAdminState<DshPartnerActivation[]>>({ kind: "idle" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "success", data: (await fetchPartnerActivations(status)).activations }); }
    catch (err) { setState({ kind: "error", message: msg(err) }); }
  }, [status]);
  useEffect(() => { if (authKind !== "authenticated") { setState({ kind: "idle" }); return; } load(); }, [authKind, load]);
  return {
    state, reload: load,
    activate: async (partnerId: string, notes?: string) => { await activatePartner(partnerId, notes); await load(); },
    block: async (partnerId: string, notes?: string) => { await blockPartner(partnerId, notes); await load(); },
  };
}

export function useCaptainCredentialController(authKind: string) {
  const [state, setState] = useState<DshAdminState<DshCaptainCredential[]>>({ kind: "idle" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "success", data: (await fetchCaptainCredentials()).credentials }); }
    catch (err) { setState({ kind: "error", message: msg(err) }); }
  }, []);
  useEffect(() => { if (authKind !== "authenticated") { setState({ kind: "idle" }); return; } load(); }, [authKind, load]);
  return {
    state, reload: load,
    upsert: async (captainId: string, body: { licenseNumber?: string; vehicleType?: string; status?: string }) => {
      await upsertCaptainCredential(captainId, body); await load();
    },
  };
}

export function useAdminAuditController(authKind: string) {
  const [state, setState] = useState<DshAdminState<DshAdminAuditEntry[]>>({ kind: "idle" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "success", data: (await fetchAdminAudit()).audit }); }
    catch (err) { setState({ kind: "error", message: msg(err) }); }
  }, []);
  useEffect(() => { if (authKind !== "authenticated") { setState({ kind: "idle" }); return; } load(); }, [authKind, load]);
  return { state, reload: load };
}
