import React from "react";
import { View } from "react-native";
import { StateView, TopBar, colorRoles } from "@bthwani/ui-kit";

export type AddressLocationScreenProps = {
  readonly onBack?: () => void;
  readonly onOpenCheckout?: () => void;
};

/**
 * Address persistence is intentionally fail-closed until a governed DSH
 * address contract, authenticated repository, and map-provider integration
 * exist. The previous screen stored seeded addresses in localStorage and
 * returned random coordinates, which could not be treated as customer truth.
 */
export function AddressLocationScreen({
  onBack,
  onOpenCheckout,
}: AddressLocationScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <TopBar title="العناوين والموقع" {...(onBack ? { onBack } : {})} />
      <StateView
        title="دفتر العناوين غير مفعّل"
        description="لم يُعتمد بعد عقد لحفظ عناوين العميل أو مزود خرائط حقيقي. أدخل عنوان التسليم ورمز المنطقة والإحداثيات الاختيارية داخل السلة؛ وسيتم التحقق منها مباشرة عبر DSH قبل checkout."
        {...(onOpenCheckout
          ? {
              actionLabel: "فتح السلة",
              onActionPress: onOpenCheckout,
            }
          : {})}
      />
    </View>
  );
}
