import React from "react";
import { View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { TopBar, ScrollScreen } from "@bthwani/ui-kit";
import { AuthLoginCard } from "../../shared/auth/AuthLoginCard";
import { CartScreen } from "../cart";
import { CheckoutScreen } from "./CheckoutScreen";
import type { DshCart } from "../../shared/cart";
import type { DshPaymentMethod } from "../../shared/checkout";

type Props = {
  readonly storeId: string;
  readonly serviceAreaCode?: string;
  readonly onBrowseCatalog?: () => void;
  readonly onBack?: () => void;
  readonly onSuccess?: (intentId: string) => void;
};

export function ClientCheckoutRoute({ storeId, serviceAreaCode = "sana", onBrowseCatalog, onBack, onSuccess }: Props) {
  const identity = useIdentitySession();
  const [checkoutData, setCheckoutData] = React.useState<{ cart: DshCart; deliveryAddress: string; note: string; paymentMethod: DshPaymentMethod } | null>(null);
  const [wantsCheckout, setWantsCheckout] = React.useState(false);

  if (wantsCheckout && identity.state.kind !== "authenticated") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="إتمام الطلب" subtitle="سجل الدخول للمتابعة" />
        <ScrollScreen>
          <AuthLoginCard
            title="دخول العميل"
            subtitle="استخدم حساب العميل المحلي لمتابعة السلة وبدء checkout."
            loading={identity.state.kind === "authenticating"}
            {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
            onSubmit={(username, password) => void identity.login(username, password)}
          />
        </ScrollScreen>
      </View>
    );
  }

  if (checkoutData) {
    return (
      <CheckoutScreen
        cart={checkoutData.cart}
        deliveryAddress={checkoutData.deliveryAddress}
        note={checkoutData.note}
        paymentMethod={checkoutData.paymentMethod}
        onCancel={() => {
          setCheckoutData(null);
          setWantsCheckout(false);
        }}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <CartScreen
      storeId={storeId}
      serviceAreaCode={serviceAreaCode}
      authKind={identity.state.kind === "authenticated" ? "authenticated" : "unauthenticated"}
      onProceedToCheckout={(cart, deliveryAddress, note, paymentMethod) => {
        setCheckoutData({ cart, deliveryAddress, note, paymentMethod });
        if (identity.state.kind !== "authenticated") {
          setWantsCheckout(true);
        }
      }}
      {...(onBrowseCatalog ? { onBrowseCatalog } : {})}
      {...(onBack ? { onBack } : {})}
    />
  );
}

