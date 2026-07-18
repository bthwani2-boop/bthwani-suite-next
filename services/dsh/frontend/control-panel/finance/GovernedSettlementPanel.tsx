"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Card, Text, lightThemeColors } from "@bthwani/ui-kit";
import { CpTextInput } from "@bthwani/control-panel/components";
import {
  createSettlementFromDeliveredOrders,
  upsertSettlementPolicy,
  type SettlementActionResult,
} from "../../shared/finance-wlt-link/finance/finance.controller";

type GovernedSettlementPanelProps = {
  readonly reload: () => Promise<void>;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(): string {
  const date = new Date();
  date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
}

function resultMessage(result: SettlementActionResult): string {
  if (result.ok) return "تم تنفيذ العملية وقراءة النتيجة من WLT.";
  return `${result.code}: ${result.message}`;
}

export function GovernedSettlementPanel({ reload }: GovernedSettlementPanelProps) {
  const [partnerId, setPartnerId] = useState("");
  const [feeBasisPoints, setFeeBasisPoints] = useState("0");
  const [currency, setCurrency] = useState("YER");
  const [periodStart, setPeriodStart] = useState(monthStartIso());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [policyReadyForPartner, setPolicyReadyForPartner] = useState<string | null>(null);
  const [busy, setBusy] = useState<"policy" | "settlement" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const parsedFee = Number(feeBasisPoints);
  const policyValid = useMemo(
    () => partnerId.trim().length > 0 && Number.isInteger(parsedFee) && parsedFee >= 0 && parsedFee <= 10000 && currency.trim().length > 0,
    [partnerId, parsedFee, currency],
  );
  const settlementValid = useMemo(
    () => policyReadyForPartner === partnerId.trim() && periodStart.length === 10 && periodEnd.length === 10 && periodEnd >= periodStart,
    [policyReadyForPartner, partnerId, periodStart, periodEnd],
  );

  const savePolicy = useCallback(async () => {
    if (!policyValid) return;
    setBusy("policy");
    setMessage(null);
    setError(false);
    try {
      const result = await upsertSettlementPolicy({
        partnerId: partnerId.trim(),
        feeBasisPoints: parsedFee,
        currency: currency.trim(),
        status: "active",
      });
      setMessage(resultMessage(result));
      setError(!result.ok);
      if (result.ok) setPolicyReadyForPartner(partnerId.trim());
    } finally {
      setBusy(null);
    }
  }, [currency, parsedFee, partnerId, policyValid]);

  const createSettlement = useCallback(async () => {
    if (!settlementValid) return;
    setBusy("settlement");
    setMessage(null);
    setError(false);
    try {
      const result = await createSettlementFromDeliveredOrders({
        partnerId: partnerId.trim(),
        periodStart,
        periodEnd,
        currency: currency.trim(),
      });
      setMessage(resultMessage(result));
      setError(!result.ok);
      if (result.ok) await reload();
    } finally {
      setBusy(null);
    }
  }, [currency, partnerId, periodEnd, periodStart, reload, settlementValid]);

  return (
    <Card style={{ padding: "1.5rem", marginBottom: "1rem" }}>
      <Text role="titleMd" style={{ marginBottom: "0.5rem" }}>إنشاء تسوية محكومة من الأوامر المسلمة</Text>
      <Text role="body" tone="muted" style={{ marginBottom: "1rem" }}>
        لا تُقبل مبالغ gross أو fee أو net من الواجهة. DSH يجمع أوامر الشريك بحالة delivered، وWLT يطبق سياسة fee ويحجز orderId ضد التسوية المكررة.
      </Text>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        <CpTextInput
          aria-label="معرف الشريك للتسوية"
          placeholder="Partner ID"
          value={partnerId}
          onChange={(value) => {
            setPartnerId(value);
            setPolicyReadyForPartner(null);
          }}
        />
        <CpTextInput
          aria-label="عمولة المنصة بالنقاط الأساسية"
          placeholder="Fee basis points (مثال 1000 = 10%)"
          value={feeBasisPoints}
          onChange={setFeeBasisPoints}
        />
        <CpTextInput aria-label="عملة التسوية" placeholder="Currency" value={currency} onChange={setCurrency} />
        <CpTextInput aria-label="بداية فترة التسوية" placeholder="YYYY-MM-DD" value={periodStart} onChange={setPeriodStart} />
        <CpTextInput aria-label="نهاية فترة التسوية" placeholder="YYYY-MM-DD" value={periodEnd} onChange={setPeriodEnd} />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
        <Button
          label={busy === "policy" ? "جارٍ حفظ السياسة…" : "حفظ سياسة fee في WLT"}
          tone="secondary"
          disabled={!policyValid || busy !== null}
          onPress={savePolicy}
        />
        <Button
          label={busy === "settlement" ? "جارٍ احتساب التسوية…" : "إنشاء التسوية من delivered orders"}
          tone="primary"
          disabled={!settlementValid || busy !== null}
          onPress={createSettlement}
        />
      </div>

      {policyReadyForPartner === partnerId.trim() ? (
        <Text role="caption" tone="success" style={{ marginTop: "0.75rem" }}>
          سياسة الشريك محفوظة لهذه الجلسة. يمكن الآن إنشاء التسوية.
        </Text>
      ) : null}
      {message ? (
        <Card style={{ padding: "0.75rem", marginTop: "0.75rem", borderLeft: `4px solid ${error ? lightThemeColors.danger : lightThemeColors.success}` }}>
          <Text role="body" tone={error ? "danger" : "success"}>{message}</Text>
        </Card>
      ) : null}
    </Card>
  );
}
