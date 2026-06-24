"use client";

import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/app-shell";
import { Badge, DataTable, Header, ScrollScreen, StateView, Text, spacing } from "@bthwani/ui-kit";
import { usePlatformNotificationConfigController } from "../../shared/notifications";

export function PlatformNotificationConfigScreen() {
  const identity = useIdentitySession();
  const { state, reload } = usePlatformNotificationConfigController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }
  if (state.kind === "loading" || state.kind === "idle") return <StateView title="جارٍ التحميل…" />;
  if (state.kind === "error") {
    return <StateView title="خطأ" description={state.message} actionLabel="إعادة المحاولة" onAction={reload} />;
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
        <DataTable
          columns={[
            { key: "topic", label: "الموضوع" },
            { key: "isEnabled", label: "الحالة", render: (v: boolean) => (
              <Badge label={v ? "مفعّل" : "معطَّل"} variant={v ? "success" : "neutral"} />
            )},
            { key: "description", label: "الوصف" },
            { key: "updatedBy", label: "عُدِّل من" },
          ]}
          rows={state.configs}
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: { margin: spacing.md },
});
