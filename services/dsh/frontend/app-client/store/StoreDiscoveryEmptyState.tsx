import React from "react";
import { EmptyState } from "@bthwani/ui-kit";

export function StoreDiscoveryEmptyState() {
  return (
    <EmptyState
      title="لا توجد متاجر"
      description="لا توجد متاجر متاحة في منطقتك حالياً. تحقق مجدداً قريباً."
    />
  );
}
