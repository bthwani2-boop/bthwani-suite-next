import { useCallback, useEffect, useState } from "react";
import {
  fetchPartners, fetchPartner, createPartner, transitionPartner,
  fetchPartnerReadiness, fetchPartnerDocuments, addPartnerDocument,
  reviewPartnerDocument, fetchPartnerStores, linkPartnerStore,
  fetchPartnerAuditEvents,
} from "./partner.api";
import type {
  DshCreatePartnerInput, DshPartnerTransitionInput,
  DshAddDocumentInput, DshReviewDocumentInput,
} from "./partner.types";
import type {
  DshPartnerListState, DshPartnerDetailState, DshPartnerMutationState,
  DshPartnerDocumentsState, DshPartnerReadinessState, DshPartnerAuditState,
  DshPartnerStoresState,
} from "./partner.states";
import { buildPartnerListRowViewModel, buildPartnerDetailViewModel, buildPartnerReadinessViewModel } from "./partner.view-model";

function resolveErrorMessage(err: unknown): string {
  const e = err as { status?: number };
  if (e?.status === 401) return "جلسة منتهية — يرجى تسجيل الدخول مجدداً";
  if (e?.status === 403) return "غير مصرح لك بهذه العملية";
  if (e?.status === 404) return "الشريك غير موجود";
  if (e?.status === 409) return "تعارض في البيانات — قد يكون الشريك موجوداً بالفعل";
  if (e?.status === 422) return "الانتقال غير مسموح من الحالة الحالية";
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
  const PAGE_SIZE = 50;

  const isAuth = authKind === "authenticated";

  const loadList = useCallback(async (f: DshPartnerListFilters, p: number) => {
    if (!isAuth) return;
    setListState({ kind: "loading" });
    try {
      const { partners, total } = await fetchPartners({
        ...(f.status ? { status: f.status } : {}),
        ...(f.category ? { category: f.category } : {}),
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
      });
      if (partners.length === 0) {
        setListState({ kind: "empty" });
      } else {
        setListState({ kind: "success", partners, total, page: p });
      }
    } catch (err) {
      setListState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [isAuth]);

  useEffect(() => {
    void loadList(filters, page);
  }, [loadList, filters, page]);

  const loadDetail = useCallback(async (partnerId: string) => {
    if (!isAuth) return;
    setDetailState({ kind: "loading" });
    try {
      const partner = await fetchPartner(partnerId);
      setDetailState({ kind: "success", partner });
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 404) setDetailState({ kind: "not_found" });
      else if (e?.status === 403) setDetailState({ kind: "forbidden" });
      else setDetailState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [isAuth]);

  const create = useCallback(async (input: DshCreatePartnerInput) => {
    setMutationState({ kind: "loading" });
    try {
      const partner = await createPartner(input);
      setMutationState({ kind: "success", partner });
      void loadList(filters, page);
      return partner;
    } catch (err) {
      setMutationState({ kind: "error", message: resolveErrorMessage(err) });
      return null;
    }
  }, [filters, page, loadList]);

  const transition = useCallback(async (partnerId: string, input: DshPartnerTransitionInput) => {
    setMutationState({ kind: "loading" });
    try {
      const partner = await transitionPartner(partnerId, input);
      setMutationState({ kind: "success", partner });
      setDetailState({ kind: "success", partner });
      void loadList(filters, page);
      return partner;
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 422) {
        setMutationState({ kind: "invalid_transition", message: "الانتقال غير مسموح من الحالة الحالية" });
      } else if (e?.status === 409) {
        setMutationState({ kind: "version_conflict" });
      } else {
        setMutationState({ kind: "error", message: resolveErrorMessage(err) });
      }
      return null;
    }
  }, [filters, page, loadList]);

  const retry = useCallback(() => void loadList(filters, page), [loadList, filters, page]);

  const rows = listState.kind === "success"
    ? listState.partners.map(buildPartnerListRowViewModel)
    : [];

  const detailViewModel = detailState.kind === "success"
    ? buildPartnerDetailViewModel(detailState.partner)
    : null;

  const total = listState.kind === "success" ? listState.total : 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;
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
    setFilters: (f: DshPartnerListFilters) => { setFilters(f); setPage(0); },
    nextPage: () => { if (hasNextPage) setPage(p => p + 1); },
    prevPage: () => { if (hasPrevPage) setPage(p => p - 1); },
    loadDetail,
    create,
    transition,
    retry,
    resetMutation: () => setMutationState({ kind: "idle" }),
  };
}

export function usePartnerDocumentsController(partnerId: string, authKind: string) {
  const [state, setState] = useState<DshPartnerDocumentsState>({ kind: "idle" });
  const [actionState, setActionState] = useState<DshPartnerMutationState>({ kind: "idle" });
  const isAuth = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuth || !partnerId) return;
    setState({ kind: "loading" });
    try {
      const { documents, total } = await fetchPartnerDocuments(partnerId);
      setState(documents.length === 0
        ? { kind: "empty" }
        : { kind: "success", documents, total });
    } catch (err) {
      setState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [isAuth, partnerId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (input: DshAddDocumentInput) => {
    setActionState({ kind: "loading" });
    try {
      await addPartnerDocument(partnerId, input);
      setActionState({ kind: "idle" });
      void load();
    } catch (err) {
      setActionState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [partnerId, load]);

  const review = useCallback(async (docId: string, input: DshReviewDocumentInput) => {
    setActionState({ kind: "loading" });
    try {
      await reviewPartnerDocument(partnerId, docId, input);
      setActionState({ kind: "idle" });
      void load();
    } catch (err) {
      setActionState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [partnerId, load]);

  return { state, actionState, load, add, review };
}

export function usePartnerReadinessController(partnerId: string, authKind: string) {
  const [state, setState] = useState<DshPartnerReadinessState>({ kind: "idle" });
  const isAuth = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuth || !partnerId) return;
    setState({ kind: "loading" });
    try {
      const readiness = await fetchPartnerReadiness(partnerId);
      setState({ kind: "success", readiness });
    } catch (err) {
      setState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [isAuth, partnerId]);

  useEffect(() => { void load(); }, [load]);

  const viewModel = state.kind === "success"
    ? buildPartnerReadinessViewModel(state.readiness)
    : null;

  return { state, viewModel, reload: load };
}

export function usePartnerAuditController(partnerId: string, authKind: string) {
  const [state, setState] = useState<DshPartnerAuditState>({ kind: "idle" });
  const isAuth = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuth || !partnerId) return;
    setState({ kind: "loading" });
    try {
      const { events } = await fetchPartnerAuditEvents(partnerId);
      setState(events.length === 0
        ? { kind: "empty" }
        : { kind: "success", events });
    } catch (err) {
      setState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [isAuth, partnerId]);

  useEffect(() => { void load(); }, [load]);

  return { state, reload: load };
}

export function usePartnerDetailController(partnerId: string, authKind: string) {
  const [detailState, setDetailState] = useState<DshPartnerDetailState>({ kind: "idle" });
  const [mutationState, setMutationState] = useState<DshPartnerMutationState>({ kind: "idle" });
  const isAuth = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuth || !partnerId) return;
    setDetailState({ kind: "loading" });
    try {
      const partner = await fetchPartner(partnerId);
      setDetailState({ kind: "success", partner });
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 404) {
        setDetailState({ kind: "not_found" });
      } else {
        setDetailState({ kind: "error", message: resolveErrorMessage(err) });
      }
    }
  }, [isAuth, partnerId]);

  useEffect(() => { void load(); }, [load]);

  const transition = useCallback(async (input: DshPartnerTransitionInput) => {
    setMutationState({ kind: "loading" });
    try {
      await transitionPartner(partnerId, input);
      setMutationState({ kind: "idle" });
      void load();
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 422) {
        setMutationState({ kind: "error", message: "invalid_transition" });
      } else if (e?.status === 409) {
        setMutationState({ kind: "error", message: "version_conflict" });
      } else {
        setMutationState({ kind: "error", message: resolveErrorMessage(err) });
      }
    }
  }, [partnerId, load]);

  const detailViewModel = detailState.kind === "success"
    ? buildPartnerDetailViewModel(detailState.partner)
    : null;

  return { detailState, detailViewModel, mutationState, reload: load, transition };
}

export function usePartnerStoresController(partnerId: string, authKind: string) {
  const [state, setState] = useState<DshPartnerStoresState>({ kind: "idle" });
  const [actionState, setActionState] = useState<DshPartnerMutationState>({ kind: "idle" });
  const isAuth = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuth || !partnerId) return;
    setState({ kind: "loading" });
    try {
      const { stores, total } = await fetchPartnerStores(partnerId);
      setState(stores.length === 0
        ? { kind: "empty" }
        : { kind: "success", stores, total });
    } catch (err) {
      setState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [isAuth, partnerId]);

  useEffect(() => { void load(); }, [load]);

  const linkStore = useCallback(async (storeId: string) => {
    setActionState({ kind: "loading" });
    try {
      await linkPartnerStore(partnerId, storeId);
      setActionState({ kind: "idle" });
      void load();
    } catch (err) {
      setActionState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [partnerId, load]);

  return { state, actionState, reload: load, linkStore };
}
