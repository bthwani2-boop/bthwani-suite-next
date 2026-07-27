"use client";

import { Text, spacing } from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  CpBadge,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { SettingsPageFrame } from "@bthwani/control-panel/shell";
import {
  useSlaRulesController,
  useZonesController,
} from "../../shared/platform";
import { ClientAddressPrivacySection } from "./ClientAddressPrivacySection";
import { DispatchBalancePolicySection } from "./DispatchBalancePolicySection";
import { Jrn029OperationalPolicySection } from "./Jrn029OperationalPolicySection";
import { MapProviderHealthCard } from "./MapProviderHealthCard";
import { OperationalPolicyGovernanceSection } from "./OperationalPolicyGovernanceSection";
import { ServiceAreaGovernanceSection } from "./ServiceAreaGovernanceSection";
import { StoreOnboardingFeePolicySection } from "./StoreOnboardingFeePolicySection";

type PlatformPoliciesContentProps = {
  readonly embedded?: boolean;
};

export function PlatformPoliciesContent({ embedded = false }: PlatformPoliciesContentProps) {
  const zonesController = useZonesController("authenticated");
  const slaController = useSlaRulesController("authenticated");

  return (
    <View style={embedded ? styles.embeddedStack : styles.stack}>
      {embedded ? (
        <View style={styles.section}>
          <Text role="titleSm">سياسات المنصة ومناطق الخدمة</Text>
          <Text role="caption" tone="muted">
            حقيقة DSH التشغيلية للخرائط والمناطق وخصوصية العناوين وSLA والسعة وأهلية الإسناد.
          </Text>
        </View>
      ) : null}

      <MapProviderHealthCard />
      <ServiceAreaGovernanceSection />
      <ClientAddressPrivacySection />
      <DispatchBalancePolicySection />

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
          <CpStateView kind="loading" title="جارٍ تحميل المناطق…" />
        ) : null}
        {zonesController.state.kind === "error" ? (
          <CpStatePanel role="alert" title="تعذر تحميل المناطق" description={zonesController.state.message}>
            <CpRetryButton onClick={zonesController.reload}>إعادة المحاولة</CpRetryButton>
          </CpStatePanel>
        ) : null}
        {zonesController.state.kind === "success" ? (
          zonesController.state.data.length === 0 ? (
            <CpStatePanel
              role="status"
              title="لا توجد مناطق تشغيلية"
              description="أنشئ المنطقة من API المحكومة أو من واجهة إدارة المنطقة المتقدمة قبل ربط المتاجر بها."
            />
          ) : (
            <CpTable aria-label="مناطق التشغيل المنطقية">
              <thead>
                <tr>
                  <CpTableHeaderCell>المنطقة</CpTableHeaderCell>
                  <CpTableHeaderCell>رمز المدينة</CpTableHeaderCell>
                  <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {zonesController.state.data.map((row) => (
                  <tr key={row.id} onClick={() => void zonesController.toggle(row, !row.isActive)}>
                    <CpTableCell>{row.name}</CpTableCell>
                    <CpTableCell>{row.cityCode}</CpTableCell>
                    <CpTableCell>{String(row.version)}</CpTableCell>
                    <CpTableCell>
                      <CpBadge tone={row.isActive ? "success" : "neutral"}>
                        {row.isActive ? "نشطة" : "معطلة"}
                      </CpBadge>
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          )
        ) : null}
      </View>

      <View style={styles.section}>
        <Text role="titleSm">قواعد SLA</Text>
        {slaController.mutationError ? <Text tone="danger">{slaController.mutationError}</Text> : null}
        {slaController.state.kind === "loading" ? (
          <CpStateView kind="loading" title="جارٍ تحميل قواعد SLA…" />
        ) : null}
        {slaController.state.kind === "error" ? (
          <CpStatePanel role="alert" title="تعذر تحميل قواعد SLA" description={slaController.state.message}>
            <CpRetryButton onClick={slaController.reload}>إعادة المحاولة</CpRetryButton>
          </CpStatePanel>
        ) : null}
        {slaController.state.kind === "success" ? (
          slaController.state.data.length === 0 ? (
            <CpStatePanel
              role="status"
              title="لا توجد قواعد SLA"
              description="لا تعتبر المنطقة جاهزة تشغيليًا حتى تعريف قواعد SLA المناسبة لها."
            />
          ) : (
            <CpTable aria-label="قواعد SLA">
              <thead>
                <tr>
                  <CpTableHeaderCell>المنطقة</CpTableHeaderCell>
                  <CpTableHeaderCell>الفئة</CpTableHeaderCell>
                  <CpTableHeaderCell>حد التحضير (د)</CpTableHeaderCell>
                  <CpTableHeaderCell>حد التوصيل (د)</CpTableHeaderCell>
                  <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {slaController.state.data.map((row) => (
                  <tr key={`${row.zoneId}-${row.category}`}>
                    <CpTableCell>{row.zoneId}</CpTableCell>
                    <CpTableCell>{row.category}</CpTableCell>
                    <CpTableCell>{String(row.maxPrepMins)}</CpTableCell>
                    <CpTableCell>{String(row.maxDeliveryMins)}</CpTableCell>
                    <CpTableCell>{String(row.version)}</CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          )
        ) : null}
      </View>

      <OperationalPolicyGovernanceSection />
      <Jrn029OperationalPolicySection />
      <StoreOnboardingFeePolicySection authKind="authenticated" />
    </View>
  );
}

export function PlatformPoliciesScreen() {
  return (
    <SettingsPageFrame
      header={
        <CpPageHeader title="سياسات المنصة ومناطق الخدمة">
          <CpMutedInline>حقيقة DSH التشغيلية للخرائط والمناطق وخصوصية العناوين وSLA والسعة وأهلية الإسناد</CpMutedInline>
        </CpPageHeader>
      }
    >
      <PlatformPoliciesContent />
    </SettingsPageFrame>
  );
}

const styles = StyleSheet.create({
  stack: { padding: spacing[4], gap: spacing[4] },
  embeddedStack: { gap: spacing[4] },
  section: { gap: spacing[2] },
});
