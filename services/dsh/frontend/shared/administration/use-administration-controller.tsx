import { useCallback, useEffect, useState } from "react";
import {
  fetchRoles,
  requestRoleDefinition,
  fetchRoleDefinitionRequests,
  reviewRoleDefinitionRequest,
  fetchStaff,
  requestStaffRoleChange,
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
  DshRoleDefinitionRequest,
  DshAdministrationApprovalStatus,
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
  if (error?.status === 409) return "تغيّر طلب الاعتماد أو لم تعد حالة الدور صالحة للعملية";
  return error?.message || "تعذّر تحميل البيانات";
}

export function useAdministrationRolesController(authKind: string) {
  const loader = useCallback(async (): Promise<DshRole[]> => (await fetchRoles()).roles, []);
  return useReadModel(authKind, loader);
}

export function useRoleDefinitionApprovalController(
  authKind: string,
  status: DshAdministrationApprovalStatus | "" = "pending",
) {
  const loader = useCallback(
    async (): Promise<DshRoleDefinitionRequest[]> => (await fetchRoleDefinitionRequests(status)).requests,
    [status],
  );
  const { state, reload } = useReadModel(authKind, loader);

  const request = useCallback(async (input: {
    name: string;
    description: string;
    permissions: readonly string[];
    reason: string;
  }) => {
    const response = await requestRoleDefinition(input);
    await reload();
    return response.request;
  }, [reload]);

  const review = useCallback(async (
    requestId: string,
    decision: "approved" | "rejected",
    expectedVersion: number,
    reviewNote: string,
  ) => {
    await reviewRoleDefinitionRequest(requestId, { decision, expectedVersion, reviewNote });
    await reload();
  }, [reload]);

  return { state, reload, request, review };
}

export function useStaffController(authKind: string) {
  const loader = useCallback(async (): Promise<DshStaffMember[]> => (await fetchStaff()).staff, []);
  const readModel = useReadModel(authKind, loader);
  const requestChange = useCallback(async (
    staffId: string,
    roleId: string,
    actionType: "staff_role_assignment" | "staff_role_revocation",
    reason: string,
  ) => {
    const response = await requestStaffRoleChange(staffId, roleId, actionType, reason);
    await readModel.reload();
    return response.approval;
  }, [readModel]);
  return {
    ...readModel,
    requestRoleAssignment: (staffId: string, roleId: string, reason: string) =>
      requestChange(staffId, roleId, "staff_role_assignment", reason),
    requestRoleRevocation: (staffId: string, roleId: string, reason: string) =>
      requestChange(staffId, roleId, "staff_role_revocation", reason),
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
  const { state, reload } = useReadModel(authKind, loader);

  const review = useCallback(async (
    approvalId: string,
    decision: "approved" | "rejected",
    expectedVersion: number,
    reviewNote: string,
  ) => {
    await reviewRoleAssignmentApproval(approvalId, { decision, expectedVersion, reviewNote });
    await reload();
  }, [reload]);

  return { state, reload, review };
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
