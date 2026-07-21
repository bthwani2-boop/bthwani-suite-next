import { useCallback, useEffect, useState } from "react";
import {
  fetchRoles,
  fetchStaff,
  requestStaffRoleAssignment,
  fetchPartnerActivations,
  fetchCaptainCredentials,
  fetchAdminAudit,
  fetchRoleAssignmentApprovals,
  reviewRoleAssignmentApproval,
} from "./administration.api";
import type {
  DshRole,
  DshStaffMember,
  DshPartnerActivation,
  DshCaptainCredential,
  DshAdminAuditEntry,
  DshAdminState,
  DshRoleAssignmentApproval,
  DshRoleAssignmentApprovalStatus,
} from "./administration.types";

function useReadModel<T>(authKind: string, loader: () => Promise<T>) {
  const [state, setState] = useState<DshAdminState<T>>({ kind: "idle" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "success", data: await loader() }); }
    catch (err) { setState({ kind: "error", message: messageFromError(err) }); }
  }, [loader]);
  useEffect(() => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      return;
    }
    void load();
  }, [authKind, load]);
  return { state, reload: load };
}

function messageFromError(err: unknown): string {
  const error = err as { status?: number; message?: string } | undefined;
  if (error?.status === 401) return "الجلسة منتهية";
  if (error?.status === 403) return "لا تملك صلاحية تنفيذ هذا الإجراء";
  if (error?.status === 409) return "تغيّر طلب الاعتماد أو يوجد طلب مماثل معلق";
  return error?.message || "تعذّر تحميل البيانات";
}

export function useAdministrationRolesController(authKind: string) {
  const loader = useCallback(async (): Promise<DshRole[]> => (await fetchRoles()).roles, []);
  return useReadModel(authKind, loader);
}

export function useStaffController(authKind: string) {
  const loader = useCallback(async (): Promise<DshStaffMember[]> => (await fetchStaff()).staff, []);
  const readModel = useReadModel(authKind, loader);
  return {
    ...readModel,
    requestRoleAssignment: async (staffId: string, roleId: string, reason: string) => {
      const response = await requestStaffRoleAssignment(staffId, roleId, reason);
      return response.approval;
    },
  };
}

export function useRoleAssignmentApprovalController(
  authKind: string,
  status: DshRoleAssignmentApprovalStatus | "" = "pending",
) {
  const loader = useCallback(
    async (): Promise<DshRoleAssignmentApproval[]> => (await fetchRoleAssignmentApprovals(status)).approvals,
    [status],
  );
  const readModel = useReadModel(authKind, loader);

  const review = useCallback(async (
    approvalId: string,
    decision: "approved" | "rejected",
    expectedVersion: number,
    reviewNote: string,
  ) => {
    await reviewRoleAssignmentApproval(approvalId, { decision, expectedVersion, reviewNote });
    await readModel.reload();
  }, [readModel]);

  return { ...readModel, review };
}

export function usePartnerActivationReadController(authKind: string) {
  const loader = useCallback(async (): Promise<DshPartnerActivation[]> => (await fetchPartnerActivations()).activations, []);
  return useReadModel(authKind, loader);
}

export function useCaptainCredentialController(authKind: string) {
  const loader = useCallback(async (): Promise<DshCaptainCredential[]> => (await fetchCaptainCredentials()).credentials, []);
  return useReadModel(authKind, loader);
}

export function useAdminAuditController(authKind: string) {
  const loader = useCallback(async (): Promise<DshAdminAuditEntry[]> => (await fetchAdminAudit()).audit, []);
  return useReadModel(authKind, loader);
}
