import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listCatalogApprovals,
  transitionCatalogApproval,
} from "../partner/catalog-approval.api";
import type { ApprovalRecord, ApprovalStage } from "../partner/partner.types";
import type { CatalogSubmission, CatalogSubmissionState } from "./catalog.types";

type LiveApprovalRecord = ApprovalRecord & { readonly entityId?: string };

const NEXT_APPROVAL_STAGE: Partial<Record<ApprovalStage, ApprovalStage>> = {
  "partner-submitted": "partner-review",
  "field-submitted": "partner-review",
  "partner-review": "partner-approved",
  "partner-approved": "marketing-review",
  "marketing-review": "marketing-approved",
  "marketing-approved": "catalog-adopted",
  "catalog-adopted": "client-visible",
};

function entityKey(record: ApprovalRecord): string {
  return (record as LiveApprovalRecord).entityId || record.title;
}

function statusFor(stage: ApprovalStage): CatalogSubmission["status"] {
  if (stage === "rejected") return "rejected";
  if (["partner-approved", "marketing-approved", "catalog-adopted", "client-visible"].includes(stage)) {
    return "approved";
  }
  return "submitted";
}

function toSubmission(record: ApprovalRecord): CatalogSubmission {
  return {
    id: record.id,
    storeId: entityKey(record),
    revision: Math.max(1, (record.auditTrail?.length ?? 0) + 1),
    status: statusFor(record.stage),
    submittedBy: record.source,
    reviewReason: record.metadata?.rejectionReason ?? record.metadata?.requiredFix ?? "",
    createdAt: record.submittedAt,
  };
}

function errorMessage(error: unknown): string {
  const typed = error as { readonly message?: string };
  return typed.message ?? "تعذر تنفيذ قرار اعتماد الكتالوج.";
}

function classify(error: unknown): CatalogSubmissionState {
  const typed = error as { readonly status?: number; readonly message?: string };
  if (typed.status === 401 || typed.status === 403) return { kind: "permission_denied" };
  return { kind: "error", message: typed.message ?? "تعذر تحميل طلبات اعتماد الكتالوج من DSH." };
}

export function useCatalogApprovalController(authSession: string) {
  const [records, setRecords] = useState<readonly ApprovalRecord[]>([]);
  const [state, setState] = useState<CatalogSubmissionState>({ kind: "loading" });
  const [action, setAction] = useState<"idle" | "submitting">("idle");
  const [mutationError, setMutationError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (authSession !== "authenticated") {
      setState({ kind: "permission_denied" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const next = await listCatalogApprovals();
      setRecords(next);
      setState(next.length === 0
        ? { kind: "empty" }
        : { kind: "success", submissions: next.map(toSubmission) });
    } catch (error) {
      setRecords([]);
      setState(classify(error));
    }
  }, [authSession]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const recordByStore = useMemo(() => {
    const map = new Map<string, ApprovalRecord>();
    for (const record of records) map.set(entityKey(record), record);
    return map;
  }, [records]);

  const canApprove = useCallback((storeId: string) => {
    const record = recordByStore.get(storeId);
    return Boolean(record && NEXT_APPROVAL_STAGE[record.stage]);
  }, [recordByStore]);

  const canReject = useCallback((storeId: string) => {
    const stage = recordByStore.get(storeId)?.stage;
    return Boolean(stage && stage !== "rejected" && stage !== "client-visible");
  }, [recordByStore]);

  const decide = useCallback(async (input: {
    readonly storeId: string;
    readonly decision: "approved" | "rejected";
    readonly reason: string;
  }) => {
    const record = recordByStore.get(input.storeId);
    if (!record) {
      setMutationError("لم يعد طلب الاعتماد موجودًا في القراءة الحية.");
      return;
    }
    const reason = input.reason.trim();
    if (reason.length < 3) {
      setMutationError("سبب القرار مطلوب.");
      return;
    }

    const toStage = input.decision === "rejected"
      ? "rejected"
      : NEXT_APPROVAL_STAGE[record.stage];
    if (!toStage) {
      setMutationError("لا يوجد انتقال اعتماد قانوني من الحالة الحالية.");
      return;
    }

    setAction("submitting");
    setMutationError(null);
    try {
      await transitionCatalogApproval(record.id, toStage, reason);
      await reload();
    } catch (error) {
      setMutationError(errorMessage(error));
    } finally {
      setAction("idle");
    }
  }, [recordByStore, reload]);

  return { state, action, mutationError, canApprove, canReject, decide, reload };
}
