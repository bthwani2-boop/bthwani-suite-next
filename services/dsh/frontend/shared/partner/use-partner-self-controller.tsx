// app-partner self controller. Surfaces use this — they do NOT fetch.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  fetchPartnerMe,
  fetchPartnerMeReadiness,
  fetchListDocuments,
} from "../../../clients/partner-client";
import { partnerToSelfViewModel, documentToViewModel, readinessToViewModel } from "./partner.view-model";
import type { PartnerSelfViewModel, DocumentViewModel, ReadinessViewModel } from "./partner.view-model";

type SelfState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; vm: PartnerSelfViewModel; partnerId: string }
  | { kind: "error"; message: string };

type DocsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; docs: DocumentViewModel[] }
  | { kind: "error"; message: string };

type ReadinessState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; vm: ReadinessViewModel }
  | { kind: "error"; message: string };

export type PartnerSelfController = {
  selfState: SelfState;
  docsState: DocsState;
  readinessState: ReadinessState;
  loadDocuments: () => void;
  loadReadiness: () => void;
  retry: () => void;
};

export function usePartnerSelfController(opts?: { autoLoadDocuments?: boolean }): PartnerSelfController {
  const identity = useIdentitySession();
  const token = identity.state.kind === "authenticated" ? (identity.state as { token?: string }).token ?? "" : "";

  const [selfState, setSelfState] = useState<SelfState>({ kind: "idle" });
  const [docsState, setDocsState] = useState<DocsState>({ kind: "idle" });
  const [readinessState, setReadinessState] = useState<ReadinessState>({ kind: "idle" });

  const doLoadSelf = useCallback(() => {
    if (!token) return;
    setSelfState({ kind: "loading" });
    void fetchPartnerMe(token).then((res) => {
      if (res.ok) {
        setSelfState({
          kind: "success",
          vm: partnerToSelfViewModel(res.data),
          partnerId: res.data.id,
        });
      } else {
        setSelfState({ kind: "error", message: res.error.message });
      }
    });
  }, [token]);

  useEffect(() => { doLoadSelf(); }, [doLoadSelf]);

  const partnerId = selfState.kind === "success" ? selfState.partnerId : null;

  const loadDocuments = useCallback(() => {
    if (!token || !partnerId) return;
    setDocsState({ kind: "loading" });
    void fetchListDocuments(partnerId, token).then((res) => {
      if (res.ok) {
        setDocsState({ kind: "success", docs: res.data.documents.map(documentToViewModel) });
      } else {
        setDocsState({ kind: "error", message: res.error.message });
      }
    });
  }, [token, partnerId]);

  // Auto-load documents when self resolves, if the caller opts in.
  // This keeps data-loading logic out of surface components.
  const autoLoad = opts?.autoLoadDocuments ?? false;
  useEffect(() => {
    if (autoLoad && partnerId && docsState.kind === "idle") {
      loadDocuments();
    }
  }, [autoLoad, partnerId, docsState.kind, loadDocuments]);

  const loadReadiness = useCallback(() => {
    if (!token) return;
    setReadinessState({ kind: "loading" });
    void fetchPartnerMeReadiness(token).then((res) => {
      if (res.ok) {
        setReadinessState({ kind: "success", vm: readinessToViewModel(res.data) });
      } else {
        setReadinessState({ kind: "error", message: res.error.message });
      }
    });
  }, [token]);

  return {
    selfState,
    docsState,
    readinessState,
    loadDocuments,
    loadReadiness,
    retry: doLoadSelf,
  };
}
