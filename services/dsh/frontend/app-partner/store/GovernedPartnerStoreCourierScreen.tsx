import React from "react";
import { ScrollView, View } from "react-native";
import { spacing } from "@bthwani/ui-kit";
import type { DshPartnerOperationalScope } from "../../shared/partner";
import { DshPartnerStoreCourierScreen } from "./DshPartnerStoreCourierScreen";
import { PartnerDeliveryPricingCard } from "./PartnerDeliveryPricingCard";

export type GovernedPartnerStoreCourierScreenProps = {
  readonly storeId: string;
  readonly scopes: readonly DshPartnerOperationalScope[];
  readonly onBack?: () => void;
};

export function GovernedPartnerStoreCourierScreen({
  storeId,
  scopes,
  onBack,
}: GovernedPartnerStoreCourierScreenProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      <DshPartnerStoreCourierScreen storeId={storeId} scopes={scopes} {...(onBack ? { onBack } : {})} />
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
        <PartnerDeliveryPricingCard storeId={storeId} />
      </View>
    </ScrollView>
  );
}
