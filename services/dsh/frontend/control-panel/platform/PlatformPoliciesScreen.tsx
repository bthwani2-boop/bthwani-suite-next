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
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  useSlaRulesController,
  useZonesController,
  type DshSlaRule,
  type DshZone,
} from "../../shared/platform";
import { MapProviderHealthCard } from "./MapProviderHealthCard";
import { ServiceAreaGovernanceSection } from "./ServiceAreaGovernanceSection";
import { StoreOnboardingFeePolicySection } from "./StoreOnboardingFeePolicySection";

export function PlatformPoliciesScreen() {
  const zonesController = useZonesController("authenticated");
  const slaController = useSlaRulesController("authenticated");

  return (
    <ScrollScreen>
      <Header
        title="سياسات المنصة ومناطق الخدمة"
        subtitle="حقيقة DSH التشغيلية للمناطق والمضلعات وSLA والسعة ورسوم تهيئة المتجر"
      />

      <MapProviderHealthCard />
      <ServiceAreaGovernanceSection />

      <View style={styles.section}>
        <Text role="titleSm">مناطق التشغيل المنطقية</Text>
        <Text role="caption" tone="muted">
          ترتبط المنطقة التشغيلية بالمتاجر وقواعد SLA والسعة. المضلعات الجغرافية
          أعلاه هي المرجع المكاني لاعتماد رمز منطقة الخدمة.
        </Text>
        {zonesController.mutationError ? (
          <Text tone="danger">{zonesController.mutationError}</Text>
        ) : null}
        {zonesController.state.kind === "loading" ? (
          <StateView title="جارٍ تحميل المناطق…" />
        ) : null}
        {zonesController.state.kind === "error" ? (
          <StateView
            title="تعذر تحميل المناطق"
            description={zonesController.state.message}
            actionLabel="إعادة المحاولة"
            onActionPress={zonesController.reload}
          />
        ) : null}
        {zonesController.state.kind === "success" ? (
          zonesController.state.data.length === 0 ? (
            <StateView
              title="لا توجد مناطق تشغيلية"
              description="أنشئ المنطقة من API المحكومة أو من واجهة إدارة المنطقة المتقدمة قبل ربط المتاجر بها."
            />
          ) : (
            <DataTable<DshZone & Record<string, unknown>>
              columns={[
                {
                  key: "name",
                  header: "المنطقة",
                  render: (row) => row.name,
                },
                {
                  key: "cityCode",
                  header: "رمز المدينة",
                  render: (row) => row.cityCode,
                },
                {
                  key: "version",
                  header: "الإصدار",
                  render: (row) => String(row.version),
                },
                {
                  key: "isActive",
                  header: "الحالة",
                  render: (row) => (
                    <Badge
                      label={row.isActive ? "نشطة" : "معطلة"}
                      tone={row.isActive ? "success" : "neutral"}
                    />
                  ),
                },
              ]}
              rows={
                zonesController.state.data as (DshZone &
                  Record<string, unknown>)[]
              }
              getRowKey={(row) => row.id}
              onRowPress={(row) =>
                void zonesController.toggle(row, !row.isActive)
              }
            />
          )
        ) : null}
      </View>

      <View style={styles.section}>
        <Text role="titleSm">قواعد SLA</Text>
        {slaController.mutationError ? (
          <Text tone="danger">{slaController.mutationError}</Text>
        ) : null}
        {slaController.state.kind === "loading" ? (
          <StateView title="جارٍ تحميل قواعد SLA…" />
        ) : null}
        {slaController.state.kind === "error" ? (
          <StateView
            title="تعذر تحميل قواعد SLA"
            description={slaController.state.message}
            actionLabel="إعادة المحاولة"
            onActionPress={slaController.reload}
          />
        ) : null}
        {slaController.state.kind === "success" ? (
          slaController.state.data.length === 0 ? (
            <StateView
              title="لا توجد قواعد SLA"
              description="لا تعتبر المنطقة جاهزة تشغيليًا حتى تعريف قواعد SLA المناسبة لها."
            />
          ) : (
            <DataTable<DshSlaRule & Record<string, unknown>>
              columns={[
                {
                  key: "zoneId",
                  header: "المنطقة",
                  render: (row) => row.zoneId,
                },
                {
                  key: "category",
                  header: "الفئة",
                  render: (row) => row.category,
                },
                {
                  key: "maxPrepMins",
                  header: "حد التحضير (د)",
                  render: (row) => String(row.maxPrepMins),
                },
                {
                  key: "maxDeliveryMins",
                  header: "حد التوصيل (د)",
                  render: (row) => String(row.maxDeliveryMins),
                },
                {
                  key: "version",
                  header: "الإصدار",
                  render: (row) => String(row.version),
                },
              ]}
              rows={
                slaController.state.data as (DshSlaRule &
                  Record<string, unknown>)[]
              }
              getRowKey={(row) => `${row.zoneId}-${row.category}`}
            />
          )
        ) : null}
      </View>

      <StoreOnboardingFeePolicySection authKind="authenticated" />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
});
