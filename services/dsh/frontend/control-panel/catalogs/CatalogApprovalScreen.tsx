"use client";

import { useState, type CSSProperties } from "react";
import {
  CpBadge,
  CpButton,
  CpMutedInline,
  CpPageHeader,
  CpStatePanel,
  CpStateView,
  CpTextInput,
} from "@bthwani/control-panel/components";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useCatalogApprovalController } from "../../shared/catalog";
import { useIdentitySession } from "@bthwani/core-identity";

const listSectionStyle: CSSProperties = { display: "grid", gap: "1rem" };
const submissionCardStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  padding: "1rem",
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "1rem",
};
const decisionButtonRowStyle: CSSProperties = { display: "flex", gap: "0.75rem" };

const SUBMISSION_STATUS_TONE: Record<"submitted" | "approved" | "rejected", CpBadgeTone> = {
  submitted: "warning",
  approved: "success",
  rejected: "danger",
};

export function CatalogApprovalScreen() {
  const session = useIdentitySession();
  const controller = useCatalogApprovalController(session.state.kind);
  const [reasonByStore, setReasonByStore] = useState<Record<string, string>>({});

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="اعتماد كتالوجات المتاجر" />}
      stateView={
        controller.state.kind === "loading" ? <CpStateView kind="loading" title="جاري تحميل طلبات الاعتماد…" />
          : controller.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد طلبات اعتماد معلقة." />
          : controller.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل طلبات الاعتماد" description={controller.state.message} />
          : controller.state.kind === "permission_denied" ? <CpStateView kind="error" title="لا تملك الصلاحية." />
          : undefined
      }
    >
      {controller.mutationError ? <CpStatePanel role="alert" title="تعذر تنفيذ القرار" description={controller.mutationError} /> : null}
      {controller.state.kind === "success" ? (
        <section style={listSectionStyle}>
          {controller.state.submissions.map((submission) => {
            const reason = (reasonByStore[submission.storeId] ?? "").trim();
            const busy = controller.action === "submitting";
            return (
              <article key={submission.id} style={submissionCardStyle}>
                <strong>{submission.storeId} — النسخة {submission.revision}</strong>
                <div>
                  <CpMutedInline tight>الحالة:</CpMutedInline>{" "}
                  <CpBadge tone={SUBMISSION_STATUS_TONE[submission.status]}>{submission.status}</CpBadge>
                </div>
                <CpTextInput
                  value={reasonByStore[submission.storeId] ?? ""}
                  onChange={(value) => setReasonByStore((current) => ({ ...current, [submission.storeId]: value }))}
                  placeholder="سبب قرار الاعتماد"
                  aria-label={`سبب قرار ${submission.storeId}`}
                />
                <div style={decisionButtonRowStyle}>
                  <CpButton
                    variant="primary"
                    disabled={reason.length < 3 || busy || !controller.canApprove(submission.storeId)}
                    onClick={() => void controller.decide({
                      storeId: submission.storeId,
                      decision: "approved",
                      reason,
                    })}
                  >
                    انتقال للمرحلة التالية
                  </CpButton>
                  <CpButton
                    variant="danger"
                    disabled={reason.length < 3 || busy || !controller.canReject(submission.storeId)}
                    onClick={() => void controller.decide({
                      storeId: submission.storeId,
                      decision: "rejected",
                      reason,
                    })}
                  >
                    رفض
                  </CpButton>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </DataTablePageFrame>
  );
}
