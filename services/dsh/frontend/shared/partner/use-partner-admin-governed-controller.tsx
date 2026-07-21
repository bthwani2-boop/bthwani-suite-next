import { useCallback, useEffect, useState } from "react";

import { createPartner, fetchPartner, fetchPartners, transitionPartner } from "./partner.api";
import type { DshCreatePartnerInput, DshPartnerTransitionInput } from "./partner.types";
import type { DshPartnerDetailState, DshPartnerListState, DshPartnerMutationState } from "./partner.states";
import { buildPartnerDetailViewModel, buildPartnerListRowViewModel } from "./partner.view-model";

function resolveErrorMessage(err: unknown): string {
  const value = err as { status?: number };
  if (value?.status === 401) return "جلسة منتهية — يرجى تسجيل الدخول مجدداً";
  if (value?.status === 403) return "غير مصرح لك بهذه العملية";
  if (value?.status === 404) return "الشريك غير موجود";
  if (value?.status === 409) return "تعارض في البيانات — أعد تحميل أحدث نسخة قبل المحاولة";
  if (value?.status === 422) return "الانتقال غير مسموح من الحالة الحالية";
  return "حدث خطأ، يرجى المحاولة مجدداً";
}

export type DshPartnerListFilters = {
  readonly status: string;
  readonly category: string;
};

export function usePartnerAdminController(authKind: string) {
  const [listState, setListState] = useState<DshPartnerListState>({ kind: "idle" });
  const [detailState, setDetailState] = useState<DshPartnerDetailState>({ kind: "idle" });
  const [mutationState, setMutationState] = useState<DshPartnerMutationState>({ kind: "idle" });
  const [filters, setFilters] = useState<DshPartnerListFilters>({ status: "", category: "" });
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const isAuthenticated = authKind === "authenticated";

  const loadList = useCallback(async (nextFilters: DshPartnerListFilters, nextPage: number) => {
    if (!isAuthenticated) return false;
    setListState({ kind: "loading" });
    try {
      const response = await fetchPartners({
        ...(nextFilters.status ? { status: nextFilters.status } : {}),
        limit: pageSize,
        offset: nextPage * pageSize,
      });
      setListState(response.partners.length === 0
        ? { kind: "empty" }
        : { kind: "success", partners: response.partners, total: response.pagination.total, page: nextPage });
      return true;
    } catch (error) {
      setListState({ kind: "error", message: resolveErrorMessage(error) });
      return false;
    }
  }, [isAuthenticated]);

  const loadDetail = useCallback(async (partnerId: string) => {
    if (!isAuthenticated) return false;
    setDetailState({ kind: "loading" });
    try {
      const partner = await fetchPartner(partnerId);
      setDetailState({ kind: "success", partner });
      return true;
    } catch (error) {
      const value = error as { status?: number };
      if (value.status === 404) setDetailState({ kind: "not_found" });
      else if (value.status === 403) setDetailState({ kind: "forbidden" });
      else setDetailState({ kind: "error", message: resolveErrorMessage(error) });
      return false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadList(filters, page);
  }, [filters, loadList, page]);

  const create = useCallback(async (input: DshCreatePartnerInput) => {
    setMutationState({ kind: "loading" });
    try {
      const created = await createPartner(input);
      const partner = await fetchPartner(created.id);
      setMutationState({ kind: "success", partner });
      setDetailState({ kind: "success", partner });
      await loadList(filters, page);
      return partner;
    } catch (error) {
      setMutationState({ kind: "error", message: resolveErrorMessage(error) });
      return null;
    }
  }, [filters, loadList, page]);

  const transition = useCallback(async (
    partnerId: string,
    input: DshPartnerTransitionInput,
    version?: number,
  ) => {
    setMutationState({ kind: "loading" });
    try {
      await transitionPartner(partnerId, input, version);
      const partner = await fetchPartner(partnerId);
      setMutationState({ kind: "success", partner });
      setDetailState({ kind: "success", partner });
      await loadList(filters, page);
      return partner;
    } catch (error) {
      const value = error as { status?: number };
      if (value.status === 422) {
        setMutationState({ kind: "invalid_transition", message: "الانتقال غير مسموح من الحالة الحالية" });
      } else if (value.status === 409) {
        setMutationState({ kind: "version_conflict" });
      } else {
        setMutationState({ kind: "error", message: resolveErrorMessage(error) });
      }
      return null;
    }
  }, [filters, loadList, page]);

  const rows = listState.kind === "success" ? listState.partners.map(buildPartnerListRowViewModel) : [];
  const detailViewModel = detailState.kind === "success" ? buildPartnerDetailViewModel(detailState.partner) : null;
  const total = listState.kind === "success" ? listState.total : 0;
  const hasNextPage = (page + 1) * pageSize < total;
  const hasPrevPage = page > 0;

  return {
    listState,
    detailState,
    mutationState,
    filters,
    rows,
    detailViewModel,
    total,
    page,
    hasNextPage,
    hasPrevPage,
    setFilters: (nextFilters: DshPartnerListFilters) => { setFilters(nextFilters); setPage(0); },
    nextPage: () => { if (hasNextPage) setPage((current) => current + 1); },
    prevPage: () => { if (hasPrevPage) setPage((current) => current - 1); },
    loadDetail,
    create,
    transition,
    retry: () => { void loadList(filters, page); },
    resetMutation: () => setMutationState({ kind: "idle" }),
  };
}
