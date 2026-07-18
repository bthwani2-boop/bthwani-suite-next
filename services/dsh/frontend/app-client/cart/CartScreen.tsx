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
import type { DshCart, DshFulfillmentMode } from "../../shared/cart";
import type { DshPaymentMethod } from "../../shared/checkout";
import { useWltDshPaymentController } from "../../shared/finance-wlt-link";
import { PaymentDecisionSection } from "./PaymentDecisionSection";

type Props = {
  readonly storeId: string;
  readonly serviceAreaCode: string;
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

type CoordinateInput = {
  readonly latitude?: number;
  readonly longitude?: number;
};

function parseCoordinates(latitudeText: string, longitudeText: string): CoordinateInput | null {
  const latitudeValue = latitudeText.trim();
  const longitudeValue = longitudeText.trim();

  if (!latitudeValue && !longitudeValue) return {};
  if (!latitudeValue || !longitudeValue) return null;

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

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

export function CartScreen({
  storeId,
  serviceAreaCode,
  authKind = "unauthenticated",
  onProceedToCheckout,
  onBrowseCatalog,
  onBack,
}: Props) {
  const controller = useCartController(storeId, authKind);
  const serviceabilityController = useServiceabilityController();
  const wltPayment = useWltDshPaymentController();
  const [address, setAddress] = useState("");
  const [areaCode, setAreaCode] = useState(serviceAreaCode);
  const [latitudeText, setLatitudeText] = useState("");
  const [longitudeText, setLongitudeText] = useState("");
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    setAreaCode(serviceAreaCode);
    serviceabilityController.reset();
  }, [serviceAreaCode, serviceabilityController.reset]);

  const cart = controller.state.kind === "success" ? controller.state.cart : null;
  const requiresDeliveryAddress = cart?.fulfillmentMode !== "pickup";
  const actionPending = controller.action === "submitting";

  const canProceed = useMemo(() => {
    if (!cart || actionPending) return false;
    if (!requiresDeliveryAddress) return true;
    return (
      address.trim().length >= 5 &&
      areaCode.trim().length > 0 &&
      serviceabilityController.serviceability.kind === "serviceable"
    );
  }, [
    cart,
    actionPending,
    requiresDeliveryAddress,
    address,
    areaCode,
    serviceabilityController.serviceability.kind,
  ]);

  const checkServiceability = () => {
    setValidationMessage(null);
    if (!address.trim()) {
      setValidationMessage("أدخل عنوان التسليم قبل التحقق من الخدمة.");
      return;
    }
    if (!areaCode.trim()) {
      setValidationMessage("أدخل رمز منطقة الخدمة.");
      return;
    }
    const coordinates = parseCoordinates(latitudeText, longitudeText);
    if (coordinates === null) {
      setValidationMessage(
        "أدخل خط العرض وخط الطول معًا بقيم صحيحة، أو اتركهما فارغين.",
      );
      return;
    }

    void serviceabilityController.check(
      storeId,
      areaCode.trim(),
      coordinates.latitude,
      coordinates.longitude,
    );
  };

  const proceed = () => {
    if (!cart || !onProceedToCheckout) return;
    setValidationMessage(null);

    if (requiresDeliveryAddress && !canProceed) {
      setValidationMessage(
        "يجب إدخال العنوان ونجاح التحقق من قابلية الخدمة قبل checkout.",
      );
      return;
    }

    onProceedToCheckout(
      cart,
      requiresDeliveryAddress ? address.trim() : "",
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
            ? {
                actionLabel: "تصفح المنتجات",
                onActionPress: onBrowseCatalog,
              }
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
        <Surface tone="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text role="bodyStrong" style={styles.sectionTitle}>
              المنتجات
            </Text>
            <Badge
              label={fulfillmentLabel(controller.state.cart.fulfillmentMode)}
              tone="info"
            />
          </View>

          {controller.state.cart.items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemText}>
                <Text role="bodyStrong" style={styles.itemTitle}>
                  {item.productName}
                </Text>
                <ServerPrice value={item.unitPrice} />
                <Text role="caption" style={styles.mutedText}>
                  الكمية الحالية: {item.quantity}
                </Text>
              </View>

              <View style={styles.itemActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`زيادة كمية ${item.productName}`}
                  disabled={actionPending}
                  style={styles.quantityButton}
                  onPress={() =>
                    void controller.updateItemQuantity(
                      item.masterProductId,
                      item.productName,
                      item.quantity + 1,
                      item.priceReference,
                    )
                  }
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`تقليل كمية ${item.productName}`}
                  disabled={actionPending}
                  style={styles.quantityButton}
                  onPress={() =>
                    void controller.updateItemQuantity(
                      item.masterProductId,
                      item.productName,
                      item.quantity - 1,
                      item.priceReference,
                    )
                  }
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </Pressable>
                <Button
                  label="حذف"
                  tone="secondary"
                  size="sm"
                  disabled={actionPending}
                  onPress={() =>
                    void controller.removeItem(controller.state.cart.id, item.id)
                  }
                />
              </View>
            </View>
          ))}

          <Button
            label="إفراغ السلة"
            tone="secondary"
            disabled={actionPending}
            onPress={() => void controller.clear(controller.state.cart)}
          />

          {controller.action === "error" ? (
            <Text role="caption" style={styles.errorText}>
              تعذر تنفيذ تعديل السلة. أعد المحاولة.
            </Text>
          ) : null}
        </Surface>

        {requiresDeliveryAddress ? (
          <Surface tone="default" style={styles.section}>
            <Text role="bodyStrong" style={styles.sectionTitle}>
              عنوان التسليم ونطاق الخدمة
            </Text>
            <Text role="caption" style={styles.mutedText}>
              لا توجد خريطة أو عناوين محلية مزيفة. أدخل بيانات الموقع الفعلية،
              ثم نفّذ فحص DSH.
            </Text>

            <Field
              label="العنوان الوصفي"
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                serviceabilityController.reset();
              }}
              placeholder="الحي، الشارع، أقرب معلم"
            />
            <Field
              label="رمز منطقة الخدمة"
              value={areaCode}
              onChangeText={(value) => {
                setAreaCode(value);
                serviceabilityController.reset();
              }}
              placeholder="مثال: haddah"
              autoCapitalize="none"
            />
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateField}>
                <Field
                  label="خط العرض — اختياري"
                  value={latitudeText}
                  onChangeText={(value) => {
                    setLatitudeText(value);
                    serviceabilityController.reset();
                  }}
                  placeholder="15.35"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.coordinateField}>
                <Field
                  label="خط الطول — اختياري"
                  value={longitudeText}
                  onChangeText={(value) => {
                    setLongitudeText(value);
                    serviceabilityController.reset();
                  }}
                  placeholder="44.18"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Button
              label={
                serviceabilityController.serviceability.kind === "checking"
                  ? "جاري التحقق…"
                  : "تحقق من قابلية الخدمة"
              }
              tone="secondary"
              disabled={
                serviceabilityController.serviceability.kind === "checking"
              }
              onPress={checkServiceability}
            />

            <ServiceabilityStatus
              state={serviceabilityController.serviceability}
            />
          </Surface>
        ) : (
          <Surface tone="default" style={styles.section}>
            <Text role="bodyStrong" style={styles.sectionTitle}>
              الاستلام الذاتي
            </Text>
            <Text role="caption" style={styles.mutedText}>
              لا يلزم عنوان تسليم أو فحص منطقة؛ سيُثبت checkout تعليمات الاستلام
              من المتجر.
            </Text>
          </Surface>
        )}

        <Surface tone="default" style={styles.section}>
          <Text role="bodyStrong" style={styles.sectionTitle}>
            تفاصيل إضافية
          </Text>
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

        {validationMessage ? (
          <Text role="caption" style={styles.errorText}>
            {validationMessage}
          </Text>
        ) : null}

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
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly keyboardType?: "default" | "decimal-pad";
  readonly autoCapitalize?: "none" | "sentences" | "characters";
  readonly multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text role="caption" weight="bold" style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colorRoles.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlign="right"
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function ServiceabilityStatus({
  state,
}: {
  readonly state:
    | { readonly kind: "idle" }
    | { readonly kind: "checking" }
    | { readonly kind: "serviceable" }
    | {
        readonly kind: "blocked";
        readonly code: string;
        readonly reason?: string;
      }
    | { readonly kind: "error"; readonly message: string };
}) {
  switch (state.kind) {
    case "idle":
      return (
        <Text role="caption" style={styles.mutedText}>
          لم يتم التحقق بعد.
        </Text>
      );
    case "checking":
      return (
        <Text role="caption" style={styles.mutedText}>
          يجري التحقق من DSH…
        </Text>
      );
    case "serviceable":
      return <Badge label="الخدمة متاحة" tone="success" />;
    case "blocked":
      return (
        <Text role="caption" style={styles.errorText}>
          الخدمة غير متاحة: {state.reason ?? state.code}
        </Text>
      );
    case "error":
      return (
        <Text role="caption" style={styles.errorText}>
          {state.message}
        </Text>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  section: {
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
  },
  sectionTitle: {
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
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
  mutedText: {
    color: colorRoles.textSecondary,
    textAlign: "right",
    lineHeight: 19,
  },
  itemActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[2],
  },
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
  quantityButtonText: {
    color: colorRoles.brandStructure,
    fontSize: 20,
    fontWeight: "900",
  },
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
  coordinateRow: {
    flexDirection: "row-reverse",
    gap: spacing[2],
  },
  coordinateField: { flex: 1 },
  errorText: {
    color: colorRoles.danger,
    textAlign: "right",
    lineHeight: 19,
  },
});
