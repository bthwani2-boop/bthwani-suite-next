"use client";

import { Card, Text, spacing } from "@bthwani/ui-kit";
import { WebStyleSheet as StyleSheet, WebView as View } from "@bthwani/ui-kit/web";
import { CpBadge, CpButton, CpRetryButton, CpStatePanel, CpStateView } from "@bthwani/control-panel/components";
import { useMapProviderHealthController } from "../../shared/client-map";

export function MapProviderHealthCard() {
  const controller = useMapProviderHealthController(true);

  if (controller.state.kind === "loading") {
    return <CpStateView kind="loading" title="جارٍ فحص مزود الخرائط…" />;
  }
  if (controller.state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر فحص مزود الخرائط" description={controller.state.message}>
        <CpRetryButton onClick={controller.reload}>إعادة الفحص</CpRetryButton>
      </CpStatePanel>
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
        <CpBadge tone={healthy ? "success" : "warning"}>
          {healthy ? "سليم" : health.status === "degraded" ? "متدهور" : "غير مؤكد"}
        </CpBadge>
      </View>
      <Text role="caption" tone="muted">
        آخر فحص: {new Date(health.checkedAt).toLocaleString("ar")}
      </Text>
      {health.providers.map((provider, index) => (
        <View key={`${provider.kind}-${provider.checkedAt}-${index}`} style={styles.providerRow}>
          <CpBadge tone={["healthy", "ok", "ready"].includes(provider.status) ? "success" : "warning"}>
            {provider.status}
          </CpBadge>
          <Text role="bodySm">{provider.message || "لا توجد ملاحظات تشغيلية."}</Text>
        </View>
      ))}
      {health.providers.length === 0 ? (
        <Text tone="warning">لم ترجع خدمة Providers حالة مزود خرائط محددة.</Text>
      ) : null}
      <CpButton variant="secondary" onClick={() => void controller.reload()}>إعادة الفحص</CpButton>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { margin: spacing[4], padding: spacing[4], gap: spacing[2] },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[3] },
  text: { gap: spacing[1] },
  providerRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], flexWrap: "wrap" },
});
