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
import {
  useProviderRegistryController,
  type ProviderRegistryItem,
} from "../../shared/platform";
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
  not_configured: "neutral",
};

export function ProviderRegistryPanel() {
  const registry = useProviderRegistryController(true);

  if (registry.state.kind === "loading" || registry.state.kind === "idle") {
    return (
      <ScrollScreen>
        <Header title="سجل مزودي المنصة" subtitle="مزودو الخرائط والمدفوعات والبنية التحتية" />
        <StateView title="جاري تحميل المزودين…" />
      </ScrollScreen>
    );
  }

  if (registry.state.kind === "error") {
    return (
      <ScrollScreen>
        <Header title="سجل مزودي المنصة" subtitle="مزودو الخرائط والمدفوعات والبنية التحتية" />
        <StateView
          tone="danger"
          title="تعذر تحميل سجل المزودين"
          description={registry.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={registry.reload}
        />
      </ScrollScreen>
    );
  }

  const providers = registry.state.items;
  const mapsProvider = providers.find((provider) => provider.kind === "maps") ?? null;

  return (
    <ScrollScreen>
      <Header
        title="سجل مزودي المنصة"
        subtitle="قراءة سيادية لحالة المزودين وصحتهم؛ الأسرار والتعديلات تبقى خلف الباك إند ودورة التغيير."
      />

      {mapsProvider ? (
        <View style={styles.section}>
          <Text role="titleSm">مزود الخرائط</Text>
          <MapsProviderInspector provider={mapsProvider} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text role="titleSm">جميع المزودين</Text>
        {providers.length === 0 ? (
          <StateView
            tone="neutral"
            title="لا يوجد مزودون مسجلون"
            description="لم تُرجع خدمة providers أي سجل تشغيلي، ولا تُعرض سجلات محلية أو تجريبية بديلة."
          />
        ) : (
          <DataTable<ProviderRegistryItem & Record<string, unknown>>
            columns={[
              { key: "providerId", header: "المعرّف", render: (row) => row.providerId },
              { key: "code", header: "المزود", render: (row) => row.code },
              { key: "kind", header: "النوع", render: (row) => row.kind },
              {
                key: "status",
                header: "الحالة",
                render: (row) => (
                  <Badge label={row.status} tone={STATUS_TONE[row.status] ?? "neutral"} />
                ),
              },
              {
                key: "lastHealthStatus",
                header: "الصحة",
                render: (row) => (
                  <Badge
                    label={row.lastHealthStatus}
                    tone={HEALTH_TONE[row.lastHealthStatus] ?? "neutral"}
                  />
                ),
              },
              {
                key: "healthMessage",
                header: "تفاصيل الصحة",
                render: (row) => row.healthMessage ?? "—",
              },
            ]}
            rows={providers as readonly (ProviderRegistryItem & Record<string, unknown>)[]}
            getRowKey={(row) => row.providerId}
          />
        )}
      </View>

      <Card>
        <View style={styles.notice}>
          <Text role="caption">
            تعديل المزودين محجوب حتى يمر عبر Change Workflow يحتوي تحققًا، واعتمادًا مستقلاً، وتدقيقًا، وقراءة راجعة، وهدف تراجع. لا يتم حفظ أسرار أو تغييرات داخل الواجهة.
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
