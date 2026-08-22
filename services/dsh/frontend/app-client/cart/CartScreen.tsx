import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import {
  Badge,
  Button,
  Icon,
  LoadingState,
  ScrollScreen,
  StateView,
  Surface,
  Text,
  TopBar,
  alpha,
  colorRoles,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import {
  useCartController,
  useServiceabilityController,
} from "../../shared/cart";
import type {
  DshCart,
  DshFulfillmentMode,
} from "../../shared/cart";
import type { CheckoutToOrderFlowState, DshPaymentMethod } from "../../shared/checkout";
import type { DshClientAddress } from "../../shared/client-address";
import { useWltPaymentController } from "@bthwani/wlt/dsh";
import { useStoreDetailController } from "../../shared/store";
import { PaymentDecisionSection } from "./PaymentDecisionSection";
import { CartConflictSheet } from "./CartConflictSheet";
import { StoreConfirmationHero } from "./StoreConfirmationHero";
import { CartQuoteSummary } from "./CartQuoteSummary";
import { CheckoutProgress } from "./CheckoutProgress";
import { CartAddressSection } from "./CartAddressSection";
import { CartItemsSection } from "./CartItemsSection";

type Props = {
  readonly storeId: string;
  readonly selectedAddress: DshClientAddress | null;
  readonly authKind?: "authenticated" | "unauthenticated" | undefined;
  readonly onProceedToCheckout?: ((
    cart: DshCart,
    deliveryAddressId: string,
    note: string,
    paymentMethod: DshPaymentMethod,
    couponCode: string,
  ) => void) | undefined;
  readonly onManageAddresses?: (() => void) | undefined;
  readonly onBrowseCatalog?: (() => void) | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly checkoutState?: CheckoutToOrderFlowState | undefined;
  readonly onResetCheckout?: (() => void) | undefined;
  readonly onCancelCheckout?: ((intentId: string) => void) | undefined;
  readonly onRefreshCheckout?: ((intentId: string) => void) | undefined;
  readonly onRetryOrder?: (() => void) | undefined;
};

function fulfillmentLabel(mode: DshFulfillmentMode): string {
  switch (mode) {
    case "bthwani_delivery":
      return "توصيل بثواني";
    case "partner_delivery":
      return "توصيل المتجر";
    case "pickup":
      return "استلام ذاتي";
  }
}

export function CartScreen({
  storeId,
  selectedAddress,
  authKind = "unauthenticated",
  onProceedToCheckout,
  onManageAddresses,
  onBrowseCatalog,
  onBack,
  checkoutState,
  onResetCheckout,
  onCancelCheckout,
  onRefreshCheckout,
  onRetryOrder,
}: Props) {
  const controller = useCartController(storeId, authKind);
  const serviceabilityController = useServiceabilityController();
  const storeController = useStoreDetailController(storeId);
  const store = storeController.state.kind === "success" ? storeController.state.store : null;
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [onMyWayNote, setOnMyWayNote] = useState("");
  const [onMyWayActive, setOnMyWayActive] = useState(false);
  const [localFulfillmentMode, setLocalFulfillmentMode] = useState<DshFulfillmentMode | null>(null);
  const [validationMessageText, setValidationMessageText] = useState<string | null>(null);

  const cart = controller.state.kind === "success" ? controller.state.cart : null;
  const cartTotal = cart?.quote?.totalMinorUnits ?? 0;
  const cartCurrency = cart?.quote?.currency ?? "YER";
  const wltPayment = useWltPaymentController({ totalMinorUnits: cartTotal, currency: cartCurrency });
  const activeFulfillmentMode = localFulfillmentMode ?? (cart?.fulfillmentMode ?? "bthwani_delivery");
  const requiresDeliveryAddress = activeFulfillmentMode !== "pickup";
  const actionPending = controller.action === "submitting";
  const cartReady = cart?.validation?.ready !== false;
  const validationByItemId = useMemo(
    () => new Map((cart?.validation?.items ?? []).map((item) => [item.itemId, item])),
    [cart?.validation?.items],
  );

  const toggleFulfillmentMode = () => {
    setLocalFulfillmentMode((prev) => {
      const current = prev ?? (cart?.fulfillmentMode ?? "bthwani_delivery");
      if (current === "bthwani_delivery") return "pickup";
      if (current === "pickup") return "partner_delivery";
      return "bthwani_delivery";
    });
  };

  useEffect(() => {
    if (!cart || !requiresDeliveryAddress || !selectedAddress?.id) {
      serviceabilityController.reset();
      return;
    }
    void serviceabilityController.check(storeId, selectedAddress.id, activeFulfillmentMode);
  }, [
    activeFulfillmentMode,
    requiresDeliveryAddress,
    selectedAddress?.id,
    selectedAddress?.version,
    storeId,
    cart?.id,
  ]);

  const canProceed = useMemo(() => {
    if (!cart || actionPending || !cartReady) return false;
    if (!requiresDeliveryAddress) return true;
    if (!selectedAddress) return false;
    return (
      serviceabilityController.serviceability.kind !== "blocked" &&
      serviceabilityController.serviceability.kind !== "error"
    );
  }, [
    actionPending,
    cart,
    cartReady,
    requiresDeliveryAddress,
    selectedAddress,
    serviceabilityController.serviceability.kind,
  ]);

  const proceed = () => {
    if (!cart || !onProceedToCheckout) return;
    if (onResetCheckout) onResetCheckout();
    setValidationMessageText(null);
    if (!cartReady) {
      setValidationMessageText("يرجى مراجعة وتحديث أسعار المنتجات في السلة قبل المتابعة.");
      return;
    }
    if (requiresDeliveryAddress && !selectedAddress) {
      setValidationMessageText("يرجى اختيار عنوان التوصيل قبل المتابعة.");
      return;
    }
    const finalNote = [note.trim(), onMyWayActive && onMyWayNote.trim() ? `على طريقي: ${onMyWayNote.trim()}` : ""]
      .filter(Boolean)
      .join(" · ");

    onProceedToCheckout(
      { ...cart, fulfillmentMode: activeFulfillmentMode },
      requiresDeliveryAddress ? selectedAddress?.id ?? "" : "",
      finalNote,
      wltPayment.paymentMethod,
      couponCode.trim(),
    );
  };

  if (controller.state.kind === "loading") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <LoadingState title="جاري تحميل السلة…" />
      </View>
    );
  }

  if (controller.state.kind === "offline") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="لا يوجد اتصال بالإنترنت"
          description="تعذر الاتصال بالخدمة. تحقق من اتصالك ثم أعد المحاولة."
          actionLabel="إعادة المحاولة"
          onActionPress={controller.retry}
        />
      </View>
    );
  }

  if (controller.state.kind === "permission_denied") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="يلزم تسجيل الدخول"
          description="سجّل الدخول للوصول إلى سلة المشتريات الخاصة بك."
        />
      </View>
    );
  }

  if (controller.state.kind === "error") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="تعذر تحميل السلة"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.retry}
        />
      </View>
    );
  }

  if (controller.state.kind === "empty") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="السلة فارغة"
          description="أضف منتجًا من كتالوج المتجر للمتابعة."
          {...(onBrowseCatalog
            ? { actionLabel: "تصفح المنتجات", onActionPress: onBrowseCatalog }
            : {})}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar
        title="تأكيد الطلب"
        subtitle={`${controller.state.cart.items.length} منتج`}
        {...(onBack ? { onBack } : {})}
      />

      <ScrollScreen contentContainerStyle={styles.content}>
        <StoreConfirmationHero
          itemCount={controller.state.cart.items.length}
          fulfillmentMode={activeFulfillmentMode}
          ready={cartReady}
          store={store}
        />

        <Surface tone="raised" style={styles.richSection}>
          <View style={styles.richSectionHeader}>
            <View style={styles.richIconWrap}>
              <Icon name={activeFulfillmentMode === "pickup" ? "storefront-outline" : "car-outline"} size={24} tone="brand" />
            </View>
            <View style={{ flex: 1 }}>
              <Text role="bodyStrong" style={styles.richSectionTitle}>خيار التوصيل والاستلام</Text>
              <Text role="caption" style={styles.mutedText}>
                الخيار المحدد: {fulfillmentLabel(activeFulfillmentMode)}
              </Text>
            </View>
            <Button
              label="تغيير الخيار"
              tone="secondary"
              size="sm"
              onPress={toggleFulfillmentMode}
            />
          </View>
        </Surface>

        <CheckoutProgress
          state={checkoutState}
          {...(onResetCheckout ? { onReset: onResetCheckout } : {})}
          {...(onCancelCheckout ? { onCancel: onCancelCheckout } : {})}
          {...(onRefreshCheckout ? { onRefresh: onRefreshCheckout } : {})}
          {...(onRetryOrder ? { onRetryOrder } : {})}
        />

        <CartItemsSection
          cart={controller.state.cart}
          validationByItemId={validationByItemId}
          actionPending={actionPending}
          actionError={controller.action === "error" ? (controller.actionError ?? "تعذر تنفيذ تعديل السلة. أعد المحاولة.") : null}
          onUpdateQuantity={(masterProductId, productName, quantity, priceReference, options, itemNote) => {
            void controller.updateItemQuantity(masterProductId, productName, quantity, priceReference, options, itemNote);
          }}
          onRemoveItem={(cartId, itemId) => {
            void controller.removeItem(cartId, itemId);
          }}
          onClearCart={(c) => {
            void controller.clear(c);
          }}
        />

        <CartAddressSection
          requiresDeliveryAddress={requiresDeliveryAddress}
          selectedAddress={selectedAddress}
          cart={cart}
          storeId={storeId}
          serviceabilityState={serviceabilityController.serviceability}
          {...(onManageAddresses ? { onManageAddresses } : {})}
          onCheckServiceability={(sId, addrId, mode) => {
            void serviceabilityController.check(sId, addrId, mode);
          }}
        />

        <Surface tone="raised" style={styles.richSection}>
          <View style={styles.richSectionHeader}>
            <View style={styles.richIconWrap}>
              <Icon name="pricetag-outline" size={24} tone="brand" />
            </View>
            <View style={{ flex: 1 }}>
              <Text role="bodyStrong" style={styles.richSectionTitle}>هل لديك قسيمة تخفيض؟</Text>
              <Text role="caption" style={styles.mutedText}>
                {couponApplied ? "تم تطبيق رمز القسيمة بنجاح" : "أدخل رمز التخفيض إن وجد"}
              </Text>
            </View>
            {couponApplied ? <Badge label="مطبقة" tone="success" /> : null}
          </View>
          <View style={styles.richInputRow}>
            <View style={{ flex: 1 }}>
              <CartInputField
                label=""
                value={couponCode}
                onChangeText={(text: string) => {
                  setCouponCode(text);
                  if (couponApplied) setCouponApplied(false);
                }}
                placeholder="رمز القسيمة (مثال: BTHWANI)"
                autoCapitalize="characters"
              />
            </View>
            <Button
              label={couponApplied ? "إلغاء" : "تطبيق"}
              tone={couponApplied ? "secondary" : "brand"}
              disabled={!couponCode.trim()}
              onPress={() => {
                if (couponApplied) {
                  setCouponApplied(false);
                  setCouponCode("");
                } else if (couponCode.trim()) {
                  setCouponApplied(true);
                }
              }}
            />
          </View>
        </Surface>

        <Surface tone="raised" style={styles.richSection}>
          <View style={styles.richSectionHeader}>
            <View style={styles.richIconWrap}>
              <Icon name="document-text-outline" size={24} tone="brand" />
            </View>
            <View style={{ flex: 1 }}>
              <Text role="bodyStrong" style={styles.richSectionTitle}>ملاحظات الطلب</Text>
              <Text role="caption" style={styles.mutedText}>
                {noteSaved && note.trim() ? "تم حفظ الملاحظة للطلب" : "تعليمات واضحة للمتجر أو الموصل"}
              </Text>
            </View>
            {noteSaved && note.trim() ? <Badge label="تم الحفظ" tone="success" /> : null}
          </View>
          <View style={styles.richInputRow}>
            <View style={{ flex: 1 }}>
              <CartInputField
                label="ملاحظات للطلب"
                value={note}
                onChangeText={(val) => {
                  setNote(val);
                  setNoteSaved(false);
                }}
                placeholder="تعليمات خاصة بالتوصيل، الباب، أو الأصناف..."
                multiline
              />
            </View>
            <Button
              label={noteSaved ? "معدل" : "حفظ"}
              tone="secondary"
              disabled={!note.trim()}
              onPress={() => {
                if (note.trim()) setNoteSaved(true);
              }}
            />
          </View>
        </Surface>

        <Surface tone="raised" style={styles.richSection}>
          <View style={styles.richSectionHeader}>
            <View style={styles.richIconWrap}>
              <Icon name="cafe-outline" size={24} tone="brand" />
            </View>
            <View style={{ flex: 1 }}>
              <Text role="bodyStrong" style={styles.richSectionTitle}>على طريقي</Text>
              <Text role="caption" style={styles.mutedText}>
                {onMyWayActive ? "تم تفعيل الطلب الإضافي" : "أطلب شيئاً بسيطاً من الكابتن في طريقه إليك"}
              </Text>
            </View>
            <Button
              label={onMyWayActive ? "إلغاء" : "إضافة طلب"}
              tone={onMyWayActive ? "secondary" : "brand"}
              size="sm"
              onPress={() => setOnMyWayActive((prev) => !prev)}
            />
          </View>
          {onMyWayActive ? (
            <View style={{ marginTop: spacing[2] }}>
              <CartInputField
                label="ما الذي تريده من الكابتن في طريقه؟"
                value={onMyWayNote}
                onChangeText={setOnMyWayNote}
                placeholder="مثال: ماء معدني، بطاقة شحن، علكة..."
              />
            </View>
          ) : null}
        </Surface>

        <PaymentDecisionSection
          paymentMethod={wltPayment.paymentMethod}
          options={wltPayment.paymentDecisionOptions}
          onSelectMethod={wltPayment.setPaymentMethod}
        />

        {validationMessageText ? <Text role="caption" style={styles.errorText}>{validationMessageText}</Text> : null}
        {checkoutState && (checkoutState.kind === "error" || checkoutState.kind === "order_error") ? (
          <Text role="caption" style={styles.errorText}>{checkoutState.message || "تعذر إتمام الطلب، يرجى المحاولة مرة أخرى."}</Text>
        ) : null}

        <CartQuoteSummary
          quote={cart?.quote ?? null}
          fulfillmentMode={activeFulfillmentMode}
        />

        <Button
          label={
            checkoutState?.kind === "loading" || checkoutState?.kind === "confirming" || checkoutState?.kind === "creating_order"
              ? "جاري تأكيد الطلب…"
              : requiresDeliveryAddress
                ? "تأكيد الطلب والتوصيل"
                : "تأكيد الطلب للاستلام الذاتي"
          }
          tone="brand"
          loading={checkoutState?.kind === "loading" || checkoutState?.kind === "confirming" || checkoutState?.kind === "creating_order"}
          disabled={!cart || cart.items.length === 0}
          onPress={proceed}
        />
      </ScrollScreen>

      {controller.action === "conflict" && (
        <CartConflictSheet
          onKeepServer={() => {
            controller.clearOfflineQueue();
            controller.retry();
          }}
          onReviewOffline={() => {
            controller.clearOfflineQueue();
            controller.retry();
          }}
        />
      )}
    </View>
  );
}

function CartInputField({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "sentences",
  multiline = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly autoCapitalize?: "none" | "sentences" | "characters";
  readonly multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text role="caption" weight="bold" style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colorRoles.textMuted}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlign="right"
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorRoles.surfaceWarm },
  content: { padding: spacing[2], paddingBottom: spacing[10], gap: 8 },
  richSection: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: alpha(colorRoles.brandAction, 0.08),
    backgroundColor: colorRoles.surfaceBase,
    gap: 6,
  },
  richSectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  richIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: alpha(colorRoles.brandAction, 0.08),
    alignItems: "center",
    justifyContent: "center",
  },
  richSectionTitle: {
    color: colorRoles.brandStructure,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "bold",
  },
  richInputRow: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
  },
  mutedText: { color: colorRoles.textSecondary, textAlign: "right", fontSize: 11, lineHeight: 16 },
  field: { gap: 4 },
  fieldLabel: { color: colorRoles.textPrimary, textAlign: "right", fontSize: 11 },
  input: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    color: colorRoles.textPrimary,
    backgroundColor: colorRoles.surfaceBase,
  },
  multilineInput: { minHeight: 52, textAlignVertical: "top" },
  errorText: { color: colorRoles.danger, textAlign: "right", fontSize: 11, lineHeight: 16 },
});
