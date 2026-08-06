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
  CpTextInput,
} from "@bthwani/control-panel/components";
import { FinanceReadOnlyFrame } from "@bthwani/control-panel/shell";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";
import { formatWltMoney } from '@bthwani/wlt/dsh';

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-control-panel-finance",
);

type CodRecord = {
  id: string;
  orderId: string;
  amountMinorUnits: number;
  currency: string;
  status: string;
  captainId: string;
  collectorId: string;
  collectorType: string;
  createdAt: string;
  updatedAt: string;
};

type ScreenState = "idle" | "loading" | "error" | "loaded";

export function CodInspectorScreen() {
  const [state, setState] = useState<ScreenState>("idle");
  const [records, setRecords] = useState<CodRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [captainId, setCaptainId] = useState("");

  const loadRecords = async () => {
    setState("loading");
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (orderId) params.set("orderId", orderId);
      if (captainId) params.set("captainId", captainId);

      const result = await request<{ codRecords: CodRecord[] }>(`/dsh/control-panel/finance/cod-records?${params.toString()}`);
      setRecords(result.codRecords ?? []);
      setState("loaded");
    } catch (e: any) {
      setError(e.message || "فشل تحميل سجلات COD");
      setState("error");
    }
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "collected": return "warning";
      case "remitted": return "success";
      case "over_remitted": return "success";
      case "under_remitted": return "danger";
      case "pending": default: return "neutral";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "collected": return "مُحصّل جزئياً/كلياً";
      case "remitted": return "تم التوريد";
      case "over_remitted": return "مُورّد بزيادة";
      case "under_remitted": return "مُورّد بنقص";
      case "pending": return "قيد الانتظار";
      default: return status;
    }
  };

  return (
    <FinanceReadOnlyFrame
      header={
        <CpPageHeader title="سجلات الدفع عند الاستلام (COD Records)">
          <CpMutedInline tight>عرض سجلات COD وذمم التوصيل من WLT مباشرة.</CpMutedInline>
        </CpPageHeader>
      }
      summary={
        <Card style={{ padding: "1.25rem" }}>
          <Text role="body" style={{ marginBottom: "1rem" }}>
            هذه الشاشة توفر وصولاً للقراءة فقط إلى سجلات العهد المحصلة في الميدان. يتم إنشاء وتحديث هذه السجلات بواسطة WLT حصرياً لضمان Idempotency و Immutability.
          </Text>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", maxWidth: "600px" }}>
            <CpTextInput 
              placeholder="بحث برقم الطلب (Order ID)..."
              value={orderId}
              onChange={(e: any) => setOrderId(e.target.value)}
            />
            <CpTextInput 
              placeholder="بحث برقم الكابتن (Captain ID)..."
              value={captainId}
              onChange={(e: any) => setCaptainId(e.target.value)}
            />
          </div>
          <CpButton onClick={loadRecords} disabled={state === "loading"}>
            {state === "loading" ? "جارٍ التحميل..." : "تحديث السجلات"}
          </CpButton>
        </Card>
      }
    >
      {state === "idle" ? (
        <StateView title="جاهز للاستعلام" description="اضغط على زر التحديث لعرض سجلات COD." />
      ) : state === "error" ? (
        <StateView tone="danger" title="خطأ في تحميل السجلات" description={error || ""} actionLabel="إعادة المحاولة" onActionPress={loadRecords} />
      ) : (
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Text role="titleMd">السجلات ({records.length})</Text>
          </div>
          {records.length === 0 ? (
            <StateView tone="neutral" title="لا توجد سجلات" description="لم يتم العثور على أي سجل COD يطابق البحث." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <CpTable aria-label="سجلات COD">
                <thead>
                  <tr>
                    <CpTableHeaderCell>الرقم المرجعي</CpTableHeaderCell>
                    <CpTableHeaderCell>الطلب</CpTableHeaderCell>
                    <CpTableHeaderCell>الكابتن / المحصل</CpTableHeaderCell>
                    <CpTableHeaderCell>المتوقع</CpTableHeaderCell>
                    <CpTableHeaderCell>المُحصّل (فعلي)</CpTableHeaderCell>
                    <CpTableHeaderCell>المُورّد (Remitted)</CpTableHeaderCell>
                    <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                    <CpTableHeaderCell>تاريخ الإنشاء</CpTableHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const isCollected = record.status === "collected" || record.status === "remitted" || record.status === "over_remitted" || record.status === "under_remitted";
                    const isRemitted = record.status === "remitted" || record.status === "over_remitted" || record.status === "under_remitted";
                    const expected = record.amountMinorUnits || 0;
                    const collected = isCollected ? expected : 0;
                    const remitted = isRemitted ? expected : 0;
                    
                    return (
                    <tr key={record.id}>
                      <CpTableCell><CpMutedInline tight>{record.id.split("-")[0]}</CpMutedInline></CpTableCell>
                      <CpTableCell>{record.orderId}</CpTableCell>
                      <CpTableCell>
                        <CpBadge tone="neutral">{record.collectorType}: {record.collectorId || record.captainId}</CpBadge>
                      </CpTableCell>
                      <CpTableCell>
                        {formatWltMoney(expected, record.currency)}
                      </CpTableCell>
                      <CpTableCell>
                        {formatWltMoney(collected, record.currency)}
                      </CpTableCell>
                      <CpTableCell>
                        {formatWltMoney(remitted, record.currency)}
                      </CpTableCell>
                      <CpTableCell>
                        <CpBadge tone={getStatusTone(record.status)}>
                          {getStatusLabel(record.status)}
                        </CpBadge>
                      </CpTableCell>
                      <CpTableCell>{record.createdAt}</CpTableCell>
                    </tr>
                  )})}
                </tbody>
              </CpTable>
            </div>
          )}
        </Card>
      )}
    </FinanceReadOnlyFrame>
  );
}

export default CodInspectorScreen;
