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
  DshServiceabilityState,
} from "../../shared/cart";
import type { DshPaymentMethod } from "../../shared/checkout";
import type { DshClientAddress } from "../../shared/client-address";
import { useWltDshPaymentController } from "../../shared/finance-wlt-link";
import { PaymentDecisionSection } from "./PaymentDecisionSection";

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

function ServerPrice({ value }: { readonly value: number }) {
  return (
    <Text role="caption" style={styles.priceText}>
      سعر الوحدة المثبت: {new Intl.NumberFormat("ar").format(value)} د.ي
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
      return "تغير سعر التشكيلة منذ إضافة المنتج. اعتمد السعر الحالي صراحةً قبل المتابعة.";
    case "unavailable":
      return "أوقف المتجر توفر هذا المنتج. احذفه أو أعد المحاولة بعد عودته.";
    case "assortment_unavailable":
      return "لم يعد المنتج ضمن تشكيلة هذا المتجر.";
    case "assortment_changed":
      return "تغير مرجع تشكيلة المتجر. حدّث السطر قبل المتابعة.";
    case "unpriced":
      return "لا يوجد سعر تشغيلي صالح لهذا المنتج.";
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
      {validation.status === "price_changed" && validation.currentUnitPrice !== undefined ? (
        <>
          <Text role="caption" style={styles.mutedText}>
            السعر الحالي: {new Intl.NumberFormat("ar").format(validation.currentUnitPrice)} د.ي
          </Text>
          <Button
            label="اعتماد السعر الحالي"
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

export function CartScreen({
  storeId,
  selectedAddress,
  authKind = "unauthenticated",
  onProceedToCheckout,
  onManageAddresses,
  onBrowseCatalog,
  onBack,
}: Props) {
  const controller = useCartController(storeId, authKind);
  const serviceabilityController = useServiceabilityController();
  const wltPayment = useWltDshPaymentController();
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
      setValidationMessageText("راجع تغيرات السعر أو التوفر في عناصر السلة قبل checkout.");
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
        <TopBar title="السلة" {...(onBack ? { onBack } : {})} />
        <LoadingState title="جاري تحميل السلة…" />
      </View>
    );
  }

  if (controller.state.kind === "offline") {
    return (
      <View style={styles.container}>
        <TopBar title="السلة" {...(onBack ? { onBack } : {})} />
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
        <TopBar title="السلة" {...(onBack ? { onBack } : {})} />
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
        <TopBar title="السلة" {...(onBack ? { onBack } : {})} />
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
        <TopBar title="السلة" {...(onBack ? { onBack } : {})} />
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
        title="السلة"
        subtitle={`${controller.state.cart.items.length} منتج`}
        {...(onBack ? { onBack } : {})}
      />

      <ScrollScreen contentContainerStyle={styles.content}>
        {!cartReady ? (
          <Surface tone="default" style={styles.alertSection}>
            <Text role="bodyStrong" style={styles.errorText}>تحتاج السلة إلى مراجعة</Text>
            <Text role="caption" style={styles.mutedText}>
              اكتشف DSH تغيرًا في السعر أو التوفر أو مرجع التشكيلة. لم تُعدّل اللقطة القديمة تلقائيًا.
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
                  <ServerPrice value={item.unitPrice} />
                  <Text role="caption" style={styles.mutedText}>الكمية الحالية: {item.quantity}</Text>
                  <Text role="caption" style={styles.mutedText}>
                    مرجع التشكيلة: {item.storeAssortmentId ?? "غير مرتبط"}
                  </Text>
                </View>
                <CartItemValidationNotice
                  validation={validation}
                  disabled={actionPending}
                  onAcceptCurrentPrice={() => void controller.updateItemQuantity(
                    item.masterProductId,
                    item.productName,
                    item.quantity,
                    item.priceReference,
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

        <Button
          label="متابعة إلى مراجعة checkout"
          tone="primary"
          disabled={!canProceed || !onProceedToCheckout}
          onPress={proceed}
        />
      </ScrollScreen>
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
      <Text role="caption" style={styles.mutedText}>
        حالة السعة: {result.capacityState} · الطلبات النشطة: {result.activeOrders}
        {result.maxConcurrentOrders !== undefined ? ` / ${result.maxConcurrentOrders}` : ""}
      </Text>
      {result.capacityLoadRatio !== undefined ? (
        <Text role="caption" style={styles.mutedText}>
          نسبة الحمل: {Math.round(result.capacityLoadRatio * 100)}%
        </Text>
      ) : null}
      {result.slaConfigured ? (
        <Text role="caption" style={styles.mutedText}>
          SLA: تجهيز {result.slaPrepMinutes ?? "—"} دقيقة · توصيل {result.slaDeliveryMinutes ?? "—"} دقيقة
        </Text>
      ) : (
        <Text role="caption" style={styles.mutedText}>لا توجد قاعدة SLA مطابقة؛ الحالة معلنة وليست قيمة وهمية.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorRoles.surfaceWarm },
  content: { padding: spacing[4], paddingBottom: spacing[12], gap: spacing[4] },
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
