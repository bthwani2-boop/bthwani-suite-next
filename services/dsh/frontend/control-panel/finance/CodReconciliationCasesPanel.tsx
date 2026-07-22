"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Text, lightThemeColors } from "@bthwani/ui-kit";
import { CpSelect, CpTextInput } from "@bthwani/control-panel/components";
import {
  assignCodReconciliationCase,
  loadCodReconciliationCases,
  resolveCodReconciliationCase,
  type CodReconciliationCase,
  type CodResolutionAction,
} from "../../shared/finance-wlt-link/finance/cod-reconciliation.api";

const RESOLUTION_OPTIONS = [
  { value: "confirmed_variance", label: "تأكيد الفرق" },
  { value: "cash_adjustment", label: "تسوية نقدية" },
  { value: "collector_recovery", label: "استرداد من المحصل" },
  { value: "write_off", label: "شطب معتمد" },
] as const;

function amount(value: number, currency: string): string {
  return `${(value / 100).toLocaleString("ar-YE")} ${currency}`;
}

function message(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return "تعذر تنفيذ أمر المصالحة.";
}

export function CodReconciliationCasesPanel() {
  const [cases, setCases] = useState<readonly CodReconciliationCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Record<string, CodResolutionAction>>({});

  const load = useCallback(async () => {
    try {
      setCases(await loadCodReconciliationCases());
      setError(null);
    } catch (loadError) {
      setError(message(loadError));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assign = useCallback(async (caseId: string) => {
    setBusyCaseId(caseId);
    setError(null);
    try {
      await assignCodReconciliationCase(caseId, notes[caseId] ?? "");
      await load();
    } catch (actionError) {
      setError(message(actionError));
    } finally {
      setBusyCaseId(null);
    }
  }, [load, notes]);

  const resolve = useCallback(async (caseId: string) => {
    const note = notes[caseId]?.trim() ?? "";
    const action = actions[caseId] ?? "confirmed_variance";
    if (!note) {
      setError("ملاحظة قرار المصالحة مطلوبة.");
      return;
    }
    setBusyCaseId(caseId);
    setError(null);
    try {
      await resolveCodReconciliationCase(caseId, action, note);
      await load();
    } catch (actionError) {
      setError(message(actionError));
    } finally {
      setBusyCaseId(null);
    }
  }, [actions, load, notes]);

  if (!cases && !error) return null;

  const activeCases = cases?.filter((item) => item.status !== "resolved") ?? [];
  const resolvedCases = cases?.filter((item) => item.status === "resolved") ?? [];

  return (
    <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
      <Text role="titleMd" style={{ marginBottom: "0.5rem" }}>مصالحة فروقات COD</Text>
      <Text role="body" tone="muted" style={{ marginBottom: "1rem" }}>
        يقارن WLT المبلغ المتوقع بالمبلغ المستلم فعليًا. أي فرق يفتح قضية مستقلة للإسناد والتحقيق والقرار مع الاحتفاظ بإثبات العهدة والقيد المحاسبي.
      </Text>
      {error ? <Text role="body" tone="danger" style={{ marginBottom: "0.75rem" }}>{error}</Text> : null}
      {activeCases.length === 0 ? (
        <Text role="body" tone="muted">لا توجد فروقات COD مفتوحة حاليًا. القضايا المحسومة: {resolvedCases.length}.</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {activeCases.map((item) => {
            const busy = busyCaseId === item.id;
            const note = notes[item.id] ?? "";
            const assigned = item.status === "investigating";
            return (
              <Card key={item.id} style={{ padding: "1rem", borderInlineStart: `4px solid ${item.differenceMinorUnits < 0 ? lightThemeColors.danger : lightThemeColors.warning}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <Text role="body" style={{ fontWeight: "bold" }}>قضية {item.id}</Text>
                    <Text role="caption" tone="muted">سجل COD: {item.codRecordId} · إثبات: {item.custodyEvidenceId}</Text>
                  </div>
                  <Text role="body" tone={item.differenceMinorUnits < 0 ? "danger" : "warning"} style={{ fontWeight: "bold" }}>
                    الفرق: {amount(item.differenceMinorUnits, item.currency)}
                  </Text>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  <Text role="caption" tone="muted">المتوقع: {amount(item.expectedAmountMinorUnits, item.currency)}</Text>
                  <Text role="caption" tone="muted">الفعلي: {amount(item.actualAmountMinorUnits, item.currency)}</Text>
                  <Text role="caption" tone="muted">الحالة: {item.status}</Text>
                  <Text role="caption" tone="muted">المشغل: {item.assignedToOperatorId ?? "—"}</Text>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 240px)", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <CpTextInput
                    placeholder={assigned ? "ملاحظة قرار المصالحة" : "ملاحظة التحقيق"}
                    value={note}
                    onChange={(value) => setNotes((current) => ({ ...current, [item.id]: value }))}
                    aria-label={`ملاحظة قضية COD ${item.id}`}
                  />
                  <CpSelect
                    aria-label={`قرار قضية COD ${item.id}`}
                    value={actions[item.id] ?? "confirmed_variance"}
                    options={RESOLUTION_OPTIONS}
                    onChange={(value) => setActions((current) => ({ ...current, [item.id]: value as CodResolutionAction }))}
                    disabled={!assigned || busy}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                  {!assigned ? (
                    <Button label={busy ? "جارٍ الإسناد..." : "إسناد القضية لنفسي"} tone="secondary" disabled={busy} onPress={() => void assign(item.id)} />
                  ) : (
                    <Button label={busy ? "جارٍ الحسم..." : "تسجيل قرار المصالحة"} tone="primary" disabled={busy || note.trim().length === 0} onPress={() => void resolve(item.id)} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
