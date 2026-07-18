"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, Text, lightThemeColors } from "@bthwani/ui-kit";
import {
  approvePayoutRequest,
  completePayoutRequest,
  processPayoutRequest,
  rejectPayoutRequest,
  type FinanceActionResult,
  type FinancePayoutRequest,
} from "../../shared/finance-wlt-link/finance/finance.controller";
import { GovernedSettlementPanel } from "./GovernedSettlementPanel";

type PayoutRequestsPanelProps = {
  readonly requests: readonly FinancePayoutRequest[];
  readonly reload: () => Promise<void>;
};

type PayoutAction = {
  readonly id: "approve" | "reject" | "process" | "complete";
  readonly label: string;
  readonly tone: "success" | "danger" | "primary" | "secondary";
  readonly run: (payoutId: string) => Promise<FinanceActionResult>;
};

const STATUS_META: Record<string, { readonly label: string; readonly tone: "neutral" | "success" | "warning" | "danger" }> = {
  pending: { label: "بانتظار المراجعة", tone: "warning" },
  approved: { label: "معتمد بانتظار الإرسال", tone: "warning" },
  provider_pending: { label: "قيد الإرسال إلى المزود", tone: "warning" },
  processing: { label: "المزود أكد المعالجة", tone: "warning" },
  provider_result_unknown: { label: "نتيجة المزود غير محسومة", tone: "danger" },
  completed: { label: "مكتمل ومُرحّل", tone: "success" },
  rejected: { label: "مرفوض", tone: "danger" },
  failed: { label: "فشل موثق", tone: "danger" },
};

function actionsForStatus(status: string): readonly PayoutAction[] {
  switch (status) {
    case "pending":
      return [
        { id: "approve", label: "اعتماد الطلب", tone: "success", run: approvePayoutRequest },
        { id: "reject", label: "رفض وإعادة الحجز", tone: "danger", run: rejectPayoutRequest },
      ];
    case "approved":
      return [
        { id: "process", label: "إرسال إلى المزود", tone: "primary", run: processPayoutRequest },
        { id: "reject", label: "إلغاء قبل الإرسال", tone: "danger", run: rejectPayoutRequest },
      ];
    case "processing":
      return [{ id: "complete", label: "تأكيد الاكتمال والترحيل", tone: "success", run: completePayoutRequest }];
    default:
      return [];
  }
}

function formatMoney(amountMinorUnits: number, currency: string): string {
  try {
    const formatter = new Intl.NumberFormat("ar-YE", { style: "currency", currency });
    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
    return formatter.format(amountMinorUnits / (10 ** fractionDigits));
  } catch {
    return `${amountMinorUnits.toLocaleString("ar-YE")} ${currency}`;
  }
}

function terminalOrHoldMessage(request: FinancePayoutRequest): string | null {
  switch (request.status) {
    case "provider_pending":
      return "تم حجز الطلب لدى المزود ولم تصل نتيجة نهائية بعد. لا يُسمح بإعادة الإرسال أو تحرير الرصيد.";
    case "provider_result_unknown":
      return "النتيجة غير محسومة. يجب استخدام المطابقة والاستعلام لدى المزود؛ لا يوجد زر فشل يدوي يحرر الأموال.";
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

export function PayoutRequestsPanel({ requests, reload }: PayoutRequestsPanelProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedRequests = useMemo(
    () => [...requests].sort((left, right) => String(right.requestedAt ?? "").localeCompare(String(left.requestedAt ?? ""))),
    [requests],
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
    <>
      <GovernedSettlementPanel reload={reload} />
      <Card style={{ padding: "1.5rem" }}>
        <Text role="titleMd" style={{ marginBottom: "0.5rem" }}>طلبات الصرف والتسويات الميدانية</Text>
        <Text role="body" tone="muted" style={{ marginBottom: "1rem" }}>
          WLT يملك الرصيد والحجز ودليل المزود والقيد. كل زر أدناه ظاهر فقط عندما تسمح به حالة الطلب.
        </Text>
        {actionError ? (
          <Card style={{ padding: "0.75rem", marginBottom: "1rem", borderLeft: `4px solid ${lightThemeColors.danger}` }}>
            <Text role="body" tone="danger">{actionError}</Text>
          </Card>
        ) : null}
        {sortedRequests.length === 0 ? (
          <Text role="body" tone="muted">لا توجد طلبات صرف مسجلة.</Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {sortedRequests.map((request) => {
              const status = STATUS_META[request.status] ?? { label: request.status, tone: "neutral" as const };
              const actions = actionsForStatus(request.status);
              const message = terminalOrHoldMessage(request);
              return (
                <Card key={request.id} style={{ padding: "1rem", borderLeft: `4px solid ${request.status === "provider_result_unknown" ? lightThemeColors.danger : lightThemeColors.warning}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "260px" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <Text role="body" style={{ fontWeight: "bold" }}>طلب: {request.id}</Text>
                        <Badge label={status.label} tone={status.tone} />
                      </div>
                      <Text role="caption" tone="muted">المستفيد: {request.beneficiaryActorId} ({request.beneficiaryActorType})</Text>
                      <Text role="caption" tone="muted">المبلغ: {formatMoney(request.amountMinorUnits, request.currency)}</Text>
                      {request.providerReference ? <Text role="caption">مرجع المزود: {request.providerReference}</Text> : null}
                      {request.providerStatus ? <Text role="caption" tone="muted">حالة المزود: {request.providerStatus}</Text> : null}
                      {message ? <Text role="caption" tone={request.status === "provider_result_unknown" ? "danger" : "muted"}>{message}</Text> : null}
                    </div>
                    {actions.length > 0 ? (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {actions.map((action) => {
                          const key = `${request.id}:${action.id}`;
                          const busy = busyKey === key;
                          return (
                            <Button
                              key={action.id}
                              label={busy ? "جارٍ التنفيذ…" : action.label}
                              tone={action.tone}
                              disabled={busyKey !== null}
                              onPress={() => runAction(request, action)}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
