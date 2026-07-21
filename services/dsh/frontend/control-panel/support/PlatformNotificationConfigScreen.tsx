"use client";

import React from "react";
import { Badge, Box, Button, DataTable, Header, ScrollScreen, StateView, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  useNotificationDeliveryAuditController,
  usePlatformNotificationConfigController,
} from "../../shared/notifications";
import type {
  DshNotificationDeliveryAttempt,
  DshNotificationDeliveryOutcome,
  DshPlatformNotificationConfig,
} from "../../shared/notifications";

const OUTCOME_LABELS: Readonly<Record<DshNotificationDeliveryOutcome, string>> = {
  sent: "تم الإرسال",
  retry_scheduled: "إعادة محاولة",
  dead_letter: "Dead letter",
};

function outcomeTone(outcome: DshNotificationDeliveryOutcome): "success" | "warning" | "danger" {
  if (outcome === "sent") return "success";
  if (outcome === "dead_letter") return "danger";
  return "warning";
}

export function PlatformNotificationConfigScreen() {
  const { state, reload, save } = usePlatformNotificationConfigController("authenticated");
  const deliveryAudit = useNotificationDeliveryAuditController("authenticated");
  const [editingConfig, setEditingConfig] = React.useState<DshPlatformNotificationConfig | null>(null);
  const [topic, setTopic] = React.useState("");
  const [actorTypes, setActorTypes] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  function startEdit(row: DshPlatformNotificationConfig) {
    setEditingConfig(row);
    setTopic(row.topic);
    setActorTypes(row.actorTypes.join(", "));
    setDescription(row.description);
    setSaveMessage(null);
  }

  async function handleSave(nextEnabled: boolean) {
    const resolvedTopic = topic.trim();
    if (!resolvedTopic) {
      setSaveMessage("الموضوع مطلوب قبل الحفظ.");
      return;
    }

    const resolvedActorTypes = actorTypes
      .split(",")
      .map((actorType) => actorType.trim())
      .filter(Boolean);

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await save(resolvedTopic, resolvedActorTypes, nextEnabled, description.trim());
      setSaveMessage("تم حفظ إعداد الإشعار.");
      setEditingConfig(null);
    } catch {
      setSaveMessage("تعذر حفظ إعداد الإشعار.");
    } finally {
      setIsSaving(false);
    }
  }

  if (state.kind === "loading" || state.kind === "idle") return <StateView title="جارٍ التحميل…" />;
  if (state.kind === "error") {
    return <StateView title="خطأ" description={state.message} actionLabel="إعادة المحاولة" onActionPress={reload} />;
  }

  return (
    <ScrollScreen>
      <Header title="إعدادات الإشعارات" subtitle="إدارة سياسات الإشعار وتدقيق التسليم وإعادة المحاولة" />
      <Box style={styles.container}>
        {state.configs.length === 0 ? (
          <StateView title="لا توجد إعدادات" description="لم يتم تهيئة أي إشعارات منصة بعد." />
        ) : (
          <DataTable<DshPlatformNotificationConfig>
            columns={[
              { key: "topic", header: "الموضوع", render: (row) => <Text role="bodySm">{row.topic}</Text> },
              {
                key: "isEnabled",
                header: "الحالة",
                render: (row) => <Badge label={row.isEnabled ? "مفعّل" : "معطّل"} tone={row.isEnabled ? "success" : "neutral"} />,
              },
              { key: "description", header: "الوصف", render: (row) => <Text role="bodySm">{row.description}</Text> },
              { key: "updatedBy", header: "عُدِّل من", render: (row) => <Text role="bodySm">{row.updatedBy}</Text> },
              {
                key: "actions",
                header: "الإجراء",
                render: (row) => <Button label="تعديل" tone="secondary" size="sm" fullWidth={false} onPress={() => startEdit(row)} />,
              },
            ]}
            rows={state.configs}
            getRowKey={(row) => row.id}
          />
        )}

        <Box style={styles.editor}>
          <Text role="label" style={styles.editorTitle}>
            {editingConfig ? `تعديل ${editingConfig.topic}` : "تهيئة إشعار منصة"}
          </Text>
          <TextField label="الموضوع" value={topic} onChangeText={setTopic} placeholder="order_update" />
          <TextField label="أنواع الممثلين" value={actorTypes} onChangeText={setActorTypes} placeholder="client, partner, captain" />
          <TextField label="الوصف" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          {saveMessage ? <Text role="bodySm" tone="muted" style={styles.editorTitle}>{saveMessage}</Text> : null}
          <Box style={styles.actions}>
            <Button label="حفظ مفعّل" loading={isSaving} disabled={isSaving} fullWidth={false} onPress={() => { void handleSave(true); }} />
            <Button label="حفظ معطّل" tone="secondary" loading={isSaving} disabled={isSaving} fullWidth={false} onPress={() => { void handleSave(false); }} />
            {editingConfig ? <Button label="إلغاء" tone="ghost" fullWidth={false} onPress={() => setEditingConfig(null)} /> : null}
          </Box>
        </Box>

        <Box style={styles.auditSection}>
          <Text role="titleSm" style={styles.editorTitle}>تدقيق تسليم الإشعارات</Text>
          {deliveryAudit.state.kind === "idle" || deliveryAudit.state.kind === "loading" ? (
            <StateView title="جارٍ تحميل سجل التسليم…" />
          ) : deliveryAudit.state.kind === "error" ? (
            <StateView
              title="تعذر تحميل سجل التسليم"
              description={deliveryAudit.state.message}
              actionLabel="إعادة المحاولة"
              onActionPress={deliveryAudit.reload}
            />
          ) : (
            <>
              <Box style={styles.auditSummary}>
                <Badge label={`تم الإرسال: ${deliveryAudit.state.summary.sent}`} tone="success" />
                <Badge label={`إعادة المحاولة: ${deliveryAudit.state.summary.retryScheduled}`} tone="warning" />
                <Badge label={`Dead letter: ${deliveryAudit.state.summary.deadLetter}`} tone="danger" />
                <Badge label={`Outbox معلّق: ${deliveryAudit.state.summary.pendingOutbox}`} tone="neutral" />
                <Badge label={`Outbox فاشل: ${deliveryAudit.state.summary.failedOutbox}`} tone="danger" />
              </Box>
              <Box style={styles.actions}>
                <Button label="الكل" tone={deliveryAudit.outcome ? "secondary" : "brand"} size="sm" fullWidth={false} onPress={() => { void deliveryAudit.filter(); }} />
                <Button label="تم الإرسال" tone={deliveryAudit.outcome === "sent" ? "brand" : "secondary"} size="sm" fullWidth={false} onPress={() => { void deliveryAudit.filter("sent"); }} />
                <Button label="إعادة محاولة" tone={deliveryAudit.outcome === "retry_scheduled" ? "brand" : "secondary"} size="sm" fullWidth={false} onPress={() => { void deliveryAudit.filter("retry_scheduled"); }} />
                <Button label="Dead letter" tone={deliveryAudit.outcome === "dead_letter" ? "brand" : "secondary"} size="sm" fullWidth={false} onPress={() => { void deliveryAudit.filter("dead_letter"); }} />
              </Box>
              {deliveryAudit.state.attempts.length === 0 ? (
                <StateView title="لا توجد محاولات" description="لا توجد محاولات مطابقة للفلتر الحالي." />
              ) : (
                <DataTable<DshNotificationDeliveryAttempt>
                  columns={[
                    { key: "eventType", header: "الحدث", render: (row) => <Text role="bodySm">{row.eventType}</Text> },
                    { key: "entity", header: "الكيان", render: (row) => <Text role="bodySm">{row.entityType} · {row.entityId}</Text> },
                    { key: "attemptNumber", header: "المحاولة", render: (row) => <Text role="bodySm">{String(row.attemptNumber)}</Text> },
                    { key: "outcome", header: "النتيجة", render: (row) => <Badge label={OUTCOME_LABELS[row.outcome]} tone={outcomeTone(row.outcome)} /> },
                    { key: "errorMessage", header: "الخطأ", render: (row) => <Text role="bodySm">{row.errorMessage || "—"}</Text> },
                    { key: "createdAt", header: "الوقت", render: (row) => <Text role="bodySm">{new Date(row.createdAt).toLocaleString("ar-YE")}</Text> },
                  ]}
                  rows={deliveryAudit.state.attempts}
                  getRowKey={(row) => row.id}
                />
              )}
            </>
          )}
        </Box>
      </Box>
    </ScrollScreen>
  );
}

const styles = {
  container: { margin: spacing[4] },
  editor: { marginTop: spacing[4], gap: spacing[3] },
  editorTitle: { textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" },
  auditSection: { marginTop: spacing[6], gap: spacing[3] },
  auditSummary: { flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" },
} as const;
