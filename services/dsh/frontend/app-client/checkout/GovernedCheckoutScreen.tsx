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
  readonly deliveryAddressId?: string;
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
  deliveryAddressId = "",
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
    ...(deliveryAddressId ? { deliveryAddressId } : {}),
    ...(note ? { note } : {}),
    ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
  };
  const { state, cancel, retryOrder } = useCheckoutToOrderFlow(input);

  if (state.kind === "loading") {
    return <LoadingState title="جاري تثبيت العنوان والأسعار والتحقق من الكوبون…" />;
  }
  if (state.kind === "creating_order") {
    return <LoadingState title="تمت الموافقة المالية، جاري إنشاء الطلب وقراءة حقيقته من الخادم…" />;
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
        <ScrollScreen><StateView title="العنوان غير قابل للخدمة" description="غيّر العنوان الافتراضي أو طريقة التنفيذ ثم أعد المحاولة." tone="danger" /></ScrollScreen>
      </View>
    );
  }
  if (state.kind === "error") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="تعذر بدء الطلب" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen><StateView title="فشل Checkout" description={state.message} tone="danger" actionLabel="العودة للسلة" {...(onCancel ? { onActionPress: onCancel } : {})} /></ScrollScreen>
      </View>
    );
  }
  if (state.kind === "order_error") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="تعذر تثبيت حقيقة الطلب" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <StateView
            title="لم يكتمل readback"
            description={`${state.message} ستستخدم إعادة المحاولة نفس مفتاح الإنشاء ولن تنشئ طلبًا مكررًا.`}
            tone="danger"
            actionLabel="إعادة محاولة آمنة"
            onActionPress={retryOrder}
          />
        </ScrollScreen>
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
            <StateView title="تم تثبيت عنوان وتسعير DSH" description="العنوان أدناه snapshot من دفتر العناوين المملوك لحسابك، والإجمالي هو نفس المبلغ المرسل إلى WLT." tone="warning" />
            <Card padding={3} gap={2}>
              <KeyValueList items={[
                { label: "عنوان التسليم", value: intent.deliveryAddress || "استلام ذاتي" },
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
            <StateView title="تمت قراءة حقيقة الطلب من DSH" description="تم تثبيت snapshot العنوان والتسعير، والتحقق من رقم الطلب والإصدار والارتباط بعد الإنشاء." tone="success" />
            <Card padding={3} gap={2}>
              <Text role="bodyStrong" align="start">رقم الطلب: {state.orderNumber}</Text>
              <KeyValueList items={[
                { label: "المعرف التقني", value: state.orderId },
                { label: "مرجع التتبع", value: state.correlationId },
                { label: "عنوان التسليم", value: state.intent.deliveryAddress || "استلام ذاتي" },
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
