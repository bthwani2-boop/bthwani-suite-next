import React from "react";
import {
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
} from "@bthwani/ui-kit";
import { useCheckoutController } from "../../shared/checkout";
import type { DshCart } from "../../shared/cart";
import type { DshCreateIntentInput, DshFulfillmentMode } from "../../shared/checkout";

const FULFILLMENT_LABELS: Record<DshFulfillmentMode, string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل المتجر",
  pickup: "استلم بنفسك",
};

const PAYMENT_METHOD_LABEL = "الدفع عند الاستلام";

type Props = {
  readonly cart: DshCart;
  readonly deliveryAddress?: string;
  readonly note?: string;
  readonly onSuccess?: (intentId: string) => void;
  readonly onCancel?: () => void;
};

export function CheckoutScreen({ cart, deliveryAddress = "", note = "", onSuccess, onCancel }: Props) {
  const controller = useCheckoutController();

  const handleSubmit = () => {
    const input: DshCreateIntentInput = {
      cartId: cart.id,
      storeId: cart.storeId,
      fulfillmentMode: cart.fulfillmentMode,
      paymentMethod: "cod",
      ...(deliveryAddress ? { deliveryAddress } : {}),
      ...(note ? { note } : {}),
    };
    void controller.submit(input);
  };

  if (controller.state.kind === "confirming" || controller.state.kind === "loading") {
    return <LoadingState title="جاري معالجة الطلب…" />;
  }

  if (controller.state.kind === "success") {
    const { intent } = controller.state;
    return (
      <ScrollScreen>
        <Header
          title="تم تثبيت نية الدفع"
          subtitle="تم إنشاء مرجع WLT بدون تنفيذ أي عملية مالية داخل DSH"
          actions={<Badge label="WLT reference" tone="success" />}
        />
        <StateView
          title="الطلب جاهز للمتابعة"
          description={`رقم النية: ${intent.id} · مرجع WLT: ${intent.wltPaymentSessionId}`}
          tone="success"
        />
        <Card>
          <Text role="label">حالة الدفع</Text>
          <Text role="body">تم إنشاء مرجع جلسة الدفع داخل WLT. لا توجد محفظة أو دفتر أستاذ تم تعديله داخل DSH.</Text>
        </Card>
        {onSuccess && (
          <Button tone="primary" label="متابعة الطلب" onPress={() => onSuccess(intent.id)} fullWidth />
        )}
      </ScrollScreen>
    );
  }

  if (controller.state.kind === "payment_pending") {
    const { intent } = controller.state;
    return (
      <ScrollScreen>
        <Header title="في انتظار مرجع WLT" actions={<Badge label="payment_pending" tone="warning" />} />
        <StateView
          title="لم يصل مرجع الدفع بعد"
          description="DSH أنشأ نية checkout فقط. المتابعة المالية تبقى مملوكة لـ WLT."
          tone="warning"
        />
        <Button
          tone="ghost"
          label="إلغاء الطلب"
          onPress={() => void controller.cancel(intent.id)}
        />
        {onCancel && <Button tone="secondary" label="رجوع" onPress={onCancel} />}
      </ScrollScreen>
    );
  }

  if (controller.state.kind === "blocked_payment_unavailable") {
    return (
      <StateView
        title="WLT غير متاح"
        description="لا يمكن إنشاء نية الدفع بدون مرجع WLT. حاول مرة أخرى عند عودة الخدمة."
        tone="danger"
        actionLabel="رجوع"
        {...(onCancel ? { onActionPress: onCancel } : {})}
      />
    );
  }

  if (controller.state.kind === "out_of_area") {
    return (
      <StateView
        title="خارج نطاق التوصيل"
        description="المتجر غير متاح في منطقتك حاليًا."
        actionLabel="رجوع"
        {...(onCancel ? { onActionPress: onCancel } : {})}
      />
    );
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        title="تعذر إكمال الطلب"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.reset}
      />
    );
  }

  return (
    <ScrollScreen>
      <Header
        title="تأكيد الطلب"
        subtitle={`${cart.items.length} منتج · ${FULFILLMENT_LABELS[cart.fulfillmentMode]}`}
        actions={<Badge label="DSH-005" tone="action" />}
      />

      <Card>
        <Text role="label">ملخص السلة</Text>
        {cart.items.map((item) => (
          <ListItem
            key={item.id}
            title={item.productName}
            {...(item.priceReference ? { subtitle: item.priceReference } : {})}
            meta={`× ${item.quantity}`}
          />
        ))}
      </Card>

      <Card>
        <Text role="label">تفاصيل التنفيذ</Text>
        <ListItem title="طريقة التوصيل" subtitle={FULFILLMENT_LABELS[cart.fulfillmentMode]} />
        <ListItem title="طريقة الدفع" subtitle={PAYMENT_METHOD_LABEL} />
        {deliveryAddress ? <ListItem title="عنوان التسليم" subtitle={deliveryAddress} /> : null}
      </Card>

      <Card>
        <Text role="label">حدود WLT</Text>
        <Text role="body">
          عند التأكيد ينشئ DSH نية checkout فقط، ثم يأخذ مرجع جلسة دفع مملوك من WLT بدون أي خصم أو تسوية أو تعديل دفتر أستاذ داخل DSH.
        </Text>
      </Card>

      {onCancel && (
        <Button tone="secondary" label="رجوع" onPress={onCancel} />
      )}

      <Button
        tone="primary"
        label="تأكيد وإنشاء مرجع WLT"
        onPress={handleSubmit}
        fullWidth
      />
    </ScrollScreen>
  );
}
