import React from "react";
import { View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { LoadingState, StateView, Text } from "@bthwani/ui-kit";
import { useStoreRoleContextController } from "../../shared/store";

// UI-only surface — all logic in services/dsh/frontend/shared/store
// FIX_REQUIRED: full UI implementation pending
export function FieldStoreVerificationScreen() {
  const identity = useIdentitySession();
  const controller = useStoreRoleContextController("field", identity.state.kind);
  const { state } = controller;

  if (state.phase === "loading") {
    return <LoadingState />;
  }

  if (state.phase === "error") {
    return <StateView title="خطأ" desc={state.errorMessage ?? "حدث خطأ"} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Text>{state.storeName ?? "التحقق من المتجر"}</Text>
    </View>
  );
}

export default FieldStoreVerificationScreen;
