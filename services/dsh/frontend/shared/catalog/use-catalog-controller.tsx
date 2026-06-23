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
import type {
  CatalogState,
  CatalogSubmission,
  CatalogSubmissionState,
  MediaUploadIntent,
} from "./catalog.types";

type ActionState = "idle" | "submitting" | "success" | "error" | "conflict";

export function usePartnerCatalogController(authKind = "unauthenticated") {
  const [state, setState] = useState<CatalogState>({ kind: "loading" });
  const [action, setAction] = useState<ActionState>("idle");
  const load = useCallback(async () => setState(await fetchPartnerCatalog()), []);
  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  const run = useCallback(
    async (op: () => Promise<unknown>) => {
      setAction("submitting");
      try {
        await op();
        setAction("success");
        await load();
      } catch (err) {
        const typed = err as { status?: number };
        setAction(typed.status === 409 ? "conflict" : "error");
      }
    },
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
  const [state, setState] = useState<CatalogState>({ kind: "loading" });
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
  const [action, setAction] = useState<ActionState>("idle");
  const load = useCallback(
    async () => setState(await fetchCatalogSubmissions()),
    [],
  );
  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);
  return {
    state,
    action,
    retry: () => void load(),
    decide: async (input: Parameters<typeof decideCatalog>[0]) => {
      setAction("submitting");
      try {
        await decideCatalog(input);
        setAction("success");
        await load();
      } catch (error) {
        const typed = error as { status?: number };
        setAction(typed.status === 409 ? "conflict" : "error");
      }
    },
  };
}

export function useCatalogAuditController(
  storeId: string,
  authKind = "unauthenticated",
) {
  const [entries, setEntries] = useState<readonly CatalogSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchCatalogAudit(storeId));
    } catch {
      setError("تعذر تحميل سجل تدقيق الكتالوج.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);
  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);
  return { entries, loading, error, retry: () => void load() };
}
