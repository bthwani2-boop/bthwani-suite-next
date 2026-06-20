import React from "react";
import { EmptyState } from "@bthwani/ui-kit";

export function StoreDiscoveryEmptyState() {
  return (
    <EmptyState
      title="No Stores Found"
      description="There are no stores available in your area right now. Check back soon."
    />
  );
}
