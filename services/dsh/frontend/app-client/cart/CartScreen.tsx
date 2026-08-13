import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import {
  Badge,
  Button,
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
  DshCartItemValidation,
  DshFulfillmentMode,
  DshPricingQuote,
  DshServiceabilityState,
} from "../../shared/cart";
import type { CheckoutToOrderFlowState, DshPaymentMethod } from "../../shared/checkout";
import type { DshClientAddress } from "../../shared/client-address";
import { formatWltMoney, useWltPaymentController } from "@bthwani/wlt/dsh";
import { PaymentDecisionSection } from "./PaymentDecisionSection";
import { CartConflictSheet } from "./CartConflictSheet";

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

// WltQuoteSummary renders the authoritative financial quote from WLT verbatim.
// DSH must never recompute, override, or locally sum these values.
function WltQuoteSummary({ quote }: { readonly quote: DshPricingQuote | null }) {
  if (!quote) return null;
  const { currency } = quote;
  const showDelivery = quote.deliveryFeeMinorUnits > 0;
  const showService = quote.serviceFeeMinorUnits > 0;
  const showTax = quote.taxMinorUnits > 0;
  const showDiscount = quote.discountMinorUnits > 0;
  const showRounding = quote.roundingMinorUnits !== 0;
  return (
    <Surface tone="default" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text role="bodyStrong" style={styles.sectionTitle}>ملخص السعر</Text>
        <Badge label="حُسب بواسطة WLT" tone="info" />
      </View>
      <View style={styles.quoteLine}>
        <Text role="bodySm" style={styles.mutedText}>المجموع الجزئي</Text>
        <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.subtotalMinorUnits, currency)}</Text>
      </View>
      {showDelivery && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>رسوم التوصيل</Text>
          <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.deliveryFeeMinorUnits, currency)}</Text>
        </View>
      )}
      {showService && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>رسوم الخدمة</Text>
          <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.serviceFeeMinorUnits, currency)}</Text>
        </View>
      )}
      {showTax && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>الضريبة</Text>
          <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.taxMinorUnits, currency)}</Text>
        </View>
      )}
      {showDiscount && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>الخصم</Text>
          <Text role="bodySm" style={[styles.quoteValue, styles.discountText]}>− {formatWltMoney(quote.discountMinorUnits, currency)}</Text>
        </View>
      )}
      {showRounding && (
        <View style={styles.quoteLine}>
          <Text role="bodySm" style={styles.mutedText}>تعديل التقريب</Text>
          <Text role="bodySm" style={styles.quoteValue}>{formatWltMoney(quote.roundingMinorUnits, currency)}</Text>
        </View>
      )}
      <View style={[styles.quoteLine, styles.quoteTotalLine]}>
        <Text role="bodyStrong" style={styles.sectionTitle}>الإجمالي</Text>
        <Text role="bodyStrong" style={styles.quoteTotalValue}>{formatWltMoney(quote.totalMinorUnits, currency)}</Text>
      </View>
      {quote.expiresAt ? (
        <Text role="caption" style={styles.mutedText}>
          صالح حتى: {new Date(quote.expiresAt).toLocaleTimeString("ar-SA")}
        </Text>
      ) : null}
    </Surface>
  );
}

function ServerPrice({ value, currency }: { readonly value: number; readonly currency: string }) {
  return (
    <Text role="caption" style={styles.priceText}>
      سعر الوحدة المثبت: {formatWltMoney(value, currency)}
    </Text>
  );
}

function AddressSummary({ address }: { readonly address: DshClientAddress }) {
  return (
    <View style={styles.addressSummary}>
      <View style={styles.sectionHeader}>
        <Badge label={address.isDefault ? "العنوان الافتراضي" : "عنوان الحساب"} tone="success" />
        <Text role="bodyStrong" style={styles.sectionTitle}>{address.label}</Text>
      </View>
      <Text role="bodySm" style={styles.mutedText}>{address.recipientName}</Text>
      <Text role="bodySm" style={styles.mutedText}>{address.addressLine}</Text>
      <Text role="caption" style={styles.mutedText}>
        {address.serviceAreaCode} · {address.phoneE164}
      </Text>
      {address.latitude !== null && address.longitude !== null ? (
        <Text role="caption" style={styles.mutedText}>
          الموقع المثبت: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
        </Text>
      ) : (
        <Text role="caption" style={styles.mutedText}>
          سيستخدم DSH رمز منطقة الخدمة المثبت في العنوان المملوك للحساب.
        </Text>
      )}
    </View>
  );
}

function validationMessage(validation: DshCartItemValidation): string {
  switch (validation.status) {
    case "price_changed":
      return validation.reasonCode === "CURRENCY_CHANGED"
        ? "تغيرت عملة تشكيلة المتجر منذ إضافة المنتج. اعتمد الحقيقة الحالية صراحةً قبل المتابعة."
        : "تغير سعر التشكيلة منذ إضافة المنتج. اعتمد السعر الحالي صراحةً قبل المتابعة.";
    case "unavailable":
      return "أوقف المتجر توفر هذا المنتج. احذفه أو أعد المحاولة بعد عودته.";
    case "assortment_unavailable":
      return "لم يعد المنتج ضمن تشكيلة هذا المتجر.";
    case "assortment_changed":
      return "تغير مرجع تشكيلة المتجر. حدّث السطر قبل المتابعة.";
    case "unpriced":
      return validation.reasonCode?.includes("CURRENCY")
        ? "لا توجد عملة تشغيلية صالحة لهذا المنتج."
        : "لا يوجد سعر تشغيلي صالح لهذا المنتج.";
    case "product_unlinked":
      return "فقد السطر ارتباطه بالمنتج المركزي.";
    case "ready":
      return "";
  }
}

function CartItemValidationNotice({
  validation,
  disabled,
  onAcceptCurrentPrice,
}: {
  readonly validation: DshCartItemValidation | undefined;
  readonly disabled: boolean;
  readonly onAcceptCurrentPrice: () => void;
}) {
  if (!validation || validation.status === "ready") return null;
  return (
    <View style={styles.validationBox}>
      <Text role="caption" style={styles.errorText}>{validationMessage(validation)}</Text>
      {validation.status === "price_changed" && validation.currentUnitPriceMinorUnits !== undefined ? (
        <>
          <Text role="caption" style={styles.mutedText}>
            الحقيقة الحالية: {formatWltMoney(validation.currentUnitPriceMinorUnits, validation.currentCurrency ?? validation.snapshotCurrency)}
          </Text>
          <Button
            label="اعتماد السعر والعملة الحاليين"
            tone="secondary"
            size="sm"
            disabled={disabled}
            onPress={onAcceptCurrentPrice}
          />
        </>
      ) : null}
    </View>
  );
}

function ConfirmationHero({
  itemCount,
  fulfillmentMode,
  ready,
}: {
  readonly itemCount: number;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly ready: boolean;
}) {
  return (
    <Surface tone={ready ? "action" : "warning"} style={styles.confirmationHero}>
      <View style={styles.heroBadgeRow}>
        <Badge label={ready ? "جاهز للتأكيد" : "تحتاج السلة إلى مراجعة"} tone={ready ? "success" : "warning"} />
        <Text role="caption" style={styles.heroMutedText}>{itemCount} منتج · {fulfillmentLabel(fulfillmentMode)}</Text>
      </View>
      <Text role="titleMd" style={styles.heroTitle}>راجع طلبك قبل الإرسال</Text>
      <Text role="bodySm" style={styles.heroText}>
        تحقق من المنتجات والعنوان وطريقة الدفع. لن يُنشأ الطلب إلا بعد ضغط زر التأكيد، ثم نفتح لك رحلة الطلب مباشرة.
      </Text>
    </Surface>
  );
}

function CheckoutProgress({
  state,
  onReset,
  onCancel,
  onRefresh,
  onRetryOrder,
}: {
  readonly state: CheckoutToOrderFlowState | undefined;
  readonly onReset?: (() => void) | undefined;
  readonly onCancel?: ((intentId: string) => void) | undefined;
  readonly onRefresh?: ((intentId: string) => void) | undefined;
  readonly onRetryOrder?: (() => void) | undefined;
}) {
  if (!state || state.kind === "idle" || state.kind === "order_ready") return null;
  if (state.kind === "loading" || state.kind === "creating_order") {
    return <StateView title={state.kind === "loading" ? "جارٍ تثبيت الطلب" : "جارٍ إنشاء الطلب"} description="نثبت السعر والعنوان والدفع ثم نقرأ حقيقة الطلب من DSH." loading />;
  }
  if (state.kind === "confirming" || state.kind === "reconciliation_pending") {
    return (
      <Surface tone="warning" style={styles.checkoutProgress}>
        <Text role="bodyStrong" style={styles.sectionTitle}>{state.kind === "confirming" ? "الدفع قيد المعالجة" : "نتحقق من نتيجة الدفع"}</Text>
        <Text role="caption" style={styles.mutedText}>لن نعيد إنشاء العملية تلقائيًا. حدّث الحالة أو ألغِ المحاولة بأمان.</Text>
        <View style={styles.progressActions}>
          <Button label="تحديث الحالة" tone="secondary" onPress={() => onRefresh?.(state.intent.id)} />
          <Button label="إلغاء والعودة للمراجعة" tone="secondary" onPress={() => onCancel?.(state.intent.id)} />
        </View>
      </Surface>
    );
  }
  const message = state.kind === "blocked_payment_unavailable"
    ? "خدمة WLT غير متاحة حاليًا. لم يُنشأ طلب."
    : state.kind === "out_of_area"
      ? "العنوان خارج نطاق الخدمة. غيّر العنوان ثم أعد المحاولة."
      : state.kind === "terminal"
        ? "انتهت جلسة الدفع أو فشلت. راجع بيانات السلة وأنشئ محاولة جديدة."
        : state.message;
  return (
    <Surface tone="danger" style={styles.checkoutProgress}>
      <Text role="bodyStrong" style={styles.sectionTitle}>لم يكتمل تأكيد الطلب</Text>
      <Text role="caption" style={styles.errorText}>{message}</Text>
      {state.kind === "order_error" && onRetryOrder ? <Button label="إعادة المحاولة الآمنة" tone="secondary" onPress={onRetryOrder} /> : null}
      {onReset ? <Button label="العودة إلى مراجعة السلة" tone="secondary" onPress={onReset} /> : null}
    </Surface>
  );
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
  const wltPayment = useWltPaymentController();
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [validationMessageText, setValidationMessageText] = useState<string | null>(null);

  const cart = controller.state.kind === "success" ? controller.state.cart : null;
  const requiresDeliveryAddress = cart?.fulfillmentMode !== "pickup";
  const actionPending = controller.action === "submitting";
  const cartReady = cart?.validation?.ready !== false;
  const validationByItemId = useMemo(
    () => new Map((cart?.validation?.items ?? []).map((item) => [item.itemId, item])),
    [cart?.validation?.items],
  );

  useEffect(() => {
    serviceabilityController.reset();
    if (!cart || cart.fulfillmentMode === "pickup" || !selectedAddress) return;
    void serviceabilityController.check(storeId, selectedAddress.id, cart.fulfillmentMode);
  }, [
    cart?.fulfillmentMode,
    selectedAddress?.id,
    selectedAddress?.version,
    serviceabilityController.check,
    serviceabilityController.reset,
    storeId,
  ]);

  const canProceed = useMemo(() => {
    if (!cart || actionPending || !cartReady) return false;
    if (!requiresDeliveryAddress) return true;
    return Boolean(
      selectedAddress &&
      serviceabilityController.serviceability.kind === "serviceable",
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
    setValidationMessageText(null);
    if (!cartReady) {
      setValidationMessageText("راجع تغيرات السعر أو العملة أو التوفر في عناصر السلة قبل checkout.");
      return;
    }
    if (requiresDeliveryAddress && !selectedAddress) {
      setValidationMessageText("اختر عنوانًا افتراضيًا من دفتر العناوين قبل checkout.");
      return;
    }
    if (requiresDeliveryAddress && serviceabilityController.serviceability.kind !== "serviceable") {
      setValidationMessageText("يجب نجاح فحص DSH للعنوان والسعة وSLA قبل checkout.");
      return;
    }
    if (requiresDeliveryAddress && serviceabilityController.serviceability.kind === "serviceable") {
      const expiresAt = serviceabilityController.serviceability.result.expiresAt;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        setValidationMessageText("انتهت صلاحية وقت التوصيل (ETA). يرجى تحديث الصفحة لإعادة حسابه.");
        return;
      }
    }
    onProceedToCheckout(
      cart,
      requiresDeliveryAddress ? selectedAddress?.id ?? "" : "",
      note.trim(),
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
          title="لا يوجد اتصال بالشبكة"
          description="تعذر الوصول إلى DSH. تحقق من الشبكة ثم أعد المحاولة."
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
          description="سجّل الدخول للوصول إلى السلة المحفوظة في DSH."
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
        <ConfirmationHero
          itemCount={controller.state.cart.items.length}
          fulfillmentMode={controller.state.cart.fulfillmentMode}
          ready={cartReady}
        />

        <CheckoutProgress
          state={checkoutState}
          {...(onResetCheckout ? { onReset: onResetCheckout } : {})}
          {...(onCancelCheckout ? { onCancel: onCancelCheckout } : {})}
          {...(onRefreshCheckout ? { onRefresh: onRefreshCheckout } : {})}
          {...(onRetryOrder ? { onRetryOrder } : {})}
        />

        {!cartReady ? (
          <Surface tone="default" style={styles.alertSection}>
            <Text role="bodyStrong" style={styles.errorText}>تحتاج السلة إلى مراجعة</Text>
            <Text role="caption" style={styles.mutedText}>
              اكتشف DSH تغيرًا في السعر أو العملة أو التوفر أو مرجع التشكيلة. لم تُعدّل اللقطة القديمة تلقائيًا.
            </Text>
          </Surface>
        ) : null}

        <Surface tone="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text role="bodyStrong" style={styles.sectionTitle}>المنتجات</Text>
            <Badge label={fulfillmentLabel(controller.state.cart.fulfillmentMode)} tone="info" />
          </View>

          {controller.state.cart.items.map((item) => {
            const validation = validationByItemId.get(item.id);
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemText}>
                  <Text role="bodyStrong" style={styles.itemTitle}>{item.productName}</Text>
                  <ServerPrice value={item.unitPriceMinorUnits} currency={item.currency} />
                  {item.options && item.options.length > 0 ? (
                    <Text role="caption" style={styles.mutedText}>
                      الخيارات: {item.options.join("، ")}
                    </Text>
                  ) : null}
                  {item.note ? (
                    <Text role="caption" style={styles.mutedText}>
                      ملاحظة: {item.note}
                    </Text>
                  ) : null}
                  <Text role="caption" style={styles.mutedText}>الكمية الحالية: {item.quantity}</Text>
                </View>
                <CartItemValidationNotice
                  validation={validation}
                  disabled={actionPending}
                  onAcceptCurrentPrice={() => void controller.updateItemQuantity(
                    item.masterProductId,
                    item.productName,
                    item.quantity,
                    item.priceReference,
                    item.options,
                    item.note,
                  )}
                />
                <View style={styles.itemActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`زيادة كمية ${item.productName}`}
                    disabled={actionPending}
                    style={styles.quantityButton}
                    onPress={() => void controller.updateItemQuantity(
                      item.masterProductId,
                      item.productName,
                      item.quantity + 1,
                      item.priceReference,
                      item.options,
                      item.note,
                    )}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`تقليل كمية ${item.productName}`}
                    disabled={actionPending}
                    style={styles.quantityButton}
                    onPress={() => void controller.updateItemQuantity(
                      item.masterProductId,
                      item.productName,
                      item.quantity - 1,
                      item.priceReference,
                      item.options,
                      item.note,
                    )}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </Pressable>
                  <Button
                    label="حذف"
                    tone="secondary"
                    size="sm"
                    disabled={actionPending}
                    onPress={() => void controller.removeItem(item.cartId, item.id)}
                  />
                </View>
              </View>
            );
          })}

          <Button
            label="إفراغ السلة"
            tone="secondary"
            disabled={actionPending}
            onPress={() => { if (cart) void controller.clear(cart); }}
          />
          {controller.action === "error" ? (
            <Text role="caption" style={styles.errorText}>
              {controller.actionError ?? "تعذر تنفيذ تعديل السلة. أعد المحاولة."}
            </Text>
          ) : null}
        </Surface>

        {requiresDeliveryAddress ? (
          <Surface tone="default" style={styles.section}>
            <Text role="bodyStrong" style={styles.sectionTitle}>عنوان التسليم ونطاق الخدمة</Text>
            {selectedAddress ? (
              <AddressSummary address={selectedAddress} />
            ) : (
              <StateView
                title="لا يوجد عنوان افتراضي"
                description="أنشئ عنوانًا مملوكًا لحسابك وحدده كافتراضي قبل متابعة طلب التوصيل."
                {...(onManageAddresses
                  ? { actionLabel: "إدارة العناوين", onActionPress: onManageAddresses }
                  : {})}
              />
            )}
            {selectedAddress && cart ? (
              <>
                <Button
                  label="تغيير العنوان"
                  tone="secondary"
                  {...(onManageAddresses ? { onPress: onManageAddresses } : { disabled: true })}
                />
                <ServiceabilityStatus state={serviceabilityController.serviceability} />
                {serviceabilityController.serviceability.kind === "blocked" ||
                serviceabilityController.serviceability.kind === "error" ? (
                  <Button
                    label="إعادة فحص قابلية الخدمة"
                    tone="secondary"
                    onPress={() => void serviceabilityController.check(
                      storeId,
                      selectedAddress.id,
                      cart.fulfillmentMode,
                    )}
                  />
                ) : null}
              </>
            ) : null}
          </Surface>
        ) : (
          <Surface tone="default" style={styles.section}>
            <Text role="bodyStrong" style={styles.sectionTitle}>الاستلام الذاتي</Text>
            <Text role="caption" style={styles.mutedText}>
              لا يلزم عنوان تسليم؛ سيُثبت checkout تعليمات الاستلام من المتجر.
            </Text>
          </Surface>
        )}

        <Surface tone="default" style={styles.section}>
          <Text role="bodyStrong" style={styles.sectionTitle}>تفاصيل إضافية</Text>
          <Field
            label="رمز القسيمة — اختياري"
            value={couponCode}
            onChangeText={setCouponCode}
            placeholder="أدخل الرمز كما استلمته"
            autoCapitalize="characters"
          />
          <Field
            label="ملاحظة الطلب — اختيارية"
            value={note}
            onChangeText={setNote}
            placeholder="تعليمات واضحة للشريك أو الموصّل"
            multiline
          />
        </Surface>

        <PaymentDecisionSection
          paymentMethod={wltPayment.paymentMethod}
          options={wltPayment.paymentDecisionOptions}
          onSelectMethod={wltPayment.setPaymentMethod}
        />

        {validationMessageText ? <Text role="caption" style={styles.errorText}>{validationMessageText}</Text> : null}

        <WltQuoteSummary quote={cart?.quote ?? null} />

        <Surface tone="default" style={styles.confirmationPolicy}>
          <Text role="bodyStrong" style={styles.sectionTitle}>قبل تأكيد الطلب</Text>
          <Text role="caption" style={styles.mutedText}>
            السعر والتوفر ورسوم التنفيذ تُثبت من المصادر المعتمدة عند إنشاء الطلب. إذا تغيرت الحقيقة أثناء التأكيد سيبقى الطلب مفتوحًا للمراجعة ولن يظهر كأنه أُنشئ بنجاح.
          </Text>
        </Surface>

        <Button
          label="تأكيد الطلب وإرساله"
          tone="primary"
          disabled={!canProceed || !onProceedToCheckout || (checkoutState !== undefined && checkoutState.kind !== "idle" && checkoutState.kind !== "order_ready")}
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

function Field({
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
      <Text role="caption" weight="bold" style={styles.fieldLabel}>{label}</Text>
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

function ServiceabilityStatus({ state }: { readonly state: DshServiceabilityState }) {
  switch (state.kind) {
    case "idle":
      return <Text role="caption" style={styles.mutedText}>لم يتم التحقق بعد.</Text>;
    case "checking":
      return <Text role="caption" style={styles.mutedText}>يجري التحقق من العنوان والسعة وSLA في DSH…</Text>;
    case "serviceable":
      return (
        <View style={styles.policyBox}>
          <Badge label="الخدمة متاحة لهذا العنوان" tone="success" />
          <OperationalPolicyDetails result={state.result} />
        </View>
      );
    case "blocked":
      return (
        <View style={styles.policyBox}>
          <Text role="caption" style={styles.errorText}>
            الخدمة غير متاحة: {state.reason ?? state.code}
          </Text>
          <OperationalPolicyDetails result={state.result} />
        </View>
      );
    case "error":
      return <Text role="caption" style={styles.errorText}>{state.message}</Text>;
  }
}

function OperationalPolicyDetails({
  result,
}: {
  readonly result: Extract<DshServiceabilityState, { kind: "serviceable" | "blocked" }>["result"];
}) {
  return (
    <View style={styles.policyDetails}>
      {result.etaWindow ? (
        <Text role="caption" style={styles.mutedText}>
          الوقت التقديري للتوصيل: {result.etaWindow.minMinutes} إلى {result.etaWindow.maxMinutes} دقيقة
        </Text>
      ) : null}
      {result.quoteVersion ? (
        <Text role="caption" style={styles.mutedText}>
          رقم التسعيرة: {result.quoteVersion.split("-")[0]} · صالح حتى: {result.expiresAt ? new Date(result.expiresAt).toLocaleTimeString("ar-SA") : "—"}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorRoles.surfaceWarm },
  content: { padding: spacing[4], paddingBottom: spacing[12], gap: spacing[4] },
  confirmationHero: {
    padding: spacing[4],
    borderRadius: radius.lg,
    gap: spacing[2],
  },
  heroBadgeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  heroTitle: { color: colorRoles.surfaceBase, textAlign: "right" },
  heroText: { color: colorRoles.surfaceBase, textAlign: "right", lineHeight: 22 },
  heroMutedText: { color: alpha(colorRoles.surfaceBase, 0.82), textAlign: "right" },
  section: {
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    gap: spacing[3],
  },
  alertSection: {
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.danger,
    backgroundColor: alpha(colorRoles.danger, 0.06),
    gap: spacing[2],
  },
  confirmationPolicy: {
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    gap: spacing[2],
  },
  checkoutProgress: {
    padding: spacing[4],
    borderRadius: radius.md,
    gap: spacing[2],
  },
  progressActions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  quoteLine: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quoteValue: { color: colorRoles.textPrimary, textAlign: "left" },
  discountText: { color: colorRoles.success },
  quoteTotalLine: {
    borderTopWidth: 1,
    borderTopColor: colorRoles.borderSubtle,
    paddingTop: spacing[2],
    marginTop: spacing[1],
  },
  quoteTotalValue: { color: colorRoles.brandAction, fontSize: 17 },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
  },
  sectionTitle: { color: colorRoles.textPrimary, textAlign: "right" },
  addressSummary: { gap: spacing[2] },
  itemCard: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: spacing[3],
    backgroundColor: alpha(colorRoles.surfaceWarm, 0.5),
  },
  itemText: { alignItems: "flex-end", gap: 3 },
  itemTitle: { color: colorRoles.textPrimary, textAlign: "right" },
  priceText: { color: colorRoles.brandAction, textAlign: "right" },
  mutedText: { color: colorRoles.textSecondary, textAlign: "right", lineHeight: 19 },
  validationBox: {
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.danger,
    backgroundColor: alpha(colorRoles.danger, 0.05),
  },
  policyBox: { gap: spacing[2], alignItems: "flex-end" },
  policyDetails: { gap: spacing[1], alignItems: "flex-end" },
  itemActions: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[2] },
  quantityButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceBase,
  },
  quantityButtonText: { color: colorRoles.brandStructure, fontSize: 20, fontWeight: "900" },
  field: { gap: 6 },
  fieldLabel: { color: colorRoles.textPrimary, textAlign: "right" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colorRoles.textPrimary,
    backgroundColor: colorRoles.surfaceBase,
  },
  multilineInput: { minHeight: 84, textAlignVertical: "top" },
  errorText: { color: colorRoles.danger, textAlign: "right", lineHeight: 19 },
});
