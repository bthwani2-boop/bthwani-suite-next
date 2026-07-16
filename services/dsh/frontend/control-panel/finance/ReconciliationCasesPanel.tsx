"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Text, lightThemeColors } from "@bthwani/ui-kit";
import { CpTextInput } from "@bthwani/control-panel/components";
import {
  assignReconciliationCase,
  loadOpenReconciliationCases,
  resolveReconciliationCase,
  type ReconciliationCase,
} from "../../shared/finance-wlt-link/finance/finance.controller";

// Self-contained panel: fetches and mutates reconciliation cases independently
// of the broader WltDshFinanceHubViewModel, so it can be dropped into any
// finance tab without touching that shared, generated view-model type.
export function ReconciliationCasesPanel() {
  const [cases, setCases] = useState<readonly ReconciliationCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
        <Text role="titleMd" style={{ marginBottom: "0.5rem" }}>
          قضايا المصالحة المفتوحة (Reconciliation Cases)
        </Text>
        <Text role="body" tone="danger">
          تعذر تحميل قضايا المصالحة: {error}
        </Text>
      </Card>
    );
  }

  if (!cases) {
    return null;
  }

  return (
    <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
      <Text role="titleMd" style={{ marginBottom: "1rem" }}>
        قضايا المصالحة المفتوحة (Reconciliation Cases)
      </Text>
      {cases.length === 0 ? (
        <Text role="body" tone="muted">
          لا توجد قضايا مصالحة مفتوحة حالياً.
        </Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {cases.map((c) => (
            <Card key={c.id} style={{ padding: "1rem", borderLeft: `4px solid ${lightThemeColors.warning}` }}>
              <Text role="body" style={{ fontWeight: "bold" }}>
                قضية: {c.id}
              </Text>
              <Text role="caption" tone="muted">
                جلسة الدفع: {c.paymentSessionId} · العملية: {c.operation}
              </Text>
              <Text role="caption" tone="muted">
                السبب: {c.triggerReason}
              </Text>
              <Text role="caption" tone="muted">
                مُسندة إلى: {c.assignedToOperatorId || "—"}
              </Text>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <Button
                  label="إسناد لنفسي"
                  tone="secondary"
                  onPress={async () => {
                    const ok = await assignReconciliationCase(c.id);
                    if (ok) void load();
                  }}
                />
                <CpTextInput
                  placeholder="ملاحظة القرار"
                  value={noteDrafts[c.id] ?? ""}
                  onChange={(value) => setNoteDrafts((prev) => ({ ...prev, [c.id]: value }))}
                  aria-label={`ملاحظة القرار لقضية ${c.id}`}
                />
                <Button
                  label="تأكيد النجاح"
                  tone="success"
                  onPress={async () => {
                    const ok = await resolveReconciliationCase(c.id, "confirmed_success", noteDrafts[c.id] ?? "");
                    if (ok) void load();
                  }}
                />
                <Button
                  label="تأكيد الفشل"
                  tone="danger"
                  onPress={async () => {
                    const ok = await resolveReconciliationCase(c.id, "confirmed_failed", noteDrafts[c.id] ?? "");
                    if (ok) void load();
                  }}
                />
                <Button
                  label="تعديل يدوي"
                  tone="secondary"
                  onPress={async () => {
                    const ok = await resolveReconciliationCase(c.id, "manual_adjustment", noteDrafts[c.id] ?? "");
                    if (ok) void load();
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
