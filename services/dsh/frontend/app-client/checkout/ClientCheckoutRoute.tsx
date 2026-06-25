import React from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import { Header, ScrollScreen } from "@bthwani/ui-kit";
import { AuthLoginCard } from "../../shared/auth/AuthLoginCard";
import { CartScreen } from "../cart";
import { CheckoutScreen } from "./CheckoutScreen";
import type { DshCart } from "../../shared/cart";

type Props = {
  readonly storeId: string;
  readonly serviceAreaCode?: string;
  readonly onBrowseCatalog?: () => void;
};

export function ClientCheckoutRoute({ storeId, serviceAreaCode = "sana", onBrowseCatalog }: Props) {
  const identity = useIdentitySession();
  const [checkoutCart, setCheckoutCart] = React.useState<DshCart | null>(null);

  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="إتمام الطلب" subtitle="تسجيل دخول العميل مطلوب قبل إنشاء مرجع WLT" />
        <AuthLoginCard
          title="دخول العميل"
          subtitle="استخدم حساب العميل المحلي لمتابعة السلة وبدء checkout."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
          onDevBypass={() => void identity.login("client", "123456")}
        />
      </ScrollScreen>
    );
  }

  if (checkoutCart) {
    return (
      <CheckoutScreen
        cart={checkoutCart}
        deliveryAddress="صنعاء، حي الأصبحي"
        onCancel={() => setCheckoutCart(null)}
        onSuccess={() => undefined}
      />
    );
  }

  return (
    <CartScreen
      storeId={storeId}
      serviceAreaCode={serviceAreaCode}
      authKind="authenticated"
      {...(onBrowseCatalog ? { onBrowseCatalog } : {})}
      onProceedToCheckout={setCheckoutCart}
    />
  );
}
