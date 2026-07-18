import React from "react";
import { View } from "react-native";
import {
  Button,
  Card,
  KeyValueList,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
  TopBar,
  spacing,
} from "@bthwani/ui-kit";
import { useCheckoutToOrderFlow } from "../../shared/checkout";
import type { DshCart } from "../../shared/cart";
import type { DshCreateIntentInput, DshPaymentMethod } from "../../shared/checkout";

type Props = {
  readonly cart: DshCart;
  readonly deliveryAddress?: string;
  readonly note?: string;
  readonly paymentMethod: DshPaymentMethod;
  readonly couponCode?: string;
  readonly onSuccess?: (orderId: string) => void;
  readonly onCancel?: () => void;
};

function formatMinorUnits(value: number, currency: string): string {
  const major = value / 100;
  return `${major.toLocaleString("ar")} ${currency === "YER" ? "ر.ي" : currency}`;
}

export function GovernedCheckoutScreen({
  cart,
  deliveryAddress = "",
  note = "",
  paymentMethod,
  couponCode = "",
  onSuccess,
  onCancel,
}: Props) {
  const input: DshCreateIntentInput = {
    cartId: cart.id,
    storeId: cart.storeId,
    fulfillmentMode: cart.fulfillmentMode,
    paymentMethod,
    ...(deliveryAddress ? { deliveryAddress } : {}),
    ...(note ? { note } : {}),
    ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
  };
  const { state, cancel } = useCheckoutToOrderFlow(input);

  if (state.kind === "loading") {
    return <LoadingState title="جاري تثبيت الأسعار والتحقق من الكوبون…" />;
  }
  if (state.kind === "creating_order") {
    return <LoadingState title="تمت الموافقة المالية، جاري إنشاء الطلب من snapshot ثابت…" />;
  }
  if (state.kind === "blocked_payment_unavailable") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="الدفع غير متاح" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen><StateView title="WLT غير متاح" description="لم يتم إنشاء طلب أو تثبيت استرداد الكوبون. أعد المحاولة بعد عودة WLT." tone="danger" /></ScrollScreen>
      </View>
    );
  }
  if (state.kind === "out_of_area") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="خارج النطاق" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen><StateView title="الموقع غير قابل للخدمة" description="عدّل طريقة التنفيذ أو العنوان ثم أعد المحاولة." tone="danger" /></ScrollScreen>
      </View>
    );
  }
  if (state.kind === "error" || state.kind === "order_error") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="تعذر إكمال الطلب" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen><StateView title="فشلت العملية" description={state.message} tone="danger" actionLabel="العودة للسلة" {...(onCancel ? { onActionPress: onCancel } : {})} /></ScrollScreen>
      </View>
    );
  }

  if (state.kind === "payment_pending") {
    const { intent } = state;
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="في انتظار WLT" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <View style={{ gap: spacing[3] }}>
            <StateView title="تم تثبيت تسعير DSH" description="الإجمالي أدناه هو نفس المبلغ المرسل إلى WLT. حجز الكوبون مؤقت حتى نجاح الدفع وإنشاء الطلب." tone="warning" />
            <Card padding={3} gap={2}>
              <KeyValueList items={[
                { label: "إجمالي المنتجات", value: formatMinorUnits(intent.subtotalMinorUnits, intent.currency) },
                { label: "رسوم التوصيل", value: formatMinorUnits(intent.deliveryFeeMinorUnits, intent.currency) },
                { label: "الخصم", value: formatMinorUnits(intent.discountMinorUnits, intent.currency) },
                { label: "الإجمالي إلى WLT", value: formatMinorUnits(intent.totalMinorUnits, intent.currency) },
                { label: "آخر أربعة للكوبون", value: intent.couponCodeLast4 || "لا يوجد" },
                { label: "مرجع snapshot", value: intent.pricingSnapshotHash.slice(0, 16) },
              ]} />
            </Card>
            <Button label="إلغاء نية checkout وتحرير الكوبون" tone="secondary" onPress={() => cancel(intent.id)} />
          </View>
        </ScrollScreen>
      </View>
    );
  }

  if (state.kind === "order_ready") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="تم إنشاء الطلب" />
        <ScrollScreen>
          <View style={{ gap: spacing[3] }}>
            <StateView title="تم تثبيت الطلب ماليًا وتشغيليًا" description="أصبح snapshot التسعير غير قابل للتعديل، وتم تثبيت استرداد الكوبون داخل معاملة إنشاء الطلب." tone="success" />
            <Card padding={3} gap={2}>
              <Text role="bodyStrong" align="start">رقم الطلب: {state.orderId}</Text>
              <KeyValueList items={[
                { label: "إجمالي المنتجات", value: formatMinorUnits(state.intent.subtotalMinorUnits, state.intent.currency) },
                { label: "رسوم التوصيل", value: formatMinorUnits(state.intent.deliveryFeeMinorUnits, state.intent.currency) },
                { label: "الخصم", value: formatMinorUnits(state.intent.discountMinorUnits, state.intent.currency) },
                { label: "الإجمالي المدفوع/المستحق", value: formatMinorUnits(state.intent.totalMinorUnits, state.intent.currency) },
              ]} />
            </Card>
            <Button label="فتح الطلب" tone="brand" onPress={() => onSuccess?.(state.orderId)} />
          </View>
        </ScrollScreen>
      </View>
    );
  }

  return null;
}
