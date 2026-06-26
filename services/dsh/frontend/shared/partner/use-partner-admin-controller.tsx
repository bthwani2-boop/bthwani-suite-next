// Control-panel partner admin controller.
// Surfaces use this — they do NOT fetch directly.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import type { DshPartnerActivationStatus, DshPartnerSummary, DshPartner, DshPartnerDocument } from "./partner.types";
import {
  loadPartnerList,
  loadPartnerDetail,
  performTransition,
  performDocumentReview,
  loadReadiness,
  type PartnerListState,
  type PartnerDetailState,
  type PartnerActionState,
  type PartnerDocumentActionState,
  type PartnerReadinessState,
} from "./partner.controller-core";
import { partnerSummaryToAdminRow, documentToViewModel, readinessToViewModel } from "./partner.view-model";
import type { PartnerAdminRow } from "./partner.view-model";

export type PartnerAdminController = {
  listState: PartnerListState;
  detailState: PartnerDetailState;
  actionState: PartnerActionState;
  documentActionState: PartnerDocumentActionState;
  readinessState: PartnerReadinessState;
  visibleRows: PartnerAdminRow[];
  statusFilter: DshPartnerActivationStatus | "";
  selectedPartnerId: string | null;
  setStatusFilter: (status: DshPartnerActivationStatus | "") => void;
  selectPartner: (id: string | null) => void;
  transition: (partnerId: string, toStatus: DshPartnerActivationStatus, reason: string) => Promise<void>;
  reviewDocument: (partnerId: string, docId: string, decision: "approved" | "rejected" | "needs_resubmit", reason: string) => Promise<void>;
  loadPartnerReadiness: (partnerId: string) => Promise<void>;
  retry: () => void;
};

export function usePartnerAdminController(): PartnerAdminController {
  const identity = useIdentitySession();
  const token = identity.state.kind === "authenticated" ? (identity.state as { token?: string }).token ?? "" : "";

  const [listState, setListState] = useState<PartnerListState>({ kind: "idle" });
  const [detailState, setDetailState] = useState<PartnerDetailState>({ kind: "idle" });
  const [actionState, setActionState] = useState<PartnerActionState>({ kind: "idle" });
  const [documentActionState, setDocumentActionState] = useState<PartnerDocumentActionState>({ kind: "idle" });
  const [readinessState, setReadinessState] = useState<PartnerReadinessState>({ kind: "idle" });
  const [statusFilter, setStatusFilter] = useState<DshPartnerActivationStatus | "">("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const doLoadList = useCallback(
    (filter: DshPartnerActivationStatus | "") => {
      if (!token) return;
      setListState({ kind: "loading" });
      void loadPartnerList({ status: filter || undefined, limit: 20, offset: 0 }, token).then(setListState);
    },
    [token],
  );

  useEffect(() => {
    doLoadList(statusFilter);
  }, [doLoadList, statusFilter]);

  const selectPartner = useCallback(
    (id: string | null) => {
      setSelectedPartnerId(id);
      setDetailState({ kind: "idle" });
      if (!id || !token) return;
      setDetailState({ kind: "loading" });
      void loadPartnerDetail(id, token).then(setDetailState);
    },
    [token],
  );

  const transition = useCallback(
    async (partnerId: string, toStatus: DshPartnerActivationStatus, reason: string) => {
      if (!token) return;
      setActionState({ kind: "pending" });
      const result = await performTransition(partnerId, toStatus, reason, token);
      setActionState(result);
      if (result.kind === "success") {
        // Refresh list and detail
        doLoadList(statusFilter);
        void loadPartnerDetail(partnerId, token).then(setDetailState);
      }
    },
    [token, statusFilter, doLoadList],
  );

  const reviewDocument = useCallback(
    async (partnerId: string, docId: string, decision: "approved" | "rejected" | "needs_resubmit", reason: string) => {
      if (!token) return;
      setDocumentActionState({ kind: "pending" });
      const result = await performDocumentReview(partnerId, docId, decision, reason, token);
      setDocumentActionState(result);
      if (result.kind === "success") {
        void loadPartnerDetail(partnerId, token).then(setDetailState);
      }
    },
    [token],
  );

  const loadPartnerReadiness = useCallback(
    async (partnerId: string) => {
      if (!token) return;
      setReadinessState({ kind: "loading" });
      const result = await loadReadiness(partnerId, token);
      setReadinessState(result);
    },
    [token],
  );

  const retry = useCallback(() => doLoadList(statusFilter), [doLoadList, statusFilter]);

  const visibleRows =
    listState.kind === "success"
      ? listState.data.partners.map(partnerSummaryToAdminRow)
      : [];

  void abortRef;

  return {
    listState,
    detailState,
    actionState,
    documentActionState,
    readinessState,
    visibleRows,
    statusFilter,
    selectedPartnerId,
    setStatusFilter,
    selectPartner,
    transition,
    reviewDocument,
    loadPartnerReadiness,
    retry,
  };
}
