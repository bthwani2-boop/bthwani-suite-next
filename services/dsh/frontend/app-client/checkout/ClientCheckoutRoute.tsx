import React from "react";
import { View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  LoadingState,
  ScrollScreen,
  StateView,
  TopBar,
} from "@bthwani/ui-kit";
import { AuthLoginCard } from "../../shared/auth/AuthLoginCard";
import { useStoreDetailController } from "../../shared/store";
import { useClientAddressController } from "../../shared/client-address";
import { CartScreen } from "../cart";
import { GovernedCheckoutScreen as CheckoutScreen } from "./GovernedCheckoutScreen";
import type { DshCart } from "../../shared/cart";
import type { DshPaymentMethod } from "../../shared/checkout";

type Props = {
  readonly storeId: string;
  readonly onBrowseCatalog?: () => void;
  readonly onManageAddresses?: () => void;
  readonly onBack?: () => void;
  readonly onSuccess?: (orderId: string) => void;
};

type CheckoutData = {
  readonly cart: DshCart;
  readonly deliveryAddressId: string;
  readonly note: string;
  readonly paymentMethod: DshPaymentMethod;
  readonly couponCode: string;
};

function AuthenticatedCheckout({
  storeId,
  onBrowseCatalog,
  onManageAddresses,
  onBack,
  onSuccess,
}: Props) {
  const addressController = useClientAddressController();
  const [checkoutData, setCheckoutData] = React.useState<CheckoutData | null>(null);

  if (addressController.state.kind === "loading") {
    return <LoadingState title="جاري تحميل عنوان التسليم الافتراضي…" />;
  }
  if (addressController.state.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل دفتر العناوين"
        description={addressController.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={addressController.reload}
      />
    );
  }

  if (checkoutData) {
    return (
      <CheckoutScreen
        cart={checkoutData.cart}
        deliveryAddressId={checkoutData.deliveryAddressId}
        note={checkoutData.note}
        paymentMethod={checkoutData.paymentMethod}
        couponCode={checkoutData.couponCode}
        onCancel={() => setCheckoutData(null)}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <CartScreen
      storeId={storeId}
      selectedAddress={addressController.selectedAddress}
      authKind="authenticated"
      onProceedToCheckout={(cart, deliveryAddressId, note, paymentMethod, couponCode) =>
        setCheckoutData({ cart, deliveryAddressId, note, paymentMethod, couponCode })
      }
      {...(onManageAddresses ? { onManageAddresses } : {})}
      {...(onBrowseCatalog ? { onBrowseCatalog } : {})}
      {...(onBack ? { onBack } : {})}
    />
  );
}

export function ClientCheckoutRoute(props: Props) {
  const identity = useIdentitySession();
  const storeController = useStoreDetailController(props.storeId);

  if (storeController.state.kind === "loading") {
    return <LoadingState title="جاري تحميل نطاق خدمة المتجر…" />;
  }
  if (storeController.state.kind === "service_unavailable") {
    return (
      <StateView
        title="الخدمة غير متاحة"
        description="تعذر الوصول إلى DSH لتحديد نطاق خدمة المتجر."
        actionLabel="إعادة المحاولة"
        onActionPress={storeController.retry}
      />
    );
  }
  if (storeController.state.kind === "error") {
    return (
      <StateView
        title="تعذر بدء checkout"
        description={storeController.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={storeController.retry}
      />
    );
  }
  if (storeController.state.kind !== "success") {
    return (
      <StateView
        title="تعذر تحديد المتجر"
        description="بيانات المتجر ليست في حالة قابلة للاستخدام."
        actionLabel="إعادة المحاولة"
        onActionPress={storeController.retry}
      />
    );
  }

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar
          title="السلة وإتمام الطلب"
          subtitle="سجّل الدخول للوصول إلى سلة DSH"
          {...(props.onBack ? { onBack: props.onBack } : {})}
        />
        <ScrollScreen>
          <AuthLoginCard
            title="دخول العميل"
            subtitle="استخدم حساب العميل للوصول إلى السلة وبدء checkout."
            loading={identity.state.kind === "authenticating"}
            {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
            onSubmit={(username, password) => void identity.login(username, password)}
          />
        </ScrollScreen>
      </View>
    );
  }

  return <AuthenticatedCheckout {...props} />;
}
