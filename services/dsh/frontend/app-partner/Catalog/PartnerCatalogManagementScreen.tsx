import React from "react";
import { View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { LoadingState, StateView, Text } from "@bthwani/ui-kit";
import { usePartnerCatalogController } from "../../shared/catalog";

// UI-only surface — all catalog logic in services/dsh/frontend/shared/catalog
// FIX_REQUIRED: full UI implementation pending (inventory, product edit, media, overrides)
export function PartnerCatalogManagementScreen() {
  const identity = useIdentitySession();
  const { state, actions } = usePartnerCatalogController(identity.state.kind);

  if (state.phase === "loading") {
    return <LoadingState />;
  }

  if (state.phase === "error") {
    return <StateView title="خطأ" desc={state.errorMessage ?? "حدث خطأ في الكتالوج"} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Text>{state.title ?? "إدارة الكتالوج"}</Text>
    </View>
  );
}

export default PartnerCatalogManagementScreen;
