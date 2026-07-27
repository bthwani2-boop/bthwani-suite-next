// app-field — OnboardingLocationSection
// Uses native maps and device GPS. Service-area truth remains backend-owned;
// the field agent records location and address but never invents a zone code.
import React, { useState } from "react";
import { View } from "react-native";
import * as Location from "expo-location";
import {
  TextField,
  Text,
  spacing,
  radius,
  colorRoles,
  Button,
  Surface,
} from "@bthwani/ui-kit";
import type {
  FieldPartnerDraftForm,
  FieldOnboardingValidationErrors,
} from "../../shared/field-onboarding";
import {
  BthwaniNativeMap,
  type BthwaniMapCoordinate,
} from "../../shared/maps";

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly errors: Partial<FieldOnboardingValidationErrors>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
  readonly locationLatitude: number | null;
  readonly locationLongitude: number | null;
  readonly onLocationChange: (lat: number, lon: number) => void;
};

export function OnboardingLocationSection({
  form,
  errors,
  readOnly,
  onChange,
  locationLatitude,
  locationLongitude,
  onLocationChange,
}: Props) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const selectedCoordinate: BthwaniMapCoordinate | null =
    locationLatitude !== null && locationLongitude !== null
      ? { latitude: locationLatitude, longitude: locationLongitude }
      : null;

  const applyRealCoordinates = React.useCallback((coordinate: BthwaniMapCoordinate) => {
    if (readOnly) return;
    setLocateError(null);
    onLocationChange(coordinate.latitude, coordinate.longitude);
  }, [onLocationChange, readOnly]);

  const handleLocateMe = async () => {
    if (readOnly) return;
    setLocateError(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocateError("لم يُسمح بالوصول لموقع الجهاز. فعّل صلاحية الموقع للمتابعة.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (position.mocked === true) {
        setLocateError("تم رفض موقع صادر من مزود وهمي. استخدم موقع الجهاز الفعلي.");
        return;
      }
      applyRealCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocateError("تعذر تحديد الموقع الحالي. تأكد من تفعيل خدمة الموقع والمحاولة مجددًا.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: "right", fontWeight: "bold", color: colorRoles.textPrimary }}>
        الموقع الجغرافي ونطاق التغطية
      </Text>

      <View style={{ gap: spacing[2] }}>
        <Text role="bodySm" style={{ color: colorRoles.textPrimary, textAlign: "right", fontWeight: "bold" }}>
          تحديد موقع الفرع على الخريطة
        </Text>

        {!readOnly ? (
          <Button
            label={locating ? "جارٍ تحديد الموقع…" : "استخدام موقع الجهاز الحالي"}
            tone="secondary"
            size="sm"
            onPress={() => void handleLocateMe()}
            disabled={locating}
          />
        ) : null}

        {locateError ? (
          <Text role="caption" tone="danger" style={{ textAlign: "right" }}>
            {locateError}
          </Text>
        ) : null}

        <BthwaniNativeMap
          selectedCoordinate={selectedCoordinate}
          {...(!readOnly ? { onCoordinatePress: applyRealCoordinates } : {})}
          showsUserLocation={!readOnly}
          height={280}
          accessibilityLabel="خريطة تحديد موقع فرع الشريك"
          emptyLabel="استخدم GPS أو اضغط على الخريطة لتحديد موقع الفرع الحقيقي."
        />

        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          تُحفظ الإحداثيات الفعلية، بينما يعتمد DSH نطاق الخدمة النهائي ولا يسمح بإدخال رمز نطاق يدوي.
        </Text>

        {selectedCoordinate ? (
          <Surface tone="inset" style={{ padding: 8, borderRadius: radius.sm, alignItems: "flex-end" }}>
            <Text role="caption" style={{ color: colorRoles.brandAction, fontWeight: "bold" }}>
              إحداثيات الفرع: {selectedCoordinate.latitude.toFixed(6)}، {selectedCoordinate.longitude.toFixed(6)}
            </Text>
          </Surface>
        ) : null}
      </View>

      <TextField
        label="المدينة"
        value={form.city ?? ""}
        disabled={readOnly}
        {...((errors as { readonly city?: string }).city
          ? { error: (errors as { readonly city?: string }).city }
          : {})}
        onChangeText={(city) => onChange({ city, serviceAreaCode: "" })}
        placeholder="مثال: صنعاء"
        hint="تستخدم كمرجع أولي فقط؛ نطاق الخدمة يعتمد من الإحداثيات وسياسات DSH."
      />

      <TextField
        label="العنوان المختصر ووصف الشارع"
        value={form.addressLine ?? ""}
        disabled={readOnly}
        onChangeText={(addressLine) => onChange({ addressLine })}
        placeholder="مثال: صنعاء، حدة، شارع بيروت"
        multiline
      />

      <TextField
        label="ملاحظات الوصول والتغطية"
        value={form.coverageSummary ?? ""}
        disabled={readOnly}
        onChangeText={(coverageSummary) => onChange({ coverageSummary })}
        placeholder="معلم قريب، مدخل الفرع، أو ملاحظة تساعد العمليات"
        multiline
      />
    </View>
  );
}
