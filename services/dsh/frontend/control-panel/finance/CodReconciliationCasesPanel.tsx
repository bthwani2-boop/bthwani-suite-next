"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Text } from "@bthwani/ui-kit";
import { CpSelect, CpTextInput } from "@bthwani/control-panel/components";
import {
  assignCodReconciliationCase,
  loadCodReconciliationCases,
  resolveCodReconciliationCase,
  type CodReconciliationCase,
  type CodResolutionAction,
} from "../../shared/finance-wlt-link/finance/cod-reconciliation.api";
import styles from "./CodReconciliationCasesPanel.module.css";

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
    <div className={styles.panel}>
      <Card>
        <div className={styles.heading}>
          <Text role="titleMd">مصالحة فروقات COD</Text>
        </div>
        <div className={styles.description}>
          <Text role="body" tone="muted">
            يقارن WLT المبلغ المتوقع بالمبلغ المستلم فعليًا. أي فرق يفتح قضية مستقلة للإسناد والتحقيق والقرار مع الاحتفاظ بإثبات العهدة والقيد المحاسبي.
          </Text>
        </div>
        {error ? (
          <div className={styles.error} role="alert">
            <Text role="body" tone="danger">{error}</Text>
          </div>
        ) : null}
        {activeCases.length === 0 ? (
          <div className={styles.emptyState}>
            <Text role="body" tone="muted">لا توجد فروقات COD مفتوحة حاليًا. القضايا المحسومة: {resolvedCases.length}.</Text>
          </div>
        ) : (
          <div className={styles.caseList}>
            {activeCases.map((item) => {
              const busy = busyCaseId === item.id;
              const note = notes[item.id] ?? "";
              const assigned = item.status === "investigating";
              const caseClassName = item.differenceMinorUnits < 0
                ? `${styles.caseCard} ${styles.caseCardShortage}`
                : styles.caseCard;
              return (
                <div key={item.id} className={caseClassName}>
                  <Card>
                    <div className={styles.caseTopRow}>
                      <div className={styles.caseIdentity}>
                        <Text role="body">قضية {item.id}</Text>
                        <Text role="caption" tone="muted">سجل COD: {item.codRecordId} · إثبات: {item.custodyEvidenceId}</Text>
                      </div>
                      <div className={styles.difference}>
                        <Text role="body" tone={item.differenceMinorUnits < 0 ? "danger" : "warning"}>
                          الفرق: {amount(item.differenceMinorUnits, item.currency)}
                        </Text>
                      </div>
                    </div>
                    <div className={styles.facts}>
                      <Text role="caption" tone="muted">المتوقع: {amount(item.expectedAmountMinorUnits, item.currency)}</Text>
                      <Text role="caption" tone="muted">الفعلي: {amount(item.actualAmountMinorUnits, item.currency)}</Text>
                      <Text role="caption" tone="muted">الحالة: {item.status}</Text>
                      <Text role="caption" tone="muted">المشغل: {item.assignedToOperatorId ?? "—"}</Text>
                    </div>
                    <div className={styles.formGrid}>
                      <CpTextInput
                        placeholder={assigned ? "ملاحظة قرار المصالحة" : "ملاحظة التحقيق"}
                        value={note}
                        onChange={(value) => setNotes((current) => ({ ...current, [item.id]: value }))}
                        aria-label={`ملاحظة قضية COD ${item.id}`}
                      />
                      <div className={!assigned || busy ? styles.selectDisabled : undefined} aria-disabled={!assigned || busy}>
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
                    <div className={styles.actions}>
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
