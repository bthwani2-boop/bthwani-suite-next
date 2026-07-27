"use client";

import React from "react";
import { SegmentedControl, Text, spacing } from "@bthwani/ui-kit";
import { WebStyleSheet as StyleSheet, WebView as View } from "@bthwani/ui-kit/web";
import {
  CpBadge,
  CpButton,
  CpRetryButton,
  CpStatePanel,
  CpTextInput,
} from "@bthwani/control-panel/components";
import {
  fetchDispatchBalancePolicy,
  upsertDispatchBalancePolicy,
  type DshDispatchBalancePolicy,
} from "../../shared/platform";

const YES_NO_ITEMS = [
  { label: "نعم", value: "true" },
  { label: "لا", value: "false" },
] as const;

type FormState = {
  enabled: string;
  requirePositive: string;
  minimumDispatch: string;
  minimumCod: string;
  currency: string;
  ttl: string;
  notes: string;
  reason: string;
};

function fromPolicy(policy: DshDispatchBalancePolicy): FormState {
  return {
    enabled: String(policy.enabled),
    requirePositive: String(policy.requirePositiveBalance),
    minimumDispatch: String(policy.minimumDispatchBalanceMinorUnits),
    minimumCod: String(policy.minimumCodBalanceMinorUnits),
    currency: policy.currency,
    ttl: String(policy.snapshotTtlSeconds),
    notes: policy.notes,
    reason: "",
  };
}

export function DispatchBalancePolicySection() {
  const [policy, setPolicy] = React.useState<DshDispatchBalancePolicy | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDispatchBalancePolicy();
      setPolicy(result.policy);
      setForm(fromPolicy(result.policy));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل سياسة الضمانة المالية.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const save = async () => {
    if (!policy || !form) return;
    const minimumDispatch = Number(form.minimumDispatch);
    const minimumCod = Number(form.minimumCod);
    const ttl = Number(form.ttl);
    if (!Number.isSafeInteger(minimumDispatch) || minimumDispatch < 0 ||
        !Number.isSafeInteger(minimumCod) || minimumCod < minimumDispatch ||
        !Number.isSafeInteger(ttl) || ttl < 30 || ttl > 600 ||
        form.currency.trim().length !== 3 || form.reason.trim().length < 3) {
      setError("تحقق من الحدود المالية والعملة ومدة اللقطة وسبب التغيير.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await upsertDispatchBalancePolicy({
        enabled: form.enabled === "true",
        requirePositiveBalance: form.requirePositive === "true",
        minimumDispatchBalanceMinorUnits: minimumDispatch,
        minimumCodBalanceMinorUnits: minimumCod,
        currency: form.currency.trim().toUpperCase(),
        snapshotTtlSeconds: ttl,
        notes: form.notes.trim(),
        expectedVersion: policy.version,
        reason: form.reason.trim(),
      });
      setPolicy(result.policy);
      setForm(fromPolicy(result.policy));
      setSuccess("تم حفظ سياسة أهلية الإسناد بإصدار جديد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ سياسة الضمانة المالية.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text role="titleSm">سياسة الضمانة المالية وأهلية الإسناد</Text>
      <Text role="caption" tone="muted">
        قسم المنصة يحدد الحد التشغيلي فقط. WLT يملك الرصيد والدفتر، ويجدد DSH لقطة قصيرة قبل عرض الطلب أو قبوله.
      </Text>

      {loading ? <CpStatePanel role="status" title="جارٍ تحميل سياسة الأهلية…" /> : null}
      {!loading && !form ? (
        <CpStatePanel role="alert" title="تعذر تحميل سياسة الأهلية" description={error ?? "لا توجد بيانات"}>
          <CpRetryButton onClick={load}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : null}

      {policy && form ? (
        <View style={styles.form}>
          <View style={styles.badges}>
            <CpBadge tone="info">{`الإصدار ${policy.version}`}</CpBadge>
            <CpBadge tone={policy.enabled ? "success" : "neutral"}>{policy.enabled ? "مفعلة" : "معطلة"}</CpBadge>
          </View>

          <Text role="bodySm">تطبيق حد الضمانة على الإسناد</Text>
          <SegmentedControl items={YES_NO_ITEMS} value={form.enabled} onValueChange={(value) => setField("enabled", value)} />

          <Text role="bodySm">يشترط رصيدًا موجبًا حتى لو كان الحد صفرًا</Text>
          <SegmentedControl items={YES_NO_ITEMS} value={form.requirePositive} onValueChange={(value) => setField("requirePositive", value)} />

          <CpTextInput aria-label="الحد الأدنى للإسناد" value={form.minimumDispatch} onChange={(value) => setField("minimumDispatch", value)} placeholder="50000" />
          <CpTextInput aria-label="حد طلبات النقد" value={form.minimumCod} onChange={(value) => setField("minimumCod", value)} placeholder="50000" />
          <CpTextInput aria-label="العملة" value={form.currency} onChange={(value) => setField("currency", value)} placeholder="YER" />
          <CpTextInput aria-label="صلاحية لقطة WLT بالثواني" value={form.ttl} onChange={(value) => setField("ttl", value)} placeholder="120" />
          <CpTextInput aria-label="ملاحظات السياسة" value={form.notes} onChange={(value) => setField("notes", value)} placeholder="ملاحظات تشغيلية" />
          <CpTextInput aria-label="سبب تغيير السياسة" value={form.reason} onChange={(value) => setField("reason", value)} placeholder="سبب قابل للتدقيق" />

          {error ? <CpStatePanel role="alert" title="تعذر تنفيذ الإجراء" description={error} /> : null}
          {success ? <CpStatePanel role="status" title={success} /> : null}
          <CpButton variant="primary" disabled={saving} onClick={() => void save()}>
            {saving ? "جارٍ الحفظ…" : "حفظ سياسة الأهلية"}
          </CpButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
  form: { gap: spacing[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});

export default DispatchBalancePolicySection;
