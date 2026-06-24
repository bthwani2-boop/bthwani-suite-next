"use client";

import { useIdentitySession } from "@bthwani/app-shell";
import {
  Badge,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  View,
  StyleSheet,
  spacing,
} from "@bthwani/ui-kit";
import { useZonesController, useSlaRulesController } from "../../shared/platform-policies";
import type { DshZone, DshSlaRule } from "../../shared/platform-policies";

export function PlatformPoliciesScreen() {
  const identity = useIdentitySession();
  const { state: zonesState, reload: reloadZones, toggle } = useZonesController(identity.state.kind);
  const { state: slaState } = useSlaRulesController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

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
              { key: "name", label: "المنطقة" },
              { key: "cityCode", label: "رمز المدينة" },
              { key: "isActive", label: "الحالة", render: (v) => (
                <Badge label={v ? "نشطة" : "معطّلة"} tone={v ? "success" : "neutral"} />
              )},
            ]}
            rows={zonesState.data as (DshZone & Record<string, unknown>)[]}
            onRowAction={(row) => toggle((row as DshZone).id, !(row as DshZone).isActive)}
            rowActionLabel="تبديل"
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
              { key: "zoneId", label: "المنطقة" },
              { key: "category", label: "الفئة" },
              { key: "maxPrepMins", label: "حد التحضير (د)" },
              { key: "maxDeliveryMins", label: "حد التوصيل (د)" },
            ]}
            rows={slaState.data as (DshSlaRule & Record<string, unknown>)[]}
          />
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
});
