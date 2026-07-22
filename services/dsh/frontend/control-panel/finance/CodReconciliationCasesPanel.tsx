"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Text, colorRoles } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
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
    <div style={styles.panel}>
      <Card>
        <div style={styles.heading}>
          <Text role="titleMd">مصالحة فروقات COD</Text>
        </div>
        <div style={styles.description}>
          <Text role="body" tone="muted">
            يقارن WLT المبلغ المتوقع بالمبلغ المستلم فعليًا. أي فرق يفتح قضية مستقلة للإسناد والتحقيق والقرار مع الاحتفاظ بإثبات العهدة والقيد المحاسبي.
          </Text>
        </div>
        {error ? (
          <div style={styles.error} role="alert">
            <Text role="body" tone="danger">{error}</Text>
          </div>
        ) : null}
        {activeCases.length === 0 ? (
          <div style={styles.emptyState}>
            <Text role="body" tone="muted">لا توجد فروقات COD مفتوحة حاليًا. القضايا المحسومة: {resolvedCases.length}.</Text>
          </div>
        ) : (
          <div style={styles.caseList}>
            {activeCases.map((item) => {
              const busy = busyCaseId === item.id;
              const note = notes[item.id] ?? "";
              const assigned = item.status === "investigating";
              return (
                <div key={item.id} style={item.differenceMinorUnits < 0 ? styles.caseCardShortage : styles.caseCard}>
                  <Card>
                    <div style={styles.caseTopRow}>
                      <div style={styles.caseIdentity}>
                        <Text role="body">قضية {item.id}</Text>
                        <Text role="caption" tone="muted">سجل COD: {item.codRecordId} · إثبات: {item.custodyEvidenceId}</Text>
                      </div>
                      <div style={styles.difference}>
                        <Text role="body" tone={item.differenceMinorUnits < 0 ? "danger" : "warning"}>
                          الفرق: {amount(item.differenceMinorUnits, item.currency)}
                        </Text>
                      </div>
                    </div>
                    <div style={styles.facts}>
                      <Text role="caption" tone="muted">المتوقع: {amount(item.expectedAmountMinorUnits, item.currency)}</Text>
                      <Text role="caption" tone="muted">الفعلي: {amount(item.actualAmountMinorUnits, item.currency)}</Text>
                      <Text role="caption" tone="muted">الحالة: {item.status}</Text>
                      <Text role="caption" tone="muted">المشغل: {item.assignedToOperatorId ?? "—"}</Text>
                    </div>
                    <div style={styles.formGrid}>
                      <CpTextInput
                        placeholder={assigned ? "ملاحظة قرار المصالحة" : "ملاحظة التحقيق"}
                        value={note}
                        onChange={(value) => setNotes((current) => ({ ...current, [item.id]: value }))}
                        aria-label={`ملاحظة قضية COD ${item.id}`}
                      />
                      <div style={!assigned || busy ? styles.selectDisabled : undefined} aria-disabled={!assigned || busy}>
                        <CpSelect
                          aria-label={`قرار قضية COD ${item.id}`}
                          value={actions[item.id] ?? "confirmed_variance"}
                          options={RESOLUTION_OPTIONS}
                          onChange={(value) => {
                            if (assigned && !busy) {
                              setActions((current) => ({ ...current, [item.id]: value as CodResolutionAction }));
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div style={styles.actions}>
                      {!assigned ? (
                        <Button label={busy ? "جارٍ الإسناد..." : "إسناد القضية لنفسي"} tone="secondary" disabled={busy} onPress={() => void assign(item.id)} />
                      ) : (
                        <Button label={busy ? "جارٍ الحسم..." : "تسجيل قرار المصالحة"} tone="primary" disabled={busy || note.trim().length === 0} onPress={() => void resolve(item.id)} />
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

const caseCardBase = {
  padding: "1rem",
  borderInlineStart: `4px solid ${colorRoles.warning}`,
};

const styles = WebStyleSheet.create({
  panel: {
    marginTop: "1rem",
    padding: "1.5rem",
  },
  heading: {
    marginBottom: "0.5rem",
  },
  description: {
    marginBottom: "1rem",
  },
  error: {
    marginBottom: "1rem",
  },
  emptyState: {
    marginBottom: "1rem",
  },
  caseList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  caseCard: caseCardBase,
  caseCardShortage: {
    ...caseCardBase,
    borderInlineStartColor: colorRoles.danger,
  },
  caseTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
  },
  caseIdentity: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  difference: {
    fontWeight: 700,
  },
  facts: {
    display: "flex",
    gap: "1rem",
    marginTop: "0.5rem",
    flexWrap: "wrap",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 240px)",
    gap: "0.75rem",
    marginTop: "0.75rem",
  },
  selectDisabled: {
    opacity: 0.55,
    pointerEvents: "none",
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.75rem",
    flexWrap: "wrap",
  },
});
