"use client";

import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { Badge, DataTable, Header, ScrollScreen, StateView, Text, spacing } from "@bthwani/ui-kit";
import { usePlatformNotificationConfigController } from "../../shared/notifications";
import type { DshPlatformNotificationConfig } from "../../shared/notifications";

export function PlatformNotificationConfigScreen() {
  const identity = useIdentitySession();
  const { state, reload } = usePlatformNotificationConfigController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
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
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Header title="إعدادات الإشعارات" subtitle="إدارة وتهيئة إشعارات المنصة" />
      <View style={styles.container}>
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
          ]}
          rows={state.configs}
          getRowKey={(row) => row.id}
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: { margin: spacing[4] },
});
