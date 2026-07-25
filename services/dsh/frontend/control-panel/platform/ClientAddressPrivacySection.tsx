"use client";

import React from "react";
import { Card, Text, spacing } from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  CpBadge,
  CpButton,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { useClientAddressPrivacyController } from "../../shared/privacy";

export function ClientAddressPrivacySection() {
  const controller = useClientAddressPrivacyController(true);
  const [enabled, setEnabled] = React.useState(true);
  const [retentionDays, setRetentionDays] = React.useState("30");
  const [batchLimit, setBatchLimit] = React.useState("500");
  const [reason, setReason] = React.useState("");
  const [runId, setRunId] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (controller.state.kind !== "success") return;
    setEnabled(controller.state.policy.enabled);
    setRetentionDays(String(controller.state.policy.retentionDays));
    setBatchLimit(String(controller.state.policy.batchLimit));
    setReason("");
  }, [controller.state]);

  const parsePolicy = React.useCallback(() => {
    const retention = Number(retentionDays);
    const limit = Number(batchLimit);
    const normalizedReason = reason.trim();
    if (!Number.isInteger(retention) || retention < 0 || retention > 3650) {
      throw new Error("مدة الاحتفاظ يجب أن تكون عددًا صحيحًا بين 0 و3650 يومًا.");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      throw new Error("حجم الدفعة يجب أن يكون عددًا صحيحًا بين 1 و10000.");
    }
    if (normalizedReason.length < 3 || normalizedReason.length > 500) {
      throw new Error("اكتب سببًا واضحًا للتغيير بين 3 و500 حرف.");
    }
    return { retention, limit, normalizedReason };
  }, [batchLimit, reason, retentionDays]);

  const save = React.useCallback(async () => {
    try {
      const parsed = parsePolicy();
      setValidationError(null);
      const ok = await controller.save({
        enabled,
        retentionDays: parsed.retention,
        batchLimit: parsed.limit,
        reason: parsed.normalizedReason,
      });
      if (ok) setReason("");
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "بيانات سياسة الخصوصية غير صالحة.");
    }
  }, [controller, enabled, parsePolicy]);

  const anonymize = React.useCallback(async () => {
    try {
      const limit = Number(batchLimit);
      const normalizedRunId = runId.trim();
      if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
        throw new Error("حجم الدفعة يجب أن يكون بين 1 و10000.");
      }
      if (normalizedRunId.length < 8 || normalizedRunId.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(normalizedRunId)) {
        throw new Error("معرف التشغيل يجب أن يكون بين 8 و160 حرفًا ومن أحرف آمنة، ويعاد استخدامه لنفس retry فقط.");
      }
      setValidationError(null);
      const result = await controller.anonymize(limit, normalizedRunId);
      if (result) setRunId("");
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "تعذر تشغيل anonymization.");
    }
  }, [batchLimit, controller, runId]);

  return (
    <View style={styles.section}>
      <Text role="titleSm">خصوصية عناوين العملاء</Text>
      <Text role="caption" tone="muted">
        العناوين النشطة تبقى حقيقة تشغيلية. بعد الحذف تُجدول البيانات الحساسة للإخفاء النهائي حسب مدة الاحتفاظ، بينما سجل التدقيق يعرض hash للعميل ولا يعرض الهاتف أو العنوان أو الإحداثيات.
      </Text>

      {controller.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل سياسة الخصوصية وطابور الإخفاء…" /> : null}
      {controller.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل خصوصية العناوين" description={controller.state.message}>
          <CpRetryButton onClick={controller.reload}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : null}

      {controller.state.kind === "success" ? (
        <>
          <Card style={styles.card}>
            <View style={styles.badges}>
              <CpBadge tone={enabled ? "success" : "warning"}>{enabled ? "الجدولة مفعّلة" : "الجدولة معطلة"}</CpBadge>
              <CpBadge tone="info">{`الإصدار ${controller.state.policy.version}`}</CpBadge>
              <CpBadge tone="neutral">{`آخر تعديل: ${controller.state.policy.updatedBy}`}</CpBadge>
            </View>

            <View style={styles.metrics}>
              <CpBadge tone="info">{`المجدول: ${controller.state.status.scheduledCount}`}</CpBadge>
              <CpBadge tone={controller.state.status.dueCount > 0 ? "warning" : "success"}>{`المستحق الآن: ${controller.state.status.dueCount}`}</CpBadge>
              <CpBadge tone="neutral">{`المخفي نهائيًا: ${controller.state.status.anonymizedCount}`}</CpBadge>
            </View>
            <Text role="caption" tone="muted">
              الإخفاء التالي: {controller.state.status.nextPurgeAt ? new Date(controller.state.status.nextPurgeAt).toLocaleString("ar") : "لا توجد عناوين مجدولة"}
            </Text>

            <CpButton variant={enabled ? "secondary" : "primary"} onClick={() => setEnabled((current) => !current)}>
              {enabled ? "تعطيل الجدولة" : "تفعيل الجدولة"}
            </CpButton>
            <CpTextInput aria-label="مدة الاحتفاظ بعد الحذف بالأيام" value={retentionDays} onChange={setRetentionDays} />
            <CpTextInput aria-label="حجم دفعة anonymization" value={batchLimit} onChange={setBatchLimit} />
            <CpTextInput aria-label="سبب تغيير السياسة" value={reason} onChange={setReason} placeholder="سبب قابل للتدقيق" />
            <CpButton variant="primary" disabled={controller.mutating} onClick={() => void save()}>
              {controller.mutating ? "جارٍ الحفظ…" : "حفظ سياسة الخصوصية"}
            </CpButton>

            <Text role="titleSm">تشغيل دفعة الإخفاء المستحقة</Text>
            <Text role="caption" tone="muted">
              معرف التشغيل هو مفتاح idempotency وcorrelation الفعلي. استخدم معرفًا جديدًا لكل دفعة، وكرر المعرف نفسه فقط لإعادة محاولة الدفعة نفسها.
            </Text>
            <CpTextInput aria-label="معرف التشغيل" value={runId} onChange={setRunId} placeholder="privacy-2026-07-21-run-001" />
            <CpButton variant="danger" disabled={controller.mutating || controller.state.status.dueCount === 0} onClick={() => void anonymize()}>
              {controller.mutating ? "جارٍ التنفيذ…" : "تشغيل anonymization"}
            </CpButton>

            {controller.lastResult ? <CpBadge tone="success">{`تم إخفاء ${controller.lastResult.anonymizedCount} عنوانًا`}</CpBadge> : null}
            {validationError ? <Text tone="danger">{validationError}</Text> : null}
            {controller.mutationError ? <Text tone="danger">{controller.mutationError}</Text> : null}
          </Card>

          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text role="titleSm">سجل تدقيق الخصوصية الآمن</Text>
                <Text role="caption" tone="muted">يعرض آخر 50 حدثًا من projection لا تحتوي PII خامًا.</Text>
              </View>
              <CpButton variant="secondary" onClick={() => void controller.reload()}>تحديث</CpButton>
            </View>
            {controller.state.events.length === 0 ? (
              <CpStatePanel role="status" title="لا توجد أحداث خصوصية" description="ستظهر جدولة الحذف وتحديثات السياسة وعمليات الإخفاء هنا." />
            ) : (
              <CpTable aria-label="سجل تدقيق الخصوصية">
                <thead>
                  <tr>
                    <CpTableHeaderCell>الحدث</CpTableHeaderCell>
                    <CpTableHeaderCell>معرف العنوان</CpTableHeaderCell>
                    <CpTableHeaderCell>Hash العميل</CpTableHeaderCell>
                    <CpTableHeaderCell>المنفذ</CpTableHeaderCell>
                    <CpTableHeaderCell>السياسة</CpTableHeaderCell>
                    <CpTableHeaderCell>الوقت</CpTableHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {controller.state.events.map((row) => (
                    <tr key={row.eventId}>
                      <CpTableCell>{row.action}</CpTableCell>
                      <CpTableCell>{row.addressId}</CpTableCell>
                      <CpTableCell>{`${row.clientSubjectHash.slice(0, 12)}…`}</CpTableCell>
                      <CpTableCell>{row.actorId}</CpTableCell>
                      <CpTableCell>{String(row.policyVersion)}</CpTableCell>
                      <CpTableCell>{new Date(row.createdAt).toLocaleString("ar")}</CpTableCell>
                    </tr>
                  ))}
                </tbody>
              </CpTable>
            )}
          </Card>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[3] },
  card: { padding: spacing[4], gap: spacing[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[3] },
  headerText: { gap: spacing[1] },
});
