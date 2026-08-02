// services/wlt/frontend/app-partner/finance — WltPartnerFinanceScreen
// Displays the authenticated partner's own financial data from WLT:
// partner COD custody + commissions + payout destination.
// DSH surfaces import this via the WLT partner facade.
import React from "react";
import { View } from "react-native";
import { Box, MobileScrollView, TopBar, useTheme } from "@bthwani/ui-kit";
import { ActorWalletPanel } from '@bthwani/wlt/dsh';
import { RepresentativeCommissionPanel } from '@bthwani/wlt/dsh';
import { PayoutDestinationPanel } from '@bthwani/wlt/dsh';
import { PartnerCodCustodyPanel } from '@bthwani/wlt/dsh';

export type WltPartnerFinanceScreenProps = {
  readonly section?: "overview" | "cod-liability" | "commissions" | "payouts";
  readonly onBack?: (() => void) | undefined;
  readonly embedded?: boolean;
};

function PartnerFinanceContent() {
  return (
    <Box gap={4}>
      <ActorWalletPanel actorType="partner" title="المحفظة والرصيد المالي" embedded />
      <PartnerCodCustodyPanel />
      <RepresentativeCommissionPanel actorType="partner" title="العمولات والرسوم التشغيلية" embedded />
      <PayoutDestinationPanel actorType="partner" title="وجهة الصرف وطلبات الدفع" embedded />
    </Box>
  );
}

export function WltPartnerFinanceScreen({
  section = "overview",
  onBack,
  embedded = false,
}: WltPartnerFinanceScreenProps) {
  const theme = useTheme() as any;

  if (section === "cod-liability") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface }}>
        {!embedded && onBack && <TopBar title="عهدة COD للشريك" onBack={onBack} />}
        <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: 96 }}>
          <PartnerCodCustodyPanel />
        </MobileScrollView>
      </View>
    );
  }

  if (embedded) return <PartnerFinanceContent />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar title="مالية الشريك" {...(onBack ? { onBack } : {})} />
      <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: 120 }}>
        <PartnerFinanceContent />
      </MobileScrollView>
    </View>
  );
}
