"use client";

import {
  Badge,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import { useZonesController, useSlaRulesController } from "../../shared/platform-policies";
import type { DshZone, DshSlaRule } from "../../shared/platform-policies";
import { StoreOnboardingFeePolicySection } from "./StoreOnboardingFeePolicySection";

export function PlatformPoliciesScreen() {
  const { state: zonesState, reload: reloadZones, toggle } = useZonesController("authenticated");
  const { state: slaState } = useSlaRulesController("authenticated");

  return (
    <ScrollScreen>
      <Header title="سياسات المنصة" subtitle="إدارة المناطق وقواعد SLA والطاقة الاستيعابية" />

      <View style={styles.section}>
        <Text role="titleSm">مناطق الخدمة</Text>
        {zonesState.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {zonesState.kind === "error" && (
          <StateView title="خطأ" description={zonesState.message} actionLabel="إعادة المحاولة" onActionPress={reloadZones} />
        )}
        {zonesState.kind === "success" && (
          <DataTable<DshZone & Record<string, unknown>>
            columns={[
              { key: "name", header: "المنطقة", render: (row) => row.name },
              { key: "cityCode", header: "رمز المدينة", render: (row) => row.cityCode },
              { key: "isActive", header: "الحالة", render: (row) => (
                <Badge label={row.isActive ? "نشطة" : "معطّلة"} tone={row.isActive ? "success" : "neutral"} />
              )},
            ]}
            rows={zonesState.data as (DshZone & Record<string, unknown>)[]}
            getRowKey={(row) => row.id}
            onRowPress={(row) => toggle(row.id, !row.isActive)}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text role="titleSm">قواعد SLA</Text>
        {slaState.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {slaState.kind === "error" && <StateView title="خطأ" description={slaState.message} />}
        {slaState.kind === "success" && (
          <DataTable<DshSlaRule & Record<string, unknown>>
            columns={[
              { key: "zoneId", header: "المنطقة", render: (row) => row.zoneId },
              { key: "category", header: "الفئة", render: (row) => row.category },
              { key: "maxPrepMins", header: "حد التحضير (د)", render: (row) => String(row.maxPrepMins) },
              { key: "maxDeliveryMins", header: "حد التوصيل (د)", render: (row) => String(row.maxDeliveryMins) },
            ]}
            rows={slaState.data as (DshSlaRule & Record<string, unknown>)[]}
            getRowKey={(row) => `${row.zoneId}-${row.category}`}
          />
        )}
      </View>

      <StoreOnboardingFeePolicySection authKind="authenticated" />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
});
