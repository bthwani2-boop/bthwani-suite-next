import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import {
  Badge,
  Button,
  Card,
  StateView,
  Text,
  TextField,
  TopBar,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
  useClientAddressController,
  validateClientAddressDraft,
  type DshClientAddress,
  type DshClientAddressDraft,
} from "../../shared/client-address";
import {
  useClientMapController,
  type DshVerifiedMapLocation,
} from "../../shared/client-map";

export type AddressLocationScreenProps = {
  readonly onBack?: () => void;
  readonly onOpenCheckout?: () => void;
};

type EditableDraft = {
  label: string;
  recipientName: string;
  phoneE164: string;
  addressLine: string;
  serviceAreaCode: string;
  building: string;
  floor: string;
  unit: string;
  deliveryInstructions: string;
  latitude: number | null;
  longitude: number | null;
  makeDefault: boolean;
};

const EMPTY_DRAFT: EditableDraft = {
  label: "",
  recipientName: "",
  phoneE164: "+967",
  addressLine: "",
  serviceAreaCode: "",
  building: "",
  floor: "",
  unit: "",
  deliveryInstructions: "",
  latitude: null,
  longitude: null,
  makeDefault: false,
};

function draftFromAddress(address: DshClientAddress): EditableDraft {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phoneE164: address.phoneE164,
    addressLine: address.addressLine,
    serviceAreaCode: address.serviceAreaCode,
    building: address.building ?? "",
    floor: address.floor ?? "",
    unit: address.unit ?? "",
    deliveryInstructions: address.deliveryInstructions ?? "",
    latitude: address.latitude,
    longitude: address.longitude,
    makeDefault: address.isDefault,
  };
}

function toInput(draft: EditableDraft): DshClientAddressDraft {
  return {
    label: draft.label.trim(),
    recipientName: draft.recipientName.trim(),
    phoneE164: draft.phoneE164.trim(),
    addressLine: draft.addressLine.trim(),
    serviceAreaCode: draft.serviceAreaCode.trim(),
    ...(draft.building.trim() ? { building: draft.building.trim() } : {}),
    ...(draft.floor.trim() ? { floor: draft.floor.trim() } : {}),
    ...(draft.unit.trim() ? { unit: draft.unit.trim() } : {}),
    ...(draft.deliveryInstructions.trim()
      ? { deliveryInstructions: draft.deliveryInstructions.trim() }
      : {}),
    ...(draft.latitude !== null && draft.longitude !== null
      ? { latitude: draft.latitude, longitude: draft.longitude }
      : {}),
    makeDefault: draft.makeDefault,
  };
}

function validateDraft(draft: EditableDraft): string | null {
  return validateClientAddressDraft(toInput(draft));
}

export function AddressLocationScreen({ onBack, onOpenCheckout }: AddressLocationScreenProps) {
  const controller = useClientAddressController();
  const mapController = useClientMapController();
  const [editing, setEditing] = React.useState<DshClientAddress | null>(null);
  const [draft, setDraft] = React.useState<EditableDraft>(EMPTY_DRAFT);
  const [showForm, setShowForm] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [capturingLocation, setCapturingLocation] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [mapQuery, setMapQuery] = React.useState("");

  const resetMap = React.useCallback(() => {
    setMapQuery("");
    mapController.clear();
  }, [mapController]);

  const beginCreate = () => {
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT, makeDefault: controller.addresses.length === 0 });
    setFormError(null);
    setLocationError(null);
    resetMap();
    setShowForm(true);
  };

  const beginEdit = (address: DshClientAddress) => {
    setEditing(address);
    setDraft(draftFromAddress(address));
    setFormError(null);
    setLocationError(null);
    resetMap();
    setShowForm(true);
  };

  const applyMapLocation = (location: DshVerifiedMapLocation): boolean => {
    if (!location.serviceAreaVerified || !location.serviceAreaCode) {
      setLocationError("الموقع موجود على الخريطة لكنه خارج مناطق الخدمة المعتمدة في DSH.");
      return false;
    }
    setDraft((current) => ({
      ...current,
      addressLine: location.displayName,
      serviceAreaCode: location.serviceAreaCode ?? "",
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    setLocationError(null);
    setFormError(null);
    setMapQuery(location.displayName);
    return true;
  };

  const captureLocation = async () => {
    setCapturingLocation(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationError("صلاحية الموقع مطلوبة لالتقاط الإحداثيات.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (position.mocked === true) {
        setLocationError("رفض DSH موقعًا صادرًا من مزود وهمي. استخدم موقع الجهاز الفعلي.");
        return;
      }
      if (!Number.isFinite(position.coords.latitude) || !Number.isFinite(position.coords.longitude)) {
        setLocationError("لم يُرجع الجهاز إحداثيات صالحة.");
        return;
      }
      const resolved = await mapController.reverse(
        position.coords.latitude,
        position.coords.longitude,
      );
      if (!resolved) {
        setLocationError("تعذر التحقق من الإحداثيات عبر مزود الخرائط المحكوم.");
        return;
      }
      applyMapLocation(resolved);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "تعذر التقاط الموقع.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const searchLocation = async () => {
    setLocationError(null);
    await mapController.search(mapQuery);
  };

  const save = async () => {
    const validation = validateDraft(draft);
    if (validation) {
      setFormError(validation);
      return;
    }
    setFormError(null);
    const input = toInput(draft);
    const ok = editing
      ? await controller.updateAddress(editing, input)
      : await controller.createAddress(input);
    if (ok) {
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      setShowForm(false);
      resetMap();
    }
  };

  if (controller.state.kind === "loading") {
    return (
      <View style={styles.root} accessibilityLiveRegion="polite">
        <TopBar title="العناوين والموقع" {...(onBack ? { onBack } : {})} />
        <StateView loading title="جارٍ تحميل عناوينك" />
      </View>
    );
  }

  if (controller.state.kind === "error") {
    return (
      <View style={styles.root} accessibilityLiveRegion="assertive">
        <TopBar title="العناوين والموقع" {...(onBack ? { onBack } : {})} />
        <StateView
          tone="danger"
          title="تعذر تحميل دفتر العناوين"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.reload}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar title="العناوين والموقع" {...(onBack ? { onBack } : {})} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {controller.mutationError ? (
          <View accessibilityLiveRegion="assertive">
            <Card style={styles.errorCard}>
              <Text tone="danger" style={styles.rtl}>{controller.mutationError}</Text>
              <Button
                label="إغلاق"
                accessibilityLabel="إغلاق رسالة خطأ العنوان"
                tone="ghost"
                size="sm"
                onPress={controller.clearMutationError}
              />
            </Card>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text role="titleMd">عناوين التسليم</Text>
          <Button
            label="إضافة عنوان"
            accessibilityLabel="إضافة عنوان تسليم جديد"
            tone="primary"
            size="sm"
            disabled={controller.mutating}
            onPress={beginCreate}
          />
        </View>

        {controller.addresses.length === 0 ? (
          <StateView
            title="لا توجد عناوين محفوظة"
            description="أضف عنوانًا حقيقيًا مرتبطًا بحسابك ليستخدمه فحص الخدمة وcheckout."
            actionLabel="إضافة أول عنوان"
            onActionPress={beginCreate}
          />
        ) : (
          controller.addresses.map((address) => (
            <Card key={address.id} style={styles.addressCard}>
              <View style={styles.addressTitleRow}>
                <View style={styles.badges}>
                  {address.isDefault ? <Badge label="الافتراضي" tone="success" /> : null}
                  {address.latitude !== null ? <Badge label="موقع معتمد" tone="info" /> : null}
                </View>
                <Text role="titleSm" style={styles.rtl}>{address.label}</Text>
              </View>
              <Text role="bodyStrong" style={styles.rtl}>{address.recipientName}</Text>
              <Text role="bodySm" style={styles.rtl}>{address.addressLine}</Text>
              <Text role="caption" tone="muted" style={styles.rtl}>
                {address.serviceAreaCode} · {address.phoneE164}
              </Text>
              <View style={styles.actions}>
                {!address.isDefault ? (
                  <Button
                    label="جعله افتراضيًا"
                    accessibilityLabel={`جعل عنوان ${address.label} العنوان الافتراضي`}
                    accessibilityState={{ busy: controller.mutating, selected: false }}
                    tone="secondary"
                    size="sm"
                    disabled={controller.mutating}
                    onPress={() => void controller.makeDefault(address)}
                  />
                ) : null}
                <Button
                  label="تعديل"
                  accessibilityLabel={`تعديل عنوان ${address.label}`}
                  tone="ghost"
                  size="sm"
                  disabled={controller.mutating}
                  onPress={() => beginEdit(address)}
                />
                {pendingDeleteId === address.id ? (
                  <>
                    <Button
                      label="تأكيد الحذف"
                      accessibilityLabel={`تأكيد حذف عنوان ${address.label}`}
                      accessibilityState={{ busy: controller.mutating }}
                      tone="danger"
                      size="sm"
                      disabled={controller.mutating}
                      onPress={() => void controller.deleteAddress(address).then((ok) => ok && setPendingDeleteId(null))}
                    />
                    <Button
                      label="إلغاء"
                      accessibilityLabel={`إلغاء حذف عنوان ${address.label}`}
                      tone="ghost"
                      size="sm"
                      disabled={controller.mutating}
                      onPress={() => setPendingDeleteId(null)}
                    />
                  </>
                ) : (
                  <Button
                    label="حذف"
                    accessibilityLabel={`طلب حذف عنوان ${address.label}`}
                    tone="danger"
                    size="sm"
                    disabled={controller.mutating}
                    onPress={() => setPendingDeleteId(address.id)}
                  />
                )}
              </View>
              {onOpenCheckout ? (
                <Button
                  label={address.isDefault ? "استخدام هذا العنوان" : "تعيين واستخدام"}
                  accessibilityLabel={`${address.isDefault ? "استخدام" : "تعيين واستخدام"} عنوان ${address.label}`}
                  accessibilityState={{ selected: address.isDefault, busy: controller.mutating }}
                  tone="primary"
                  disabled={controller.mutating}
                  onPress={() => void controller.makeDefault(address).then((ok) => ok && onOpenCheckout())}
                />
              ) : null}
            </Card>
          ))
        )}

        {showForm ? (
          <Card style={styles.formCard}>
            <Text role="titleMd" style={styles.rtl}>{editing ? "تعديل العنوان" : "عنوان جديد"}</Text>
            <TextField
              id="client-address-label"
              label="اسم العنوان"
              value={draft.label}
              maxLength={80}
              onChangeText={(value) => setDraft((current) => ({ ...current, label: value }))}
              placeholder="المنزل، العمل…"
            />
            <TextField
              id="client-address-recipient"
              label="اسم المستلم"
              value={draft.recipientName}
              maxLength={160}
              onChangeText={(value) => setDraft((current) => ({ ...current, recipientName: value }))}
            />
            <TextField
              id="client-address-phone"
              label="الهاتف الدولي"
              value={draft.phoneE164}
              maxLength={16}
              onChangeText={(value) => setDraft((current) => ({ ...current, phoneE164: value }))}
              keyboardType="phone-pad"
            />

            <Text role="bodyStrong" style={styles.rtl}>الموقع المحكوم</Text>
            <TextField
              id="client-address-map-query"
              label="ابحث عن موقع أو معلم"
              value={mapQuery}
              maxLength={160}
              onChangeText={setMapQuery}
              placeholder="مثال: جامعة صنعاء"
            />
            <View style={styles.actions}>
              <Button
                label="بحث"
                accessibilityLabel="البحث عن موقع معتمد"
                loading={mapController.state.kind === "loading"}
                tone="secondary"
                disabled={controller.mutating}
                onPress={() => void searchLocation()}
              />
              <Button
                label="استخدام موقع الجهاز"
                accessibilityLabel="استخدام موقع الجهاز والتحقق من منطقة الخدمة"
                loading={capturingLocation}
                tone="secondary"
                disabled={mapController.state.kind === "loading" || controller.mutating}
                onPress={() => void captureLocation()}
              />
            </View>
            {mapController.state.kind === "empty" ? (
              <View accessibilityLiveRegion="polite">
                <Text role="caption" tone="muted" style={styles.rtl}>لم يُعثر على موقع مطابق.</Text>
              </View>
            ) : null}
            {mapController.state.kind === "error" ? (
              <View accessibilityLiveRegion="assertive">
                <Text tone="danger" style={styles.rtl}>{mapController.state.message}</Text>
              </View>
            ) : null}
            {mapController.locations.map((location) => (
              <Card key={`${location.providerCode}:${location.providerPlaceId}`} style={styles.mapResult}>
                <Text role="bodyStrong" style={styles.rtl}>{location.displayName}</Text>
                <View style={styles.badges}>
                  <Badge
                    label={location.serviceAreaVerified ? `ضمن ${location.serviceAreaName ?? location.serviceAreaCode}` : "خارج التغطية"}
                    tone={location.serviceAreaVerified ? "success" : "warning"}
                  />
                </View>
                <Button
                  label="اختيار الموقع"
                  accessibilityLabel={`اختيار ${location.displayName}${location.serviceAreaVerified ? "" : "، خارج التغطية"}`}
                  tone="primary"
                  size="sm"
                  disabled={!location.serviceAreaVerified || controller.mutating}
                  onPress={() => applyMapLocation(location)}
                />
              </Card>
            ))}

            <TextField
              id="client-address-line"
              label="وصف العنوان"
              value={draft.addressLine}
              maxLength={500}
              onChangeText={(value) => setDraft((current) => ({ ...current, addressLine: value }))}
              multiline
            />
            {draft.serviceAreaCode ? (
              <Text role="caption" tone="muted" style={styles.rtl}>منطقة الخدمة المعتمدة: {draft.serviceAreaCode}</Text>
            ) : null}
            <View style={styles.inlineFields}>
              <TextField
                id="client-address-building"
                label="المبنى"
                value={draft.building}
                maxLength={120}
                onChangeText={(value) => setDraft((current) => ({ ...current, building: value }))}
              />
              <TextField
                id="client-address-floor"
                label="الدور"
                value={draft.floor}
                maxLength={40}
                onChangeText={(value) => setDraft((current) => ({ ...current, floor: value }))}
              />
              <TextField
                id="client-address-unit"
                label="الشقة"
                value={draft.unit}
                maxLength={40}
                onChangeText={(value) => setDraft((current) => ({ ...current, unit: value }))}
              />
            </View>
            <TextField
              id="client-address-instructions"
              label="تعليمات التسليم"
              value={draft.deliveryInstructions}
              maxLength={500}
              onChangeText={(value) => setDraft((current) => ({ ...current, deliveryInstructions: value }))}
              multiline
            />
            {draft.latitude !== null && draft.longitude !== null ? (
              <Text role="caption" tone="muted" style={styles.rtl}>
                موقع معتمد: {draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
              </Text>
            ) : (
              <Text role="caption" tone="warning" style={styles.rtl}>
                يجب اختيار موقع معتمد قبل الحفظ.
              </Text>
            )}
            {locationError ? (
              <View accessibilityLiveRegion="assertive">
                <Text tone="danger" style={styles.rtl}>{locationError}</Text>
              </View>
            ) : null}
            {formError ? (
              <View accessibilityLiveRegion="assertive">
                <Text tone="danger" style={styles.rtl}>{formError}</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Button
                label="حفظ"
                accessibilityLabel={editing ? `حفظ تعديلات عنوان ${editing.label}` : "حفظ العنوان الجديد"}
                loading={controller.mutating}
                tone="primary"
                disabled={capturingLocation || mapController.state.kind === "loading"}
                onPress={() => void save()}
              />
              <Button
                label="إلغاء"
                accessibilityLabel="إلغاء تحرير العنوان"
                tone="ghost"
                disabled={controller.mutating}
                onPress={() => {
                  setShowForm(false);
                  setEditing(null);
                  setFormError(null);
                  setLocationError(null);
                  resetMap();
                }}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: 96 },
  rtl: { textAlign: "right" },
  sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  addressCard: { padding: spacing[4], gap: spacing[2] },
  addressTitleRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  badges: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[1] },
  actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  formCard: { padding: spacing[4], gap: spacing[3] },
  mapResult: { padding: spacing[3], gap: spacing[2] },
  errorCard: { padding: spacing[3], gap: spacing[2], borderColor: colorRoles.danger, borderWidth: 1 },
  inlineFields: { gap: spacing[2] },
});
