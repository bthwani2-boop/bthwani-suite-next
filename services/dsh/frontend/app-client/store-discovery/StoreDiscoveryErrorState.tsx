import React from "react";
import { ErrorState } from "@bthwani/ui-kit";

type Props = Readonly<{
  message?: string;
  onRetry?: () => void;
}>;

export function StoreDiscoveryErrorState({ message, onRetry }: Props) {
  return (
    <ErrorState
      title="تعذّر تحميل المتاجر"
      description={message ?? "حدث خطأ أثناء تحميل المتاجر. يرجى المحاولة مجدداً."}
      {...(onRetry === undefined ? {} : { actionLabel: "إعادة المحاولة", onActionPress: onRetry })}
    />
  );
}
