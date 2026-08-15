import React from "react";
import { StyleSheet, View } from "react-native";
import { Badge, Button, StateView, Surface, Text, colorRoles, radius, spacing } from "@bthwani/ui-kit";
import type { DshClientAddress } from "../../shared/client-address";
import type { DshCart, DshServiceabilityState } from "../../shared/cart";

export function AddressSummary({ address }: { readonly address: DshClientAddress }) {
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
      ) : null}
    </View>
  );
}

export function ServiceabilityStatus({ state }: { readonly state: DshServiceabilityState }) {
  switch (state.kind) {
    case "idle":
      return <Text role="caption" style={styles.mutedText}>لم يتم التحقق بعد.</Text>;
    case "checking":
      return <Text role="caption" style={styles.mutedText}>يجري التحقق من تغطية العنوان…</Text>;
    case "serviceable":
      return (
        <View style={styles.policyBox}>
          <Badge label="الخدمة متاحة لهذا العنوان" tone="success" />
          <OperationalPolicyDetails result={state.result} />
        </View>
      );
    case "blocked":
      const reasonText = state.reason === "routing provider could not estimate ETA" 
        ? "تعذر تقدير وقت التوصيل في الوقت الحالي" 
        : (state.reason ?? state.code);
      return (
        <View style={styles.policyBox}>
          <Text role="caption" style={styles.errorText}>
            الخدمة غير متاحة: {reasonText}
          </Text>
          <OperationalPolicyDetails result={state.result} />
        </View>
      );
    case "error":
      return <Text role="caption" style={styles.errorText}>{state.message}</Text>;
  }
}

export function OperationalPolicyDetails({
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

export function CartAddressSection({
  requiresDeliveryAddress,
  selectedAddress,
  cart,
  storeId,
  serviceabilityState,
  onManageAddresses,
  onCheckServiceability,
}: {
  readonly requiresDeliveryAddress: boolean;
  readonly selectedAddress: DshClientAddress | null;
  readonly cart: DshCart | null;
  readonly storeId: string;
  readonly serviceabilityState: DshServiceabilityState;
  readonly onManageAddresses?: (() => void) | undefined;
  readonly onCheckServiceability: (storeId: string, addressId: string, mode: DshCart["fulfillmentMode"]) => void;
}) {
  if (!requiresDeliveryAddress) {
    return (
      <Surface tone="default" style={styles.section}>
        <Text role="bodyStrong" style={styles.sectionTitle}>الاستلام الذاتي</Text>
        <Text role="caption" style={styles.mutedText}>
          لا يلزم عنوان تسليم؛ يمكنك استلام الطلب مباشرة من المتجر.
        </Text>
      </Surface>
    );
  }

  return (
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
          <ServiceabilityStatus state={serviceabilityState} />
          {serviceabilityState.kind === "blocked" || serviceabilityState.kind === "error" ? (
            <Button
              label="إعادة فحص قابلية الخدمة"
              tone="secondary"
              onPress={() => onCheckServiceability(
                storeId,
                selectedAddress.id,
                cart.fulfillmentMode,
              )}
            />
          ) : null}
        </>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  sectionTitle: { color: colorRoles.textPrimary, textAlign: "right", fontSize: 13, fontWeight: "bold" },
  addressSummary: { gap: 4 },
  mutedText: { color: colorRoles.textSecondary, textAlign: "right", fontSize: 11, lineHeight: 15 },
  errorText: { color: colorRoles.danger, textAlign: "right", fontSize: 11, lineHeight: 15 },
  policyBox: { gap: 4, alignItems: "flex-end" },
  policyDetails: { gap: 2, alignItems: "flex-end" },
});
