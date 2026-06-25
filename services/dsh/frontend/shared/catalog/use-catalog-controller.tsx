import { useCallback, useEffect, useState } from "react";
import {
  completeMedia,
  createCatalogCategory,
  createCatalogProduct,
  decideCatalog,
  deleteCatalogCategory,
  deleteCatalogProduct,
  deleteMedia,
  fetchCatalogAudit,
  fetchCatalogSubmissions,
  fetchPartnerCatalog,
  fetchPublishedCatalog,
  submitCatalog,
  updateCatalogCategory,
  updateCatalogProduct,
  uploadMediaIntent,
} from "./catalog.api";
import {
  beginCatalogAuditLoad,
  resolveCatalogAuditError,
  resolveCatalogAuditSuccess,
  runCatalogAction,
  shouldLoadAuthenticatedCatalog,
} from "./catalog.controller-core";
import {
  catalogActionIdleState,
  catalogLoadingState,
  type CatalogActionState,
  type CatalogAuditState,
} from "./catalog.states";
import type {
  CatalogState,
  CatalogSubmissionState,
  MediaUploadIntent,
} from "./catalog.types";

export function usePartnerCatalogController(authKind = "unauthenticated") {
  const [state, setState] = useState<CatalogState>({ kind: "loading" });
  const [action, setAction] = useState<CatalogActionState>(catalogActionIdleState());
  const load = useCallback(async () => setState(await fetchPartnerCatalog()), []);
  useEffect(() => {
    if (shouldLoadAuthenticatedCatalog(authKind)) void load();
  }, [authKind, load]);

  const run = useCallback(
    async (op: () => Promise<unknown>) =>
      runCatalogAction(op, load, setAction, setAction),
    [load],
  );

  return {
    state,
    action,
    retry: () => void load(),

    createCategory: (input: Parameters<typeof createCatalogCategory>[0]) =>
      run(() => createCatalogCategory(input)),

    updateCategory: (
      categoryId: string,
      input: Parameters<typeof updateCatalogCategory>[1],
    ) => run(() => updateCatalogCategory(categoryId, input)),

    deleteCategory: (categoryId: string, expectedVersion: number) =>
      run(() => deleteCatalogCategory(categoryId, expectedVersion)),

    createProduct: (input: Parameters<typeof createCatalogProduct>[0]) =>
      run(() => createCatalogProduct(input)),

    updateProduct: (
      productId: string,
      input: Parameters<typeof updateCatalogProduct>[1],
    ) => run(() => updateCatalogProduct(productId, input)),

    deleteProduct: (productId: string, expectedVersion: number) =>
      run(() => deleteCatalogProduct(productId, expectedVersion)),

    uploadMedia: (input: Parameters<typeof uploadMediaIntent>[0]): Promise<MediaUploadIntent> =>
      uploadMediaIntent(input),

    completeMedia: (mediaId: string) => run(() => completeMedia(mediaId)),

    deleteMedia: (mediaId: string) => run(() => deleteMedia(mediaId)),

    submit: () => run(() => submitCatalog()),
  };
}

export function usePublishedCatalogController(storeId: string) {
  const [state, setState] = useState<CatalogState>(catalogLoadingState());
  const load = useCallback(
    async () => setState(await fetchPublishedCatalog(storeId)),
    [storeId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return { state, retry: () => void load() };
}

export function useCatalogApprovalController(authKind = "unauthenticated") {
  const [state, setState] = useState<CatalogSubmissionState>({ kind: "loading" });
  const [action, setAction] = useState<CatalogActionState>(catalogActionIdleState());
  const load = useCallback(
    async () => setState(await fetchCatalogSubmissions()),
    [],
  );
  useEffect(() => {
    if (shouldLoadAuthenticatedCatalog(authKind)) void load();
  }, [authKind, load]);
  return {
    state,
    action,
    retry: () => void load(),
    decide: async (input: Parameters<typeof decideCatalog>[0]) => {
      await runCatalogAction(() => decideCatalog(input), load, setAction, setAction);
    },
  };
}

export function useCatalogAuditController(
  storeId: string,
  authKind = "unauthenticated",
) {
  const [audit, setAudit] = useState<CatalogAuditState>({ kind: "idle", entries: [] });
  const load = useCallback(async () => {
    setAudit((previous) => beginCatalogAuditLoad(previous.entries));
    try {
      setAudit(resolveCatalogAuditSuccess(await fetchCatalogAudit(storeId)));
    } catch {
      setAudit((previous) => resolveCatalogAuditError(previous.entries));
    } finally {
    }
  }, [storeId]);
  useEffect(() => {
    if (shouldLoadAuthenticatedCatalog(authKind)) void load();
  }, [authKind, load]);
  return {
    entries: audit.entries,
    loading: audit.kind === "loading",
    error: audit.kind === "error" ? audit.message : null,
    retry: () => void load(),
  };
}
