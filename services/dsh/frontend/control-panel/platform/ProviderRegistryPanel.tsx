"use client";

import {
  Badge,
  Card,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import { PLATFORM_PROVIDER_REGISTRY, toProviderVisibleFields } from "../../shared/platform";
import type { ProviderVisibleFields } from "../../shared/platform";
import { MapsProviderInspector } from "./MapsProviderInspector";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  inactive: "neutral",
  pending_approval: "warning",
  failed: "danger",
  disabled_by_policy: "neutral",
};

const HEALTH_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  healthy: "success",
  degraded: "warning",
  down: "danger",
  unknown: "neutral",
};

export function ProviderRegistryPanel() {
  const providers = PLATFORM_PROVIDER_REGISTRY.map(toProviderVisibleFields);
  const mapsProvider = providers.find((p) => p.kind === "maps");

  return (
    <ScrollScreen>
      <Header title="سجل مزودي المنصة" subtitle="إدارة مزودي الخرائط والمدفوعات والبنية التحتية" />

      {mapsProvider && (
        <View style={styles.section}>
          <Text role="titleSm">مزود الخرائط</Text>
          <MapsProviderInspector provider={mapsProvider} />
        </View>
      )}

      <View style={styles.section}>
        <Text role="titleSm">جميع المزودين</Text>
        <DataTable<ProviderVisibleFields & Record<string, unknown>>
          columns={[
            { key: "label", header: "المزود", render: (row) => row.label },
            { key: "kind", header: "النوع", render: (row) => row.kind },
            {
              key: "status",
              header: "الحالة",
              render: (row) => <Badge label={row.status as string} tone={STATUS_TONE[row.status as string] ?? "neutral"} />,
            },
            {
              key: "lastHealthStatus",
              header: "الصحة",
              render: (row) => <Badge label={row.lastHealthStatus as string} tone={HEALTH_TONE[row.lastHealthStatus as string] ?? "neutral"} />,
            },
            { key: "environment", header: "البيئة", render: (row) => row.environment },
            { key: "maskedCredential", header: "المعرّف المُقنَّع", render: (row) => (row.maskedCredential as string | null) ?? "—" },
          ]}
          rows={providers as (ProviderVisibleFields & Record<string, unknown>)[]}
          getRowKey={(row) => row.id as string}
        />
      </View>

      <Card>
        <View style={styles.notice}>
          <Text role="captionSm">
            تعديل المزودين يتطلب عقد Backend موثق. لا يمكن تطبيق أي تغيير محلياً أو كمعاينة فقط.
          </Text>
        </View>
      </Card>

      <StateView
        tone="info"
        title="الحد المالي لـ WLT"
        description="مزود الدفع يخضع لحدود WLT. DSH لا يمتلك الحقيقة المالية ولا يعدّل بيانات الدفع مباشرة."
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
  notice: { padding: spacing[3] },
});
