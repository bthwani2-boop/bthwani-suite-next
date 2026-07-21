"use client";

import React from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  StateView,
  Text,
  TextField,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  useClientAddressPrivacyController,
  type DshClientAddressPrivacyAuditEvent,
} from "../../shared/privacy";

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

      {controller.state.kind === "loading" ? <StateView title="جارٍ تحميل سياسة الخصوصية وطابور الإخفاء…" /> : null}
      {controller.state.kind === "error" ? (
        <StateView
          title="تعذر تحميل خصوصية العناوين"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.reload}
        />
      ) : null}

      {controller.state.kind === "success" ? (
        <>
          <Card style={styles.card}>
            <View style={styles.badges}>
              <Badge label={enabled ? "الجدولة مفعّلة" : "الجدولة معطلة"} tone={enabled ? "success" : "warning"} />
              <Badge label={`الإصدار ${controller.state.policy.version}`} tone="info" />
              <Badge label={`آخر تعديل: ${controller.state.policy.updatedBy}`} tone="neutral" />
            </View>

            <View style={styles.metrics}>
              <Badge label={`المجدول: ${controller.state.status.scheduledCount}`} tone="info" />
              <Badge label={`المستحق الآن: ${controller.state.status.dueCount}`} tone={controller.state.status.dueCount > 0 ? "warning" : "success"} />
              <Badge label={`المخفي نهائيًا: ${controller.state.status.anonymizedCount}`} tone="neutral" />
            </View>
            <Text role="caption" tone="muted">
              الإخفاء التالي: {controller.state.status.nextPurgeAt ? new Date(controller.state.status.nextPurgeAt).toLocaleString("ar") : "لا توجد عناوين مجدولة"}
            </Text>

            <Button label={enabled ? "تعطيل الجدولة" : "تفعيل الجدولة"} tone={enabled ? "secondary" : "primary"} onPress={() => setEnabled((current) => !current)} />
            <TextField label="مدة الاحتفاظ بعد الحذف بالأيام" value={retentionDays} keyboardType="numeric" onChangeText={setRetentionDays} />
            <TextField label="حجم دفعة anonymization" value={batchLimit} keyboardType="numeric" onChangeText={setBatchLimit} />
            <TextField label="سبب تغيير السياسة" value={reason} onChangeText={setReason} placeholder="سبب قابل للتدقيق" />
            <Button label={controller.mutating ? "جارٍ الحفظ…" : "حفظ سياسة الخصوصية"} tone="primary" disabled={controller.mutating} onPress={() => void save()} />

            <View style={styles.divider} />
            <Text role="titleSm">تشغيل دفعة الإخفاء المستحقة</Text>
            <Text role="caption" tone="muted">
              معرف التشغيل هو مفتاح idempotency وcorrelation الفعلي. استخدم معرفًا جديدًا لكل دفعة، وكرر المعرف نفسه فقط لإعادة محاولة الدفعة نفسها.
            </Text>
            <TextField label="معرف التشغيل" value={runId} onChangeText={setRunId} placeholder="privacy-2026-07-21-run-001" />
            <Button label={controller.mutating ? "جارٍ التنفيذ…" : "تشغيل anonymization"} tone="danger" disabled={controller.mutating || controller.state.status.dueCount === 0} onPress={() => void anonymize()} />

            {controller.lastResult ? <Badge label={`تم إخفاء ${controller.lastResult.anonymizedCount} عنوانًا`} tone="success" /> : null}
            {validationError ? <Text tone="danger">{validationError}</Text> : null}
            {controller.mutationError ? <Text tone="danger">{controller.mutationError}</Text> : null}
          </Card>

          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text role="titleSm">سجل تدقيق الخصوصية الآمن</Text>
                <Text role="caption" tone="muted">يعرض آخر 50 حدثًا من projection لا تحتوي PII خامًا.</Text>
              </View>
              <Button label="تحديث" tone="secondary" size="sm" onPress={() => void controller.reload()} />
            </View>
            {controller.state.events.length === 0 ? (
              <StateView title="لا توجد أحداث خصوصية" description="ستظهر جدولة الحذف وتحديثات السياسة وعمليات الإخفاء هنا." />
            ) : (
              <DataTable<DshClientAddressPrivacyAuditEvent & Record<string, unknown>>
                columns={[
                  { key: "action", header: "الحدث", render: (row) => row.action },
                  { key: "addressId", header: "معرف العنوان", render: (row) => row.addressId },
                  { key: "clientSubjectHash", header: "Hash العميل", render: (row) => `${row.clientSubjectHash.slice(0, 12)}…` },
                  { key: "actorId", header: "المنفذ", render: (row) => row.actorId },
                  { key: "policyVersion", header: "السياسة", render: (row) => String(row.policyVersion) },
                  { key: "createdAt", header: "الوقت", render: (row) => new Date(row.createdAt).toLocaleString("ar") },
                ]}
                rows={controller.state.events as (DshClientAddressPrivacyAuditEvent & Record<string, unknown>)[]}
                getRowKey={(row) => row.eventId}
              />
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
  divider: { height: 1, backgroundColor: colorRoles.borderSubtle },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[3] },
  headerText: { gap: spacing[1] },
});
