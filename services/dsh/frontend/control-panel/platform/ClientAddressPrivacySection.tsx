"use client";

import React from "react";
import {
  Badge,
  Button,
  Card,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import { useClientAddressPrivacyController } from "../../shared/privacy";

export function ClientAddressPrivacySection() {
  const controller = useClientAddressPrivacyController(true);
  const [enabled, setEnabled] = React.useState(true);
  const [retentionDays, setRetentionDays] = React.useState("30");
  const [batchLimit, setBatchLimit] = React.useState("500");
  const [reason, setReason] = React.useState("");
  const [runId, setRunId] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

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
      setValidationError(
        error instanceof Error ? error.message : "بيانات سياسة الخصوصية غير صالحة.",
      );
    }
  }, [controller, enabled, parsePolicy]);

  const anonymize = React.useCallback(async () => {
    try {
      const limit = Number(batchLimit);
      const normalizedRunId = runId.trim();
      if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
        throw new Error("حجم الدفعة يجب أن يكون بين 1 و10000.");
      }
      if (normalizedRunId.length < 8 || normalizedRunId.length > 200) {
        throw new Error(
          "معرف التشغيل يجب أن يكون بين 8 و200 حرف، ويُعاد استخدامه عند retry فقط.",
        );
      }
      setValidationError(null);
      const result = await controller.anonymize(limit, normalizedRunId);
      if (result) setRunId("");
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "تعذر تشغيل anonymization.",
      );
    }
  }, [batchLimit, controller, runId]);

  return (
    <View style={styles.section}>
      <Text role="titleSm">خصوصية عناوين العملاء</Text>
      <Text role="caption" tone="muted">
        العناوين النشطة تبقى حقيقة تشغيلية. بعد الحذف تُجدول البيانات الحساسة
        للإخفاء النهائي حسب مدة الاحتفاظ، دون المساس بلقطات الطلبات المحكومة
        بسياسة احتفاظ الطلبات.
      </Text>

      {controller.state.kind === "loading" ? (
        <StateView title="جارٍ تحميل سياسة الخصوصية…" />
      ) : null}
      {controller.state.kind === "error" ? (
        <StateView
          title="تعذر تحميل سياسة الخصوصية"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.reload}
        />
      ) : null}

      {controller.state.kind === "success" ? (
        <Card style={styles.card}>
          <View style={styles.badges}>
            <Badge
              label={enabled ? "الجدولة مفعّلة" : "الجدولة معطلة"}
              tone={enabled ? "success" : "warning"}
            />
            <Badge
              label={`الإصدار ${controller.state.policy.version}`}
              tone="info"
            />
            <Badge
              label={`آخر تعديل: ${controller.state.policy.updatedBy}`}
              tone="neutral"
            />
          </View>

          <Button
            label={enabled ? "تعطيل الجدولة" : "تفعيل الجدولة"}
            tone={enabled ? "secondary" : "primary"}
            onPress={() => setEnabled((current) => !current)}
          />
          <TextField
            label="مدة الاحتفاظ بعد الحذف بالأيام"
            value={retentionDays}
            keyboardType="numeric"
            onChangeText={setRetentionDays}
          />
          <TextField
            label="حجم دفعة anonymization"
            value={batchLimit}
            keyboardType="numeric"
            onChangeText={setBatchLimit}
          />
          <TextField
            label="سبب تغيير السياسة"
            value={reason}
            onChangeText={setReason}
            placeholder="سبب قابل للتدقيق"
          />
          <Button
            label={controller.mutating ? "جارٍ الحفظ…" : "حفظ سياسة الخصوصية"}
            tone="primary"
            disabled={controller.mutating}
            onPress={() => void save()}
          />

          <View style={styles.divider} />
          <Text role="titleSm">تشغيل دفعة الإخفاء المستحقة</Text>
          <Text role="caption" tone="muted">
            استخدم معرفًا جديدًا لكل دفعة، وكرر المعرف نفسه فقط عند انقطاع
            الاستجابة أو إعادة المحاولة لنفس الدفعة.
          </Text>
          <TextField
            label="معرف التشغيل"
            value={runId}
            onChangeText={setRunId}
            placeholder="privacy-2026-07-19-run-001"
          />
          <Button
            label={controller.mutating ? "جارٍ التنفيذ…" : "تشغيل anonymization"}
            tone="danger"
            disabled={controller.mutating}
            onPress={() => void anonymize()}
          />

          {controller.lastResult ? (
            <Badge
              label={`تم إخفاء ${controller.lastResult.anonymizedCount} عنوانًا`}
              tone="success"
            />
          ) : null}
          {validationError ? (
            <Text tone="danger">{validationError}</Text>
          ) : null}
          {controller.mutationError ? (
            <Text tone="danger">{controller.mutationError}</Text>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[3] },
  card: { padding: spacing[4], gap: spacing[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  divider: { height: 1, backgroundColor: "rgba(128,128,128,0.25)" },
});
