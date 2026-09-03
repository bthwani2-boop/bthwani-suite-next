import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  fetchRoles,
  requestRoleDefinition,
  fetchRoleDefinitionRequests,
  reviewRoleDefinitionRequest,
  fetchStaff,
  requestStaffRoleChange,
  fetchAdminAudit,
  fetchRoleAssignmentApprovals,
  reviewRoleAssignmentApproval,
  requestDecisionRollback,
  fetchRollbackRequests,
  reviewRollbackRequest,
  fetchAdministrationDiagnostics,
  fetchPermissionVocabulary,
  replaceFailedRoleDefinitionRequest,
  replaceFailedRoleAssignmentApproval,
  replaceFailedRollbackRequest,
} from "./administration.api";
import type {
  DshRole,
  DshStaffMember,
  DshAdminAuditEntry,
  DshAdminState,
  DshRoleAssignmentApproval,
  DshRoleAssignmentApprovalStatus,
  DshRoleDefinitionRequest,
  DshAdministrationApprovalStatus,
  DshAdministrationRollbackRequest,
  DshAdministrationDiagnostics,
  DshPermissionVocabularyEntry,
} from "./administration.types";

type AdministrationReadScope =
  | "roles"
  | "role-definitions"
  | "staff"
  | "role-assignments"
  | "rollbacks"
  | "audit"
  | "diagnostics";

type AdministrationReload = () => Promise<void>;

type AdministrationInvalidation = {
  subscribe: (scope: AdministrationReadScope, reload: AdministrationReload) => () => void;
  invalidate: (scopes: readonly AdministrationReadScope[]) => Promise<void>;
};

const AdministrationInvalidationContext = createContext<AdministrationInvalidation>({
  subscribe: () => () => undefined,
  invalidate: () => Promise.resolve(),
});

export function AdministrationInvalidationProvider({ children }: PropsWithChildren) {
  const subscribers = useRef(new Map<AdministrationReadScope, Set<AdministrationReload>>());
  const subscribe = useCallback((scope: AdministrationReadScope, reload: AdministrationReload) => {
    const scopedSubscribers = subscribers.current.get(scope) ?? new Set<AdministrationReload>();
    scopedSubscribers.add(reload);
    subscribers.current.set(scope, scopedSubscribers);
    return () => {
      scopedSubscribers.delete(reload);
      if (scopedSubscribers.size === 0) subscribers.current.delete(scope);
    };
  }, []);
  const invalidate = useCallback(async (scopes: readonly AdministrationReadScope[]) => {
    const reloads = new Set<AdministrationReload>();
    for (const scope of scopes) {
      for (const reload of subscribers.current.get(scope) ?? []) reloads.add(reload);
    }
    await Promise.all([...reloads].map((reload) => reload()));
  }, []);

  return (
    <AdministrationInvalidationContext.Provider value={{ subscribe, invalidate }}>
      {children}
    </AdministrationInvalidationContext.Provider>
  );
}

function useReadModel<T>(
  authKind: string,
  scope: AdministrationReadScope | null,
  loader: () => Promise<T>,
  enabled = true,
) {
  const [state, setState] = useState<DshAdminState<T>>({ kind: "idle" });
  const loadGeneration = useRef(0);
  const { subscribe } = useContext(AdministrationInvalidationContext);
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setState({ kind: "loading" });
    try {
      const data = await loader();
      if (generation === loadGeneration.current) setState({ kind: "success", data });
    } catch (err) {
      if (generation === loadGeneration.current) setState({ kind: "error", message: messageFromError(err) });
    }
  }, [loader]);
  useEffect(() => {
    if (authKind !== "authenticated" || !enabled || scope === null) return undefined;
    return subscribe(scope, load);
  }, [authKind, enabled, load, scope, subscribe]);
  useEffect(() => {
    if (authKind !== "authenticated" || !enabled) {
      loadGeneration.current += 1;
      setState({ kind: "idle" });
      return;
    }
    void load();
  }, [authKind, enabled, load]);
  return { state, reload: load };
}

function messageFromError(err: unknown): string {
  const error = err as { status?: number; code?: string; message?: string } | undefined;
  if (error?.status === 401) return "الجلسة منتهية";
  if (error?.status === 403) return "لا تملك صلاحية تنفيذ هذا الإجراء";
  if (error?.code === "CANONICAL_MUTATION_RECONCILING") return "التغيير قيد المطابقة مع Identity؛ لم يتم اعتماد الحالة محليًا بعد.";
  if (error?.code === "CANONICAL_MUTATION_FAILED") return "تعذر التغيير المعياري؛ بقي الطلب معلّقًا وستظهر حالة إعادة المحاولة أو التدخل.";
  if (error?.status === 409) return "تغيّر طلب الاعتماد أو لم تعد حالة الدور صالحة للعملية";
  return error?.message || "تعذّر تحميل البيانات";
}

export function useAdministrationRolesController(authKind: string, enabled = true) {
  const loader = useCallback(async (): Promise<DshRole[]> => (await fetchRoles()).roles, []);
  return useReadModel(authKind, "roles", loader, enabled);
}

export function useRoleDefinitionApprovalController(
  authKind: string,
  status: DshAdministrationApprovalStatus | "" = "pending",
  enabled = true,
) {
  const loader = useCallback(
    async (): Promise<DshRoleDefinitionRequest[]> => (await fetchRoleDefinitionRequests(status)).requests,
    [status],
  );
  const { invalidate } = useContext(AdministrationInvalidationContext);
  const { state, reload } = useReadModel(authKind, "role-definitions", loader, enabled);

  const request = useCallback(async (input: {
    name: string;
    description: string;
    active: boolean;
    permissions: readonly string[];
    reason: string;
  }) => {
    const response = await requestRoleDefinition({ ...input, permissions: [...input.permissions] });
    await invalidate(["role-definitions", "audit", "diagnostics"]);
    return response.request;
  }, [invalidate]);

  const review = useCallback(async (
    requestId: string,
    decision: "approved" | "rejected",
    expectedVersion: number,
    reviewNote: string,
  ) => {
    await reviewRoleDefinitionRequest(requestId, { decision, expectedVersion, reviewNote });
    await invalidate(decision === "approved"
      ? ["role-definitions", "roles", "audit", "diagnostics"]
      : ["role-definitions", "audit", "diagnostics"]);
  }, [invalidate]);

  const replaceTerminalFailure = useCallback(async (
    requestId: string,
    expectedVersion: number,
    reasonCode: string,
    replacementReason: string,
  ) => {
    const response = await replaceFailedRoleDefinitionRequest(requestId, {
      expectedVersion,
      reasonCode,
      replacementReason,
    });
    await invalidate(["role-definitions", "audit", "diagnostics"]);
    return response.request;
  }, [invalidate]);

  return { state, reload, request, review, replaceTerminalFailure };
}

export function useStaffController(authKind: string, enabled = true) {
  const loader = useCallback(async (): Promise<DshStaffMember[]> => (await fetchStaff()).staff, []);
  const { invalidate } = useContext(AdministrationInvalidationContext);
  const readModel = useReadModel(authKind, "staff", loader, enabled);
  const requestChange = useCallback(async (
    staffId: string,
    roleName: string,
    actionType: "staff_role_assignment" | "staff_role_revocation",
    reason: string,
  ) => {
    const response = await requestStaffRoleChange(staffId, roleName, actionType, reason);
    await invalidate(["role-assignments", "audit", "diagnostics"]);
    return response.approval;
  }, [invalidate]);
  return {
    ...readModel,
    requestRoleAssignment: (staffId: string, roleName: string, reason: string) =>
      requestChange(staffId, roleName, "staff_role_assignment", reason),
    requestRoleRevocation: (staffId: string, roleName: string, reason: string) =>
      requestChange(staffId, roleName, "staff_role_revocation", reason),
  };
}

export function useRoleAssignmentApprovalController(
  authKind: string,
  status: DshRoleAssignmentApprovalStatus | "" = "pending",
  enabled = true,
) {
  const loader = useCallback(
    async (): Promise<DshRoleAssignmentApproval[]> => (await fetchRoleAssignmentApprovals(status)).approvals,
    [status],
  );
  const { invalidate } = useContext(AdministrationInvalidationContext);
  const { state, reload } = useReadModel(authKind, "role-assignments", loader, enabled);

  const review = useCallback(async (
    approvalId: string,
    decision: "approved" | "rejected",
    expectedVersion: number,
    reviewNote: string,
  ) => {
    await reviewRoleAssignmentApproval(approvalId, { decision, expectedVersion, reviewNote });
    await invalidate(decision === "approved"
      ? ["role-assignments", "staff", "audit", "diagnostics"]
      : ["role-assignments", "audit", "diagnostics"]);
  }, [invalidate]);

  const requestRollback = useCallback(async (approvalId: string, reason: string) => {
    const response = await requestDecisionRollback(approvalId, reason);
    await invalidate(["rollbacks", "audit", "diagnostics"]);
    return response.request;
  }, [invalidate]);

  const replaceTerminalFailure = useCallback(async (
    approvalId: string,
    expectedVersion: number,
    reasonCode: string,
    replacementReason: string,
  ) => {
    const response = await replaceFailedRoleAssignmentApproval(approvalId, {
      expectedVersion,
      reasonCode,
      replacementReason,
    });
    await invalidate(["role-assignments", "audit", "diagnostics"]);
    return response.approval;
  }, [invalidate]);

  return { state, reload, review, requestRollback, replaceTerminalFailure };
}

export function useAdministrationRollbackController(
  authKind: string,
  status: DshAdministrationApprovalStatus | "" = "pending",
  enabled = true,
) {
  const loader = useCallback(
    async (): Promise<DshAdministrationRollbackRequest[]> => (await fetchRollbackRequests(status)).requests,
    [status],
  );
  const { invalidate } = useContext(AdministrationInvalidationContext);
  const { state, reload } = useReadModel(authKind, "rollbacks", loader, enabled);
  const review = useCallback(async (
    requestId: string,
    decision: "approved" | "rejected",
    expectedVersion: number,
    reviewNote: string,
  ) => {
    await reviewRollbackRequest(requestId, { decision, expectedVersion, reviewNote });
    await invalidate(decision === "approved"
      ? ["rollbacks", "staff", "audit", "diagnostics"]
      : ["rollbacks", "audit", "diagnostics"]);
  }, [invalidate]);
  const replaceTerminalFailure = useCallback(async (
    requestId: string,
    expectedVersion: number,
    reasonCode: string,
    replacementReason: string,
  ) => {
    const response = await replaceFailedRollbackRequest(requestId, {
      expectedVersion,
      reasonCode,
      replacementReason,
    });
    await invalidate(["rollbacks", "audit", "diagnostics"]);
    return response.request;
  }, [invalidate]);
  return { state, reload, review, replaceTerminalFailure };
}

export function useAdministrationDiagnosticsController(authKind: string, enabled = true) {
  const loader = useCallback(
    async (): Promise<DshAdministrationDiagnostics> => (await fetchAdministrationDiagnostics()).diagnostics,
    [],
  );
  return useReadModel(authKind, "diagnostics", loader, enabled);
}

export function useAdminAuditController(authKind: string, enabled = true) {
  const loader = useCallback(async (): Promise<DshAdminAuditEntry[]> => (await fetchAdminAudit()).entries, []);
  return useReadModel(authKind, "audit", loader, enabled);
}

export function useAdministrationPermissionVocabularyController(authKind: string, enabled = true) {
  const loader = useCallback(async (): Promise<DshPermissionVocabularyEntry[]> => (await fetchPermissionVocabulary()).permissions, []);
  return useReadModel(authKind, null, loader, enabled);
}
