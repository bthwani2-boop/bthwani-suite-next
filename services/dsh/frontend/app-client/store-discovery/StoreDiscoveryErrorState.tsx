import React from "react";
import { ErrorState } from "@bthwani/ui-kit";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function StoreDiscoveryErrorState({ message, onRetry }: Props) {
  return (
    <ErrorState
      title="Could Not Load Stores"
      description={message ?? "An error occurred while loading stores."}
      {...(onRetry === undefined ? {} : { actionLabel: "Retry", onActionPress: onRetry })}
    />
  );
}
