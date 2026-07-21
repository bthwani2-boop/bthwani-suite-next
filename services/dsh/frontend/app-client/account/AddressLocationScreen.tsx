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
  if (draft.label.trim().length < 1) return "اكتب اسمًا مختصرًا للعنوان.";
  if (draft.recipientName.trim().length < 2) return "اكتب اسم المستلم.";
  if (!/^\+[1-9][0-9]{7,14}$/.test(draft.phoneE164.trim())) return "رقم الهاتف يجب أن يكون بصيغة دولية صحيحة.";
  if (draft.addressLine.trim().length < 5) return "اختر موقعًا محكومًا أو اكتب وصفًا أوضح للتسليم.";
  if (draft.serviceAreaCode.trim().length < 1) return "الموقع المختار خارج مناطق الخدمة المعتمدة.";
  if ((draft.latitude === null) !== (draft.longitude === null)) return "يجب حفظ خط العرض والطول معًا.";
  return null;
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
      <View style={styles.root}>
        <TopBar title="العناوين والموقع" {...(onBack ? { onBack } : {})} />
        <StateView loading title="جارٍ تحميل عناوينك" />
      </View>
    );
  }

  if (controller.state.kind === "error") {
    return (
      <View style={styles.root}>
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {controller.mutationError ? (
          <Card style={styles.errorCard}>
            <Text tone="danger" style={styles.rtl}>{controller.mutationError}</Text>
            <Button label="إغلاق" tone="ghost" size="sm" onPress={controller.clearMutationError} />
          </Card>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text role="titleMd">عناوين التسليم</Text>
          <Button label="إضافة عنوان" tone="primary" size="sm" onPress={beginCreate} />
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
                    tone="secondary"
                    size="sm"
                    disabled={controller.mutating}
                    onPress={() => void controller.makeDefault(address)}
                  />
                ) : null}
                <Button label="تعديل" tone="ghost" size="sm" disabled={controller.mutating} onPress={() => beginEdit(address)} />
                {pendingDeleteId === address.id ? (
                  <>
                    <Button
                      label="تأكيد الحذف"
                      tone="danger"
                      size="sm"
                      disabled={controller.mutating}
                      onPress={() => void controller.deleteAddress(address).then((ok) => ok && setPendingDeleteId(null))}
                    />
                    <Button label="إلغاء" tone="ghost" size="sm" onPress={() => setPendingDeleteId(null)} />
                  </>
                ) : (
                  <Button label="حذف" tone="danger" size="sm" disabled={controller.mutating} onPress={() => setPendingDeleteId(address.id)} />
                )}
              </View>
              {onOpenCheckout ? (
                <Button
                  label={address.isDefault ? "استخدام هذا العنوان" : "تعيين واستخدام"}
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
            <TextField label="اسم العنوان" value={draft.label} onChangeText={(value) => setDraft((current) => ({ ...current, label: value }))} placeholder="المنزل، العمل…" />
            <TextField label="اسم المستلم" value={draft.recipientName} onChangeText={(value) => setDraft((current) => ({ ...current, recipientName: value }))} />
            <TextField label="الهاتف الدولي" value={draft.phoneE164} onChangeText={(value) => setDraft((current) => ({ ...current, phoneE164: value }))} keyboardType="phone-pad" />

            <Text role="bodyStrong" style={styles.rtl}>الموقع المحكوم</Text>
            <TextField
              label="ابحث عن موقع أو معلم"
              value={mapQuery}
              onChangeText={setMapQuery}
              placeholder="مثال: جامعة صنعاء"
            />
            <View style={styles.actions}>
              <Button
                label={mapController.state.kind === "loading" ? "جارٍ البحث…" : "بحث"}
                tone="secondary"
                disabled={mapController.state.kind === "loading" || controller.mutating}
                onPress={() => void searchLocation()}
              />
              <Button
                label={capturingLocation ? "جارٍ التحقق…" : "استخدام موقع الجهاز"}
                tone="secondary"
                disabled={capturingLocation || mapController.state.kind === "loading" || controller.mutating}
                onPress={() => void captureLocation()}
              />
            </View>
            {mapController.state.kind === "empty" ? (
              <Text role="caption" tone="muted" style={styles.rtl}>لم يُعثر على موقع مطابق.</Text>
            ) : null}
            {mapController.state.kind === "error" ? (
              <Text tone="danger" style={styles.rtl}>{mapController.state.message}</Text>
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
                  tone="primary"
                  size="sm"
                  disabled={!location.serviceAreaVerified}
                  onPress={() => applyMapLocation(location)}
                />
              </Card>
            ))}

            <TextField label="وصف العنوان" value={draft.addressLine} onChangeText={(value) => setDraft((current) => ({ ...current, addressLine: value }))} multiline />
            {draft.serviceAreaCode ? (
              <Text role="caption" tone="muted" style={styles.rtl}>منطقة الخدمة المعتمدة: {draft.serviceAreaCode}</Text>
            ) : null}
            <View style={styles.inlineFields}>
              <TextField label="المبنى" value={draft.building} onChangeText={(value) => setDraft((current) => ({ ...current, building: value }))} />
              <TextField label="الدور" value={draft.floor} onChangeText={(value) => setDraft((current) => ({ ...current, floor: value }))} />
              <TextField label="الشقة" value={draft.unit} onChangeText={(value) => setDraft((current) => ({ ...current, unit: value }))} />
            </View>
            <TextField label="تعليمات التسليم" value={draft.deliveryInstructions} onChangeText={(value) => setDraft((current) => ({ ...current, deliveryInstructions: value }))} multiline />
            {draft.latitude !== null && draft.longitude !== null ? (
              <Text role="caption" tone="muted" style={styles.rtl}>
                {draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
              </Text>
            ) : null}
            {locationError ? <Text tone="danger" style={styles.rtl}>{locationError}</Text> : null}
            {formError ? <Text tone="danger" style={styles.rtl}>{formError}</Text> : null}
            <View style={styles.actions}>
              <Button label={controller.mutating ? "جارٍ الحفظ…" : "حفظ"} tone="primary" disabled={controller.mutating} onPress={() => void save()} />
              <Button label="إلغاء" tone="ghost" disabled={controller.mutating} onPress={() => { setShowForm(false); setEditing(null); setFormError(null); resetMap(); }} />
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
