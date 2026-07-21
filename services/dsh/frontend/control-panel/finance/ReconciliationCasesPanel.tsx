"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Text, lightThemeColors } from "@bthwani/ui-kit";
import { CpTextInput } from "@bthwani/control-panel/components";
import {
  assignReconciliationCase,
  loadOpenReconciliationCases,
  resolveReconciliationCase,
  type FinanceActionResult,
  type ReconciliationCase,
} from "../../shared/finance-wlt-link/finance/finance.controller";

export function ReconciliationCasesPanel() {
  const [cases, setCases] = useState<readonly ReconciliationCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const result = await loadOpenReconciliationCases();
    if (result.ok) {
      setCases(result.data);
      setError(null);
    } else {
      setError(result.message);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runAction = useCallback(async (caseId: string, action: () => Promise<FinanceActionResult>) => {
    setBusyCaseId(caseId);
    setActionError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setActionError(`${result.code}: ${result.message}`);
        return;
      }
      await load();
    } finally {
      setBusyCaseId(null);
    }
  }, [load]);

  if (error) {
    return (
      <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
        <Text role="titleMd" style={{ marginBottom: "0.5rem" }}>قضايا المطابقة المفتوحة</Text>
        <Text role="body" tone="danger">تعذر تحميل قضايا المطابقة: {error}</Text>
      </Card>
    );
  }

  if (!cases) return null;

  return (
    <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
      <Text role="titleMd" style={{ marginBottom: "1rem" }}>قضايا المطابقة المفتوحة</Text>
      {actionError ? (
        <Text role="body" tone="danger" style={{ marginBottom: "0.75rem" }}>{actionError}</Text>
      ) : null}
      {cases.length === 0 ? (
        <Text role="body" tone="muted">لا توجد قضايا مطابقة مفتوحة حالياً.</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {cases.map((reconciliationCase) => {
            const busy = busyCaseId === reconciliationCase.id;
            const note = noteDrafts[reconciliationCase.id] ?? "";
            return (
              <Card key={reconciliationCase.id} style={{ padding: "1rem", borderLeft: `4px solid ${lightThemeColors.warning}` }}>
                <Text role="body" style={{ fontWeight: "bold" }}>قضية: {reconciliationCase.id}</Text>
                <Text role="caption" tone="muted">
                  جلسة الدفع: {reconciliationCase.paymentSessionId} · العملية: {reconciliationCase.operation}
                </Text>
                <Text role="caption" tone="muted">السبب: {reconciliationCase.triggerReason}</Text>
                <Text role="caption" tone="muted">مُسندة إلى: {reconciliationCase.assignedToOperatorId || "—"}</Text>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  <Button
                    label={busy ? "جارٍ التنفيذ…" : "إسناد لنفسي"}
                    tone="secondary"
                    disabled={busy}
                    onPress={() => runAction(reconciliationCase.id, () => assignReconciliationCase(reconciliationCase.id))}
                  />
                  <CpTextInput
                    placeholder="ملاحظة القرار"
                    value={note}
                    onChange={(value) => setNoteDrafts((previous) => ({ ...previous, [reconciliationCase.id]: value }))}
                    aria-label={`ملاحظة القرار لقضية ${reconciliationCase.id}`}
                  />
                  <Button
                    label="تأكيد النجاح"
                    tone="success"
                    disabled={busy || note.trim().length === 0}
                    onPress={() => runAction(reconciliationCase.id, () => resolveReconciliationCase(reconciliationCase.id, "confirmed_success", note))}
                  />
                  <Button
                    label="تأكيد الفشل"
                    tone="danger"
                    disabled={busy || note.trim().length === 0}
                    onPress={() => runAction(reconciliationCase.id, () => resolveReconciliationCase(reconciliationCase.id, "confirmed_failed", note))}
                  />
                  <Button
                    label="تعديل يدوي"
                    tone="secondary"
                    disabled={busy || note.trim().length === 0}
                    onPress={() => runAction(reconciliationCase.id, () => resolveReconciliationCase(reconciliationCase.id, "manual_adjustment", note))}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
