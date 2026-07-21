import React from "react";
import { ScrollView, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  LoadingState,
  StateView,
  Text,
  TextField,
  TopBar,
  spacing,
} from "@bthwani/ui-kit";
import { useCartController, useServiceabilityController } from "../../shared/cart";
import type { DshCart, DshFulfillmentMode } from "../../shared/cart";
import type { DshPaymentMethod } from "../../shared/checkout";
import { useWltDshPaymentController } from "../../shared/finance-wlt-link";
import { PaymentDecisionSection } from "./PaymentDecisionSection";

type Props = {
  readonly storeId: string;
  readonly serviceAreaCode?: string;
  readonly authKind?: "authenticated" | "unauthenticated";
  readonly onProceedToCheckout?: (
    cart: DshCart,
    deliveryAddress: string,
    note: string,
    paymentMethod: DshPaymentMethod,
    couponCode: string,
  ) => void;
  readonly onBrowseCatalog?: () => void;
  readonly onBack?: () => void;
};

const FULFILLMENT_OPTIONS: readonly { value: DshFulfillmentMode; label: string; description: string }[] = [
  { value: "bthwani_delivery", label: "توصيل بثواني", description: "رسومه تُحتسب من سياسة DSH المعتمدة للمتجر." },
  { value: "partner_delivery", label: "توصيل المتجر", description: "ينفذه موصل مرتبط فعليًا بفريق المتجر." },
  { value: "pickup", label: "استلم بنفسك", description: "تستلم الطلب من المتجر دون توصيل." },
];

function parseItemPrice(reference?: string): number {
  if (!reference) return 0;
  const parsed = Number.parseFloat(reference.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function GovernedCartScreen({
  storeId,
  serviceAreaCode = "",
  authKind = "unauthenticated",
  onProceedToCheckout,
  onBrowseCatalog,
  onBack,
}: Props) {
  const cartController = useCartController(storeId, authKind);
  const serviceability = useServiceabilityController();
  const [fulfillmentMode, setFulfillmentMode] = React.useState<DshFulfillmentMode>("bthwani_delivery");
  const [couponCode, setCouponCode] = React.useState("");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [note, setNote] = React.useState("");

  const cart = cartController.state.kind === "success" ? cartController.state.cart : null;
  const presentationSubtotal = React.useMemo(
    () => cart?.items.reduce((sum, item) => sum + parseItemPrice(item.priceReference) * item.quantity, 0) ?? 0,
    [cart],
  );
  const payment = useWltDshPaymentController(presentationSubtotal);

  React.useEffect(() => {
    if (cart) setFulfillmentMode(cart.fulfillmentMode);
  }, [cart]);

  React.useEffect(() => {
    if (!storeId || !serviceAreaCode || fulfillmentMode === "pickup") return;
    void serviceability.check(storeId, serviceAreaCode);
  }, [fulfillmentMode, serviceAreaCode, storeId]);

  if (cartController.state.kind === "loading") {
    return <View style={{ flex: 1 }}><TopBar title="السلة" {...(onBack ? { onBack } : {})} /><LoadingState title="جاري تحميل السلة…" /></View>;
  }
  if (cartController.state.kind === "permission_denied") {
    return <View style={{ flex: 1 }}><TopBar title="السلة" {...(onBack ? { onBack } : {})} /><StateView title="يلزم تسجيل الدخول" description="سجّل الدخول للوصول إلى السلة وإتمام checkout." /></View>;
  }
  if (cartController.state.kind === "offline") {
    return <View style={{ flex: 1 }}><TopBar title="السلة" {...(onBack ? { onBack } : {})} /><StateView title="لا يوجد اتصال" actionLabel="إعادة المحاولة" onActionPress={cartController.retry} /></View>;
  }
  if (cartController.state.kind === "error") {
    return <View style={{ flex: 1 }}><TopBar title="السلة" {...(onBack ? { onBack } : {})} /><StateView title="تعذر تحميل السلة" description={cartController.state.message} actionLabel="إعادة المحاولة" onActionPress={cartController.retry} /></View>;
  }
  if (cartController.state.kind === "empty" || !cart) {
    return <View style={{ flex: 1 }}><TopBar title="السلة" {...(onBack ? { onBack } : {})} /><StateView title="السلة فارغة" {...(onBrowseCatalog ? { actionLabel: "تصفح المنتجات", onActionPress: onBrowseCatalog } : {})} /></View>;
  }

  const fulfillmentRequiresAddress = fulfillmentMode !== "pickup";
  const serviceabilityReady = fulfillmentMode === "pickup" || serviceability.serviceability.kind === "serviceable";
  const canProceed = serviceabilityReady && (!fulfillmentRequiresAddress || deliveryAddress.trim().length >= 5);

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="مراجعة السلة" subtitle={`${cart.items.length} عنصر`} {...(onBack ? { onBack } : {})} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: 120 }}>
        <Card padding={3} gap={2} tone="info">
          <Text role="bodyStrong" align="start">التسعير السيادي</Text>
          <Text role="bodySm" tone="muted" align="start">
            رسوم التوصيل والخصم والإجمالي لا تُحسب داخل التطبيق. يثبتها DSH من السلة وسياسة المتجر والكوبون ثم يرسل الإجمالي نفسه إلى WLT.
          </Text>
        </Card>

        <Card padding={3} gap={3}>
          <Text role="bodyStrong" align="start">طريقة التنفيذ</Text>
          {FULFILLMENT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              label={`${option.label} — ${option.description}`}
              tone={fulfillmentMode === option.value ? "brand" : "secondary"}
              onPress={() => setFulfillmentMode(option.value)}
            />
          ))}
        </Card>

        {fulfillmentRequiresAddress ? (
          <Card padding={3} gap={2}>
            <Text role="bodyStrong" align="start">عنوان التوصيل</Text>
            <TextField
              label="العنوان التفصيلي"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="المدينة، الحي، الشارع، العلامة المميزة"
              multiline
            />
            {serviceability.serviceability.kind === "checking" ? <Text role="caption">جاري التحقق من التغطية…</Text> : null}
            {serviceability.serviceability.kind === "blocked" ? (
              <Text role="caption" tone="danger">{serviceability.serviceability.reason}</Text>
            ) : null}
            <Button
              label="إعادة فحص التغطية"
              tone="secondary"
              onPress={() => void serviceability.check(storeId, serviceAreaCode)}
            />
          </Card>
        ) : null}

        <Card padding={3} gap={2}>
          <Text role="bodyStrong" align="start">القسيمة</Text>
          <TextField
            label="رمز الكوبون"
            value={couponCode}
            onChangeText={setCouponCode}
            placeholder="اختياري — يتحقق منه DSH عند التأكيد"
          />
          <Text role="caption" tone="muted" align="start">لا يُعرض خصم قبل قبول الكوبون وحجزه من الخادم.</Text>
        </Card>

        <Card padding={3} gap={2}>
          <Text role="bodyStrong" align="start">ملاحظات الطلب</Text>
          <TextField label="ملاحظة" value={note} onChangeText={setNote} multiline />
        </Card>

        <PaymentDecisionSection
          paymentMethod={payment.paymentMethod}
          options={payment.paymentDecisionOptions}
          onSelectMethod={payment.setPaymentMethod}
        />

        <Card padding={3} gap={2}>
          <Text role="bodyStrong" align="start">المنتجات</Text>
          {cart.items.map((item) => (
            <View key={item.id} style={{ gap: spacing[1] }}>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] }}>
                <View style={{ flex: 1 }}>
                  <Text role="bodyStrong" align="start">{item.productName}</Text>
                  <Text role="caption" tone="muted" align="start">{parseItemPrice(item.priceReference).toLocaleString("ar")} ر.ي × {item.quantity}</Text>
                </View>
                <View style={{ flexDirection: "row-reverse", gap: spacing[1] }}>
                  <Button label="+" size="sm" fullWidth={false} onPress={() => void cartController.updateItemQuantity(item.masterProductId, item.productName, item.quantity + 1, item.priceReference)} />
                  <Button label="−" size="sm" fullWidth={false} tone="secondary" onPress={() => void cartController.updateItemQuantity(item.masterProductId, item.productName, item.quantity - 1, item.priceReference)} />
                </View>
              </View>
              <Divider />
            </View>
          ))}
          <Text role="bodySm" align="start">إجمالي المنتجات التقديري: {presentationSubtotal.toLocaleString("ar")} ر.ي</Text>
          <Text role="caption" tone="muted" align="start">الإجمالي النهائي يظهر بعد إنشاء intent من DSH.</Text>
          <Button label="حذف جميع العناصر" tone="secondary" onPress={() => void cartController.clear(cart)} />
        </Card>

        <Button
          label="تثبيت التسعير والمتابعة إلى الدفع"
          tone="brand"
          disabled={!canProceed}
          onPress={() => onProceedToCheckout?.(
            cart,
            fulfillmentRequiresAddress ? deliveryAddress.trim() : "",
            note.trim(),
            payment.paymentMethod,
            couponCode.trim().toUpperCase(),
          )}
        />
      </ScrollView>
    </View>
  );
}
