import { useCallback, useEffect, useState } from "react";
import {
  createCatalogCategory,
  createCatalogProduct,
  fetchCatalogSubmissions,
  fetchPartnerCatalog,
  fetchPublishedCatalog,
  submitCatalog,
  decideCatalog,
} from "./catalog.api";
import type { CatalogState, CatalogSubmissionState } from "./catalog.types";

export function usePartnerCatalogController(authKind = "unauthenticated") {
  const [state, setState] = useState<CatalogState>({ kind: "loading" });
  const [action, setAction] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const load = useCallback(async () => setState(await fetchPartnerCatalog()), []);
  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);
  return {
    state,
    action,
    retry: () => void load(),
    createCategory: async (input: Parameters<typeof createCatalogCategory>[0]) => {
      setAction("submitting");
      try { await createCatalogCategory(input); setAction("success"); await load(); }
      catch { setAction("error"); }
    },
    createProduct: async (input: Parameters<typeof createCatalogProduct>[0]) => {
      setAction("submitting");
      try { await createCatalogProduct(input); setAction("success"); await load(); }
      catch { setAction("error"); }
    },
    submit: async () => {
      setAction("submitting");
      try { await submitCatalog(); setAction("success"); await load(); }
      catch { setAction("error"); }
    },
  };
}

export function usePublishedCatalogController(storeId: string) {
  const [state, setState] = useState<CatalogState>({ kind: "loading" });
  const load = useCallback(async () => setState(await fetchPublishedCatalog(storeId)), [storeId]);
  useEffect(() => { void load(); }, [load]);
  return { state, retry: () => void load() };
}

export function useCatalogApprovalController(authKind = "unauthenticated") {
  const [state, setState] = useState<CatalogSubmissionState>({ kind: "loading" });
  const [action, setAction] = useState<"idle" | "submitting" | "success" | "error" | "conflict">("idle");
  const load = useCallback(async () => setState(await fetchCatalogSubmissions()), []);
  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);
  return {
    state,
    action,
    retry: () => void load(),
    decide: async (input: Parameters<typeof decideCatalog>[0]) => {
      setAction("submitting");
      try { await decideCatalog(input); setAction("success"); await load(); }
      catch (error) {
        const typed = error as { status?: number };
        setAction(typed.status === 409 ? "conflict" : "error");
      }
    },
  };
}
