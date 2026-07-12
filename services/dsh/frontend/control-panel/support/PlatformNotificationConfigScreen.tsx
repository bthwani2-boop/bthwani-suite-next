"use client";

import React from "react";
import { Badge, Box, Button, DataTable, Header, ScrollScreen, StateView, Text, TextField, spacing } from "@bthwani/ui-kit";
import { usePlatformNotificationConfigController } from "../../shared/notifications";
import type { DshPlatformNotificationConfig } from "../../shared/notifications";

export function PlatformNotificationConfigScreen() {
  const { state, reload, save } = usePlatformNotificationConfigController("authenticated");
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
  if (state.configs.length === 0) {
    return (
      <ScrollScreen>
        <Header title="إعدادات الإشعارات" />
        <StateView title="لا توجد إعدادات" description="لم يتم تهيئة أي إشعارات منصة بعد." />
        <Box style={styles.container}>
          <Box style={styles.editor}>
            <Text role="label" style={styles.editorTitle}>تهيئة إشعار منصة</Text>
            <TextField label="الموضوع" value={topic} onChangeText={setTopic} placeholder="order_update" />
            <TextField label="أنواع الممثلين" value={actorTypes} onChangeText={setActorTypes} placeholder="client, partner, captain" />
            <TextField label="الوصف" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
            {saveMessage ? <Text role="bodySm" tone="muted" style={styles.editorTitle}>{saveMessage}</Text> : null}
            <Box style={styles.actions}>
              <Button label="حفظ مفعّل" loading={isSaving} disabled={isSaving} fullWidth={false} onPress={() => { void handleSave(true); }} />
              <Button label="حفظ معطّل" tone="secondary" loading={isSaving} disabled={isSaving} fullWidth={false} onPress={() => { void handleSave(false); }} />
            </Box>
          </Box>
        </Box>
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Header title="إعدادات الإشعارات" subtitle="إدارة وتهيئة إشعارات المنصة" />
      <Box style={styles.container}>
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
      </Box>
    </ScrollScreen>
  );
}

const styles = {
  container: { margin: spacing[4] },
  editor: { marginTop: spacing[4], gap: spacing[3] },
  editorTitle: { textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" },
} as const;
