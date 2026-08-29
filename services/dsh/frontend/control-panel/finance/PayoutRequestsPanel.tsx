"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, Text } from "@bthwani/ui-kit";
import type { CpBadgeTone, CpButtonVariant } from "@bthwani/control-panel/components";
import { CpBadge, CpButton } from "@bthwani/control-panel/components";
import {
  approvePayoutRequest,
  completePayoutRequest,
  rejectPayoutRequest,
  type FinanceActionResult,
  type FinancePayoutRequest,
  formatWltMoney,
} from '@bthwani/dsh/wlt';

type PayoutRequestsPanelProps = {
  readonly requests: readonly FinancePayoutRequest[];
  readonly reload: () => Promise<void>;
  readonly canManage: boolean;
  readonly beneficiaryActorType?: string;
};

type PayoutAction = {
  readonly id: "approve" | "reject" | "complete";
  readonly label: string;
  readonly tone: CpButtonVariant;
  readonly run: (payoutId: string) => Promise<FinanceActionResult>;
};

const STATUS_META: Record<string, { readonly label: string; readonly tone: CpBadgeTone }> = {
  pending: { label: "بانتظار المراجعة", tone: "warning" },
  approved: { label: "معتمد بانتظار التنفيذ الخارجي", tone: "warning" },
  executed: { label: "نُفّذ خارجيًا بانتظار التحقق المستقل", tone: "warning" },
  verified: { label: "تم التحقق المستقل بانتظار الترحيل", tone: "warning" },
  completed: { label: "مكتمل ومُرحّل", tone: "success" },
  rejected: { label: "مرفوض", tone: "danger" },
  failed: { label: "فشل موثق", tone: "danger" },
  // Historical rows from the retired provider-managed Cash-Out model.
  provider_pending: { label: "سجل قديم: قيد الإرسال إلى المزود", tone: "neutral" },
  processing: { label: "سجل قديم: المزود أكد المعالجة", tone: "neutral" },
  provider_result_unknown: { label: "سجل قديم: نتيجة المزود غير محسومة", tone: "neutral" },
};

// Execution and independent verification happen against a frozen settlement
// batch in the settlement workbench, not from this list: the executor must not
// be able to alter the approved beneficiary, destination or amount.
function actionsForStatus(status: string): readonly PayoutAction[] {
  switch (status) {
    case "pending":
      return [
        { id: "approve", label: "اعتماد الطلب", tone: "primary", run: approvePayoutRequest },
        { id: "reject", label: "رفض وإعادة الحجز", tone: "danger", run: rejectPayoutRequest },
      ];
    case "approved":
      return [{ id: "reject", label: "إلغاء قبل التنفيذ", tone: "danger", run: rejectPayoutRequest }];
    case "verified":
      return [{ id: "complete", label: "تأكيد الاكتمال والترحيل", tone: "primary", run: completePayoutRequest }];
    default:
      return [];
  }
}

function formatMoney(amountMinorUnits: number, currency: string): string {
  return formatWltMoney(amountMinorUnits, currency);
}

function terminalOrHoldMessage(request: FinancePayoutRequest): string | null {
  switch (request.status) {
    case "approved":
      return "الطلب معتمد ومحجوز. التنفيذ الخارجي يتم من دفعة تسوية مجمّدة في مساحة تنفيذ التسويات.";
    case "executed":
      return "تم تنفيذ التحويل الخارجي وتسجيل مرجعه. لا يكتمل الصرف قبل تحقق مستقل من مشغّل مختلف.";
    case "verified":
      return "تم التحقق المستقل من التحويل الخارجي. يمكن الآن ترحيل الصرف محاسبيًا.";
    case "provider_pending":
    case "processing":
    case "provider_result_unknown":
      return "سجل قديم من نموذج الصرف عبر المزود المتوقف. لا توجد إجراءات متاحة عليه.";
    case "completed":
      return "اكتمل الصرف، أُزيل الحجز من المحفظة، وكُتب القيد المحاسبي.";
    case "rejected":
      return "رُفض الطلب وأُعيد المبلغ المحجوز إلى الرصيد المتاح.";
    case "failed":
      return request.failureReason ? `فشل المزود: ${request.failureReason}` : "فشل موثق قبل اكتمال الصرف.";
    default:
      return null;
  }
}

export function PayoutRequestsPanel({ requests, reload, canManage, beneficiaryActorType }: PayoutRequestsPanelProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedRequests = useMemo(
    () => requests
      .filter((request) => !beneficiaryActorType || request.beneficiaryActorType === beneficiaryActorType)
      .sort((left, right) => String(right.requestedAt ?? "").localeCompare(String(left.requestedAt ?? ""))),
    [beneficiaryActorType, requests],
  );

  const runAction = useCallback(async (request: FinancePayoutRequest, action: PayoutAction) => {
    const key = `${request.id}:${action.id}`;
    setBusyKey(key);
    setActionError(null);
    try {
      const result = await action.run(request.id);
      if (!result.ok) {
        setActionError(`${result.code}: ${result.message}`);
        return;
      }
      await reload();
    } finally {
      setBusyKey(null);
    }
  }, [reload]);

  return (
    <Card style={{ padding: "1.5rem" }}>
      <Text role="titleMd" style={{ marginBottom: "0.5rem" }}>طلبات الصرف</Text>
      <Text role="body" tone="muted" style={{ marginBottom: "1rem" }}>
        WLT يملك الوجهة والرصيد والحجز ودليل المزود والقيد. كل زر ظاهر فقط عندما تسمح به الحالة، وهوية المشغّل تُحل في DSH ولا تُقبل من المتصفح.
      </Text>
      {actionError ? (
        <Card style={{ padding: "0.75rem", marginBottom: "1rem" }}>
          <Text role="body" tone="danger">{actionError}</Text>
        </Card>
      ) : null}
      {sortedRequests.length === 0 ? (
        <Text role="body" tone="muted">لا توجد طلبات صرف مطابقة لهذا النطاق.</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sortedRequests.map((request) => {
            const status = STATUS_META[request.status] ?? { label: request.status, tone: "neutral" as const };
            const actions = actionsForStatus(request.status);
            const message = terminalOrHoldMessage(request);
            return (
              <Card key={request.id} style={{ padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "260px" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <Text role="body" style={{ fontWeight: "bold" }}>طلب: {request.id}</Text>
                      <CpBadge tone={status.tone}>{status.label}</CpBadge>
                    </div>
                    <Text role="caption" tone="muted">المستفيد: {request.beneficiaryActorId} ({request.beneficiaryActorType})</Text>
                    <Text role="caption" tone="muted">المبلغ: {formatMoney(request.amountMinorUnits, request.currency)}</Text>
                    {request.providerReference ? <Text role="caption">مرجع المزود: {request.providerReference}</Text> : null}
                    {request.providerStatus ? <Text role="caption" tone="muted">حالة المزود: {request.providerStatus}</Text> : null}
                    {message ? <Text role="caption" tone={request.status === "provider_result_unknown" ? "danger" : "muted"}>{message}</Text> : null}
                  </div>
                  {actions.length > 0 && canManage ? (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {actions.map((action) => {
                        const key = `${request.id}:${action.id}`;
                        const busy = busyKey === key;
                        return (
                          <CpButton
                            key={action.id}
                            variant={action.tone}
                            disabled={busyKey !== null}
                            onClick={() => runAction(request, action)}
                          >
                            {busy ? "جارٍ التنفيذ…" : action.label}
                          </CpButton>
                        );
                      })}
                    </div>
                  ) : actions.length > 0 ? <Text role="caption" tone="muted">قراءة فقط — تنفيذ طلب الصرف يتطلب finance.manage.</Text> : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
