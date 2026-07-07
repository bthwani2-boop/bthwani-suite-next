import { useCallback, useEffect, useState } from "react";
import {
  fetchRoles, createRole,
  fetchStaff, assignStaffRole,
  fetchPartnerActivations, activatePartner, blockPartner,
  fetchCaptainCredentials, upsertCaptainCredential,
  fetchAdminAudit,
} from "./administration.api";
import type {
  DshRole, DshStaffMember, DshPartnerActivation,
  DshCaptainCredential, DshAdminAuditEntry, DshAdminState,
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
    assignRole: async (staffId: string, roleId: string) => { await assignStaffRole(staffId, roleId); await load(); },
  };
}

function msg(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.status === 401) return "الجلسة منتهية";
  return "تعذّر تحميل البيانات";
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
