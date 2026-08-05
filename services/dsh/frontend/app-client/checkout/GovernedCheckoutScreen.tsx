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
import { formatWltMoney } from "@bthwani/wlt/dsh";
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
  return formatWltMoney(value, currency);
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
  const { state, cancel, refresh, retryOrder } = useCheckoutToOrderFlow(input);

  if (state.kind === "loading") {
    return <LoadingState title="جاري تثبيت العنوان والأسعار والتحقق من الكوبون…" />;
  }
  if (state.kind === "validating") {
    return <LoadingState title="جاري التحقق من صحة البيانات…" />;
  }
  if (state.kind === "creating_order") {
    return <LoadingState title="تمت الموافقة المالية، جاري إنشاء الطلب…" />;
  }
  if (state.kind === "blocked_payment_unavailable") {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="الدفع غير متاح" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <StateView
            title="WLT غير متاح"
            description="لم يتم إنشاء طلب. أعد المحاولة من السلة بعد عودة WLT؛ مفتاح الإنشاء الخادمي يمنع إنشاء جلسة مزدوجة."
            tone="danger"
            actionLabel="العودة للسلة"
            {...(onCancel ? { onActionPress: onCancel } : {})}
          />
        </ScrollScreen>
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

  if (state.kind === "terminal") {
    const title = state.reason === "cancelled"
      ? "تم إلغاء Checkout"
      : state.reason === "expired"
        ? "انتهت جلسة الدفع"
        : "فشلت عملية الدفع";
    const description = state.reason === "cancelled"
      ? "ألغيت نية Checkout، وتم تحرير الموارد التشغيلية وإرسال انتهاء جلسة WLT عبر المسار الدائم عند وجودها."
      : state.reason === "expired"
        ? "أبلغ WLT بانتهاء الجلسة. ارجع إلى السلة وأنشئ محاولة جديدة بأسعار وقابلية خدمة محدثة."
        : "أبلغ WLT بفشل الدفع، ولم يُنشأ الطلب. يمكنك العودة إلى السلة واختيار طريقة دفع أخرى.";
    return (
      <View style={{ flex: 1 }}>
        <TopBar title={title} {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <StateView
            title={title}
            description={description}
            tone={state.reason === "cancelled" ? "warning" : "danger"}
            actionLabel="العودة للسلة"
            {...(onCancel ? { onActionPress: onCancel } : {})}
          />
        </ScrollScreen>
      </View>
    );
  }

  if (state.kind === "reconciliation_pending") {
    const { intent } = state;
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="جارٍ التحقق من WLT" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <View style={{ gap: spacing[3] }}>
            <StateView
              title="نتيجة WLT غير مؤكدة"
              description={`قد يكون WLT قبل الطلب قبل انقطاع الشبكة. تتم قراءة الحالة تلقائيًا دون إنشاء جلسة أخرى. مضى ${Math.max(0, intent.reconciliationAgeSeconds ?? 0)} ثانية.`}
              tone="warning"
            />
            <Card padding={3} gap={2}>
              <KeyValueList items={[
                { label: "مرجع Checkout", value: intent.id },
                { label: "مرجع WLT", value: intent.wltPaymentSessionId || "قيد المصالحة" },
                { label: "الإجمالي", value: formatMinorUnits(intent.quote.totalMinorUnits, intent.quote.currency) },
                { label: "نسخة الحالة", value: String(intent.version) },
              ]} />
            </Card>
            <Button label="تحديث الحالة الآن" tone="brand" onPress={() => refresh(intent.id)} />
            <Button label="إلغاء Checkout بأمان" tone="secondary" onPress={() => cancel(intent.id)} />
          </View>
        </ScrollScreen>
      </View>
    );
  }

  if (state.kind === "blocked") {
    const { intent, issues } = state;
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="لا يمكن إتمام Checkout" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <View style={{ gap: spacing[3] }}>
            <StateView
              title="هناك مشكلة تمنع الإتمام"
              description="يرجى مراجعة المشاكل أدناه وتصحيحها قبل المتابعة."
              tone="danger"
            />
            <Card padding={3} gap={2}>
              {issues.map((issue) => (
                <Text key={issue.code} role="body" align="start">
                  {`• ${issue.message}`}
                </Text>
              ))}
            </Card>
            <Button label="تحديث وإعادة التحقق" tone="brand" onPress={() => refresh(intent.id)} />
            <Button label="إلغاء" tone="secondary" onPress={() => cancel(intent.id)} />
          </View>
        </ScrollScreen>
      </View>
    );
  }

  if (state.kind === "ready" || state.kind === "previewing") {
    const { intent } = state;
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="مراجعة Checkout" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <View style={{ gap: spacing[3] }}>
            <StateView
              title="جاهز للتأكيد"
              description="تم التحقق من العنوان والأسعار. يمكنك الآن تأكيد الطلب وتحويله لـ WLT."
              tone="success"
            />
            <Card padding={3} gap={2}>
              <KeyValueList items={[
                { label: "عنوان التسليم", value: intent.deliveryAddress || "استلام ذاتي" },
                { label: "إجمالي المنتجات", value: formatMinorUnits(intent.quote.subtotalMinorUnits, intent.quote.currency) },
                { label: "رسوم التوصيل", value: formatMinorUnits(intent.quote.deliveryFeeMinorUnits, intent.quote.currency) },
                { label: "الخصم", value: formatMinorUnits(intent.quote.discountMinorUnits, intent.quote.currency) },
                { label: "الإجمالي", value: formatMinorUnits(intent.quote.totalMinorUnits, intent.quote.currency) },
                { label: "صلاحية Preview", value: intent.expiresAt ? new Date(intent.expiresAt).toLocaleTimeString() : "—" },
              ]} />
            </Card>
            <Button label="تأكيد وإتمام الدفع" tone="brand" onPress={() => refresh(intent.id)} />
            <Button label="إلغاء" tone="secondary" onPress={() => cancel(intent.id)} />
          </View>
        </ScrollScreen>
      </View>
    );
  }

  if (state.kind === "confirming") {
    const { intent } = state;
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="في انتظار WLT" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <View style={{ gap: spacing[3] }}>
            <StateView title="تم إرسال الطلب لـ WLT" description="تتم معالجة الدفع. ستُحدّث الحالة تلقائيًا." tone="warning" />
            <Card padding={3} gap={2}>
              <KeyValueList items={[
                { label: "عنوان التسليم", value: intent.deliveryAddress || "استلام ذاتي" },
                { label: "إجمالي المنتجات", value: formatMinorUnits(intent.quote.subtotalMinorUnits, intent.quote.currency) },
                { label: "رسوم التوصيل", value: formatMinorUnits(intent.quote.deliveryFeeMinorUnits, intent.quote.currency) },
                { label: "الخصم", value: formatMinorUnits(intent.quote.discountMinorUnits, intent.quote.currency) },
                { label: "الإجمالي", value: formatMinorUnits(intent.quote.totalMinorUnits, intent.quote.currency) },
                { label: "آخر أربعة للكوبون", value: intent.couponCodeLast4 || "لا يوجد" },
                { label: "مرجع snapshot", value: intent.quote?.hash?.slice(0, 16) || "none" },
              ]} />
            </Card>
            <Button label="تحديث حالة الدفع" tone="brand" onPress={() => refresh(intent.id)} />
            <Button label="إلغاء نية Checkout وتحرير الكوبون" tone="secondary" onPress={() => cancel(intent.id)} />
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
                { label: "إجمالي المنتجات", value: formatMinorUnits(state.intent.quote.subtotalMinorUnits, state.intent.quote.currency) },
                { label: "رسوم التوصيل", value: formatMinorUnits(state.intent.quote.deliveryFeeMinorUnits, state.intent.quote.currency) },
                { label: "الخصم", value: formatMinorUnits(state.intent.quote.discountMinorUnits, state.intent.quote.currency) },
                { label: "الإجمالي المدفوع/المستحق", value: formatMinorUnits(state.intent.quote.totalMinorUnits, state.intent.quote.currency) },
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
