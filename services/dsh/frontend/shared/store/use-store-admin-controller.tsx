import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchAdminStoreList,
  fetchAdminStoreDetail,
  fetchAdminStorePublicationDiagnostics,
  fetchAdminStoreAudit,
  adminLoadingState,
} from "./store-admin.api";
import {
  type DshStoreAdminListState,
  type DshStoreAdminDetailState,
  type DshStorePublicationDiagnosticsState,
  type DshStoreAuditState,
  type DshStoreAdminFilters,
  type DshStoreAdminKpiSummary,
  type DshStoreAdminTableRow,
} from "./store-admin.view-model";
import {
  createStoreAdminInitialFilters,
  deriveStoreAdminView,
  loadStoreAdminDetail,
  loadStoreAdminList,
  nextStoreAdminOffset,
  previousStoreAdminOffset,
} from "./store-admin.controller-core";
import { submitStoreRoleAction } from "./store-role.api";
import {
  resolveStoreRoleMutationAttempt,
  type StoreRoleMutationAttempt,
} from "./store-role-mutation";
import type { OperatorStoreGovernanceRequest, StoreRoleAction } from "./store-discovery.types";
import type { StoreActionState } from "./use-store-role-context-controller";

export type StoreAdminController = {
  readonly listState: DshStoreAdminListState;
  readonly detailState: DshStoreAdminDetailState | null;
  readonly diagnosticsState: DshStorePublicationDiagnosticsState;
  readonly auditState: DshStoreAuditState;
  readonly selectedStoreId: string | null;
  readonly filters: DshStoreAdminFilters;
  readonly offset: number;
  readonly visibleRows: readonly DshStoreAdminTableRow[];
  readonly kpi: DshStoreAdminKpiSummary | null;
  readonly total: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly paginationLabel: string;
  readonly isNonSuccess: boolean;
  readonly selectStore: (id: string | null) => void;
  readonly setFilters: (next: DshStoreAdminFilters) => void;
  readonly nextPage: () => void;
  readonly prevPage: () => void;
  readonly retry: () => void;
  readonly reload: () => void;
  readonly actionState: StoreActionState;
  readonly govern: (storeId: string, input: OperatorStoreGovernanceRequest) => Promise<void>;
};

export function useStoreAdminController(authKind = "unauthenticated"): StoreAdminController {
  const [listState, setListState] = useState<DshStoreAdminListState>(adminLoadingState());
  const [detailState, setDetailState] = useState<DshStoreAdminDetailState | null>(null);
  const [diagnosticsState, setDiagnosticsState] = useState<DshStorePublicationDiagnosticsState>({ kind: "idle" });
  const [auditState, setAuditState] = useState<DshStoreAuditState>({ kind: "idle" });
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DshStoreAdminFilters>(createStoreAdminInitialFilters);
  const [offset, setOffset] = useState(0);
  const [actionState, setActionState] = useState<StoreActionState>({ kind: "idle" });
  const mutationAttemptRef = useRef<StoreRoleMutationAttempt | null>(null);

  const loadStores = useCallback(async (currentOffset: number) => {
    await loadStoreAdminList(currentOffset, fetchAdminStoreList, setListState);
  }, []);

  const loadDiagnostics = useCallback(async (storeId: string | null) => {
    if (storeId === null) {
      setDiagnosticsState({ kind: "idle" });
      return;
    }
    setDiagnosticsState({ kind: "loading" });
    setDiagnosticsState(await fetchAdminStorePublicationDiagnostics(storeId));
  }, []);

  const loadAudit = useCallback(async (storeId: string | null) => {
    if (storeId === null) {
      setAuditState({ kind: "idle" });
      return;
    }
    setAuditState({ kind: "loading" });
    setAuditState(await fetchAdminStoreAudit(storeId));
  }, []);

  useEffect(() => {
    if (authKind === "authenticated") void loadStores(offset);
  }, [loadStores, offset, authKind]);

  useEffect(() => {
    void loadStoreAdminDetail(selectedStoreId, fetchAdminStoreDetail, setDetailState);
    void loadDiagnostics(selectedStoreId);
    void loadAudit(selectedStoreId);
  }, [selectedStoreId, loadAudit, loadDiagnostics]);

  const retry = useCallback(() => {
    void loadStores(offset);
    void loadStoreAdminDetail(selectedStoreId, fetchAdminStoreDetail, setDetailState);
    void loadDiagnostics(selectedStoreId);
    void loadAudit(selectedStoreId);
  }, [loadAudit, loadDiagnostics, loadStores, offset, selectedStoreId]);
  const selectStore = useCallback((id: string | null) => setSelectedStoreId(id), []);
  const nextPage = useCallback(() => setOffset(nextStoreAdminOffset), []);
  const prevPage = useCallback(() => setOffset(previousStoreAdminOffset), []);
  const derived = deriveStoreAdminView(listState, filters, offset);

  const govern = useCallback(async (storeId: string, input: OperatorStoreGovernanceRequest) => {
    const action: StoreRoleAction = { kind: "operator", storeId, input };
    setActionState({ kind: "submitting", actionKind: "operator" });
    const attempt = resolveStoreRoleMutationAttempt(mutationAttemptRef.current, action);
    mutationAttemptRef.current = attempt;
    try {
      const response = await submitStoreRoleAction(action, attempt.auth);
      mutationAttemptRef.current = null;
      setActionState({ kind: "success", replayed: response.replayed });
      await Promise.all([
        loadStores(offset),
        loadStoreAdminDetail(storeId, fetchAdminStoreDetail, setDetailState),
        loadDiagnostics(storeId),
        loadAudit(storeId),
      ]);
    } catch (error) {
      const typed = error as { kind?: string; status?: number };
      if (typed.kind === "http" && typed.status === 409) {
        mutationAttemptRef.current = null;
        setActionState({ kind: "conflict", message: "تغيّرت نسخة المتجر. أعد التحميل قبل تطبيق الإجراء." });
      } else if (typed.kind === "network" || (typed.kind === "http" && typed.status === 503)) {
        setActionState({ kind: "error", message: "تعذر الاتصال. إعادة إجراء الحوكمة نفسه ستستخدم مفتاحه السابق." });
      } else {
        mutationAttemptRef.current = null;
        setActionState({ kind: "error", message: "تعذر تطبيق إجراء الحوكمة." });
      }
    }
  }, [loadAudit, loadDiagnostics, loadStores, offset]);

  return {
    listState,
    detailState,
    diagnosticsState,
    auditState,
    selectedStoreId,
    filters,
    offset,
    ...derived,
    selectStore,
    setFilters,
    nextPage,
    prevPage,
    retry,
    reload: retry,
    actionState,
    govern,
  };
}
