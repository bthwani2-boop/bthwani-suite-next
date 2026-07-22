"use client";

import { Badge, Button, Card, StateView, Text, spacing } from "@bthwani/ui-kit";
import { WebStyleSheet as StyleSheet, WebView as View } from "@bthwani/ui-kit/web";
import { useMapProviderHealthController } from "../../shared/client-map";

export function MapProviderHealthCard() {
  const controller = useMapProviderHealthController(true);

  if (controller.state.kind === "loading") {
    return <StateView title="جارٍ فحص مزود الخرائط…" />;
  }
  if (controller.state.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر فحص مزود الخرائط"
        description={controller.state.message}
        actionLabel="إعادة الفحص"
        onActionPress={controller.reload}
      />
    );
  }

  const health = controller.state.data;
  const healthy = health.status === "healthy";
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.text}>
          <Text role="titleSm">حالة مزود الخرائط المحكوم</Text>
          <Text role="caption" tone="muted">
            القراءة تمر عبر DSH ولا تعرض أسرار المزود أو إعداداته الحساسة.
          </Text>
        </View>
        <Badge
          label={healthy ? "سليم" : health.status === "degraded" ? "متدهور" : "غير مؤكد"}
          tone={healthy ? "success" : "warning"}
        />
      </View>
      <Text role="caption" tone="muted">
        آخر فحص: {new Date(health.checkedAt).toLocaleString("ar")}
      </Text>
      {health.providers.map((provider, index) => (
        <View key={`${provider.kind}-${provider.checkedAt}-${index}`} style={styles.providerRow}>
          <Badge
            label={provider.status}
            tone={["healthy", "ok", "ready"].includes(provider.status) ? "success" : "warning"}
          />
          <Text role="bodySm">{provider.message || "لا توجد ملاحظات تشغيلية."}</Text>
        </View>
      ))}
      {health.providers.length === 0 ? (
        <Text tone="warning">لم ترجع خدمة Providers حالة مزود خرائط محددة.</Text>
      ) : null}
      <Button label="إعادة الفحص" tone="secondary" size="sm" onPress={() => void controller.reload()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { margin: spacing[4], padding: spacing[4], gap: spacing[2] },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[3] },
  text: { gap: spacing[1] },
  providerRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], flexWrap: "wrap" },
});
