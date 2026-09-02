"use client";

import { useState } from "react";
import { Card, StateView, Text } from "@bthwani/ui-kit";
import {
  CpBadge,
  CpButton,
  CpMutedInline,
  CpPageHeader,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { FinanceReadOnlyFrame } from "@bthwani/control-panel/shell";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";
import { formatWltMoney } from '@bthwani/dsh/finance';

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-control-panel-ledger",
);

type LedgerEntry = {
  id: string;
  entryType: string;
  actorId: string;
  actorType: string;
  sourceType: string;
  sourceId: string;
  referenceId: string;
  referenceType: string;
  amountMinorUnits: number;
  currency: string;
  debitCredit: string;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

type ScreenState = "idle" | "loading" | "error" | "loaded";

export function LedgerInspectorScreen() {
  const [state, setState] = useState<ScreenState>("idle");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    setState("loading");
    setError(null);
    try {
      const result = await request<{ ledgerEntries: LedgerEntry[] }>("/dsh/control-panel/finance/ledger-entries?limit=100");
      setEntries(result.ledgerEntries ?? []);
      setState("loaded");
    } catch (e: any) {
      setError(e.message || "فشل تحميل القيود");
      setState("error");
    }
  };

  return (
    <FinanceReadOnlyFrame
      header={
        <CpPageHeader title="فحص القيود (Ledger Inspector)">
          <CpMutedInline tight>عرض جميع القيود المالية من دفتر الأستاذ (WLT Ledger).</CpMutedInline>
        </CpPageHeader>
      }
      summary={
        <Card style={{ padding: "1.25rem" }}>
          <Text role="body" style={{ marginBottom: "1rem" }}>
            هذه الشاشة توفر وصولاً للقراءة فقط إلى القيود المحاسبية. القيود غير قابلة للتعديل أو الحذف وفقًا لقيود قاعدة البيانات (Immutability Constraints).
          </Text>
          <CpButton onClick={loadEntries} disabled={state === "loading"}>
            {state === "loading" ? "جارٍ التحميل..." : "تحديث القيود"}
          </CpButton>
        </Card>
      }
    >
      {state === "idle" ? (
        <StateView title="جاهز للاستعلام" description="اضغط على زر تحديث القيود لعرض أحدث 100 قيد محاسبي." />
      ) : state === "error" ? (
        <StateView tone="danger" title="خطأ في تحميل القيود" description={error || ""} actionLabel="إعادة المحاولة" onActionPress={loadEntries} />
      ) : (
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Text role="titleMd">القيود الأخيرة ({entries.length})</Text>
          </div>
          {entries.length === 0 ? (
            <StateView tone="neutral" title="لا توجد قيود" description="لم يتم تسجيل أي حركة مالية في الدفتر حتى الآن." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <CpTable aria-label="قيود الدفتر">
                <thead>
                  <tr>
                    <CpTableHeaderCell>التاريخ</CpTableHeaderCell>
                    <CpTableHeaderCell>النوع</CpTableHeaderCell>
                    <CpTableHeaderCell>الممثل</CpTableHeaderCell>
                    <CpTableHeaderCell>الاتجاه</CpTableHeaderCell>
                    <CpTableHeaderCell>المبلغ</CpTableHeaderCell>
                    <CpTableHeaderCell>الرصيد</CpTableHeaderCell>
                    <CpTableHeaderCell>المرجع</CpTableHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <CpTableCell>{entry.createdAt}</CpTableCell>
                      <CpTableCell>{entry.entryType}</CpTableCell>
                      <CpTableCell>
                        {entry.actorId ? (
                          <CpBadge tone="neutral">{entry.actorType}: {entry.actorId}</CpBadge>
                        ) : (
                          <CpBadge tone="neutral">نظام</CpBadge>
                        )}
                      </CpTableCell>
                      <CpTableCell>
                        <CpBadge tone={entry.debitCredit === "credit" ? "success" : "warning"}>
                          {entry.debitCredit === "credit" ? "دائن" : "مدين"}
                        </CpBadge>
                      </CpTableCell>
                      <CpTableCell>
                        <Text role="body" tone={entry.debitCredit === "credit" ? "success" : "danger"}>
                          {formatWltMoney(entry.amountMinorUnits, entry.currency)}
                        </Text>
                      </CpTableCell>
                      <CpTableCell>{formatWltMoney(entry.balanceAfter, entry.currency)}</CpTableCell>
                      <CpTableCell>
                        <CpMutedInline tight>{entry.referenceType}:{entry.referenceId}</CpMutedInline>
                      </CpTableCell>
                    </tr>
                  ))}
                </tbody>
              </CpTable>
            </div>
          )}
        </Card>
      )}
    </FinanceReadOnlyFrame>
  );
}

export default LedgerInspectorScreen;
