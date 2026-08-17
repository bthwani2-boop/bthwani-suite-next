"use client";

import { Text, spacing } from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  CpMutedInline,
  CpPageHeader,
} from "@bthwani/control-panel/components";
import { SettingsPageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  CONTROL_PANEL_CAPABILITIES,
  hasAllControlPanelPermissions,
} from "../../shared/session/control-panel-permissions";
import { ClientAddressPrivacySection } from "./ClientAddressPrivacySection";
import { OperationalPolicySection } from "./OperationalPolicySection";
import { MapProviderHealthCard } from "./MapProviderHealthCard";
import { OperationalPolicyGovernanceSection } from "./OperationalPolicyGovernanceSection";
import { ServiceAreaGovernanceSection } from "./ServiceAreaGovernanceSection";
import { StoreOnboardingFeePolicySection } from "./StoreOnboardingFeePolicySection";

type PlatformPoliciesContentProps = {
  readonly embedded?: boolean;
};

export function PlatformPoliciesContent({ embedded = false }: PlatformPoliciesContentProps) {
  const { state } = useIdentitySession();
  const identity = state.kind === "authenticated" ? state.identity : null;
  const canReadPlatformPolicy = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshPlatformPolicyRead,
  );
  const canManagePlatformPolicy = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshPlatformPolicyManage,
  );
  const canReadOperationalPolicy = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshOperationalPolicyRead,
  );
  const canManageOperationalPolicy = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshOperationalPolicyManage,
  );
  const canReadOperationalAudit = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshOperationalPolicyAuditRead,
  );
  const canRollbackOperationalPolicy = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshOperationalPolicyRollback,
  );
  const canReadFinance = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshFinanceRead,
  );
  const canManageFinance = hasAllControlPanelPermissions(
    identity,
    CONTROL_PANEL_CAPABILITIES.dshFinanceManage,
  );

  return (
    <View style={embedded ? styles.embeddedStack : styles.stack}>
      {embedded ? (
        <View style={styles.section}>
          <Text role="titleSm">سياسات المنصة ومناطق الخدمة</Text>
          <Text role="caption" tone="muted">
            حقيقة DSH التشغيلية للخرائط والمناطق وخصوصية العناوين وSLA والسعة. قرارات الأهلية المالية للكابتن مملوكة لـWLT، وDSH يعرض قرارًا قصير العمر فقط عند الإسناد.
          </Text>
        </View>
      ) : null}

      <MapProviderHealthCard canRead={canReadPlatformPolicy} />
      <ServiceAreaGovernanceSection
        canRead={canReadPlatformPolicy}
        canManage={canManagePlatformPolicy}
      />
      <ClientAddressPrivacySection
        canRead={canReadPlatformPolicy}
        canManage={canManagePlatformPolicy}
      />
      <OperationalPolicyGovernanceSection
        canRead={canReadOperationalPolicy}
        canManage={canManageOperationalPolicy}
      />
      <OperationalPolicySection
        canRead={canReadOperationalPolicy}
        canManage={canManageOperationalPolicy}
        canReadAudit={canReadOperationalAudit}
        canRollback={canRollbackOperationalPolicy}
      />
      <StoreOnboardingFeePolicySection
        canRead={canReadFinance}
        canManage={canManageFinance}
      />
    </View>
  );
}

export function PlatformPoliciesScreen() {
  return (
    <SettingsPageFrame
      header={
        <CpPageHeader title="سياسات المنصة ومناطق الخدمة">
          <CpMutedInline>حقيقة DSH التشغيلية للخرائط والمناطق وخصوصية العناوين وSLA والسعة. الحقيقة المالية للكابتن مملوكة لـWLT.</CpMutedInline>
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
