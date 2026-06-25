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
import { useCartController, useServiceabilityController } from "../../shared/cart";
import type { DshCart } from "../../shared/cart";

type Props = {
  readonly storeId: string;
  readonly serviceAreaCode?: string;
  readonly authKind?: "authenticated" | "unauthenticated";
  readonly onProceedToCheckout?: (cart: DshCart) => void;
  readonly onBrowseCatalog?: () => void;
};

export function CartScreen({
  storeId,
  serviceAreaCode = "",
  authKind = "unauthenticated",
  onProceedToCheckout,
  onBrowseCatalog,
}: Props) {
  const controller = useCartController(storeId, authKind);
  const serviceabilityController = useServiceabilityController();

  if (controller.state.kind === "loading") {
    return <LoadingState title="جاري تحميل السلة…" />;
  }

  if (controller.state.kind === "offline") {
    return (
      <StateView
        title="لا يوجد اتصال"
        description="تحقق من اتصالك بالإنترنت وأعد المحاولة."
        actionLabel="إعادة المحاولة"
        onActionPress={controller.retry}
      />
    );
  }

  if (controller.state.kind === "permission_denied") {
    return (
      <StateView
        title="يلزم تسجيل الدخول"
        description="سجّل دخولك للوصول إلى سلتك."
      />
    );
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل السلة"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.retry}
      />
    );
  }

  if (controller.state.kind === "empty") {
    return (
      <StateView
        title="سلتك فارغة"
        description="أضف منتجات من الكتالوج للمتابعة."
        {...(onBrowseCatalog ? { actionLabel: "تصفح الكتالوج", onActionPress: onBrowseCatalog } : {})}
      />
    );
  }

  const { cart } = controller.state;

  const handleCheckServiceability = () => {
    void serviceabilityController.check(storeId, serviceAreaCode);
  };

  const isBlocked = serviceabilityController.serviceability.kind === "blocked";
  const isChecking = serviceabilityController.serviceability.kind === "checking";
  const isServiceable = serviceabilityController.serviceability.kind === "serviceable";

  const fulfillmentLabel =
    cart.fulfillmentMode === "bthwani_delivery"
      ? "توصيل بثواني"
      : cart.fulfillmentMode === "partner_delivery"
      ? "توصيل المتجر"
      : "استلم بنفسك";

  return (
    <ScrollScreen>
      <Header title="سلة التسوق" subtitle={`${cart.items.length} منتج`} />

      <Card>
        {cart.items.map((item) => (
          <ListItem
            key={item.id}
            title={item.productName}
            {...(item.priceReference ? { subtitle: item.priceReference } : {})}
            meta={`× ${item.quantity}`}
            trailing={
              <Button
                tone="ghost"
                size="sm"
                label="حذف"
                onPress={() => void controller.removeItem(cart.id, item.id)}
                disabled={controller.action === "submitting"}
              />
            }
          />
        ))}
      </Card>

      <Card>
        <Text role="label">طريقة التوصيل</Text>
        <Text role="body">{fulfillmentLabel}</Text>
      </Card>

      {serviceabilityController.serviceability.kind === "blocked" && (
        <StateView
          title="خارج نطاق التوصيل"
          description={
            serviceabilityController.serviceability.reason ??
            "المتجر غير متاح في منطقتك حاليًا."
          }
          actionLabel="تغيير المنطقة"
          onActionPress={serviceabilityController.reset}
        />
      )}

      {serviceabilityController.serviceability.kind === "error" && (
        <StateView
          title="تعذر التحقق من التوصيل"
          description={serviceabilityController.serviceability.message}
          actionLabel="إعادة المحاولة"
          onActionPress={handleCheckServiceability}
        />
      )}

      <Button
        tone="secondary"
        label="حذف السلة"
        onPress={() => void controller.clear(cart)}
        disabled={controller.action === "submitting"}
      />

      {!isServiceable && !isBlocked && (
        <Button
          tone="primary"
          label={isChecking ? "جاري التحقق…" : "التحقق من التوصيل"}
          onPress={handleCheckServiceability}
          disabled={isChecking}
        />
      )}

      {isServiceable && (
        <>
          <Badge label="منطقتك مخدومة" tone="success" />
          <Button
            tone="primary"
            label="المتابعة للدفع"
            {...(onProceedToCheckout ? { onPress: () => onProceedToCheckout(cart) } : {})}
            disabled={controller.action === "submitting"}
          />
        </>
      )}
    </ScrollScreen>
  );
}
