// app-field — Step 2: الموقع والصور الميدانية
// Extracted 1:1 from bthwani-suite donor. No business logic here.
import React, { useState, useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, View, StyleSheet, ScrollView } from 'react-native';
import { TextField, Text, spacing, radius, borders, colorRoles, Icon, Button, Surface } from '@bthwani/ui-kit';
import type { FieldPartnerDraftForm, FieldOnboardingValidationErrors } from '../../shared/field-onboarding';

type PhotoKey = 'storefrontPhotoRef' | 'interiorPhotoRef' | 'signagePhotoRef';

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly errors: Partial<FieldOnboardingValidationErrors>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
  readonly cameraLoading: Record<string, boolean>;
  readonly isNativePickerAvailable: boolean;
  readonly onPickPhoto: (key: PhotoKey) => void;
  readonly locationLatitude: number | null;
  readonly locationLongitude: number | null;
  readonly onLocationChange: (lat: number, lon: number) => void;
};

const LANDMARKS = [
  { lat: 15.3560, lng: 44.1800, name: "صنعاء، المدينة القديمة، باب اليمن", x: 160, y: 120 },
  { lat: 15.3400, lng: 44.1900, name: "صنعاء، حي حدة، شارع بيروت", x: 220, y: 190 },
  { lat: 15.3300, lng: 44.2000, name: "صنعاء، حي السبعين، ميدان السبعين", x: 240, y: 210 },
  { lat: 15.3200, lng: 44.1800, name: "صنعاء، شارع تعز، جولة تعز", x: 160, y: 230 },
  { lat: 15.3700, lng: 44.1900, name: "صنعاء، حي معين، شارع الستين", x: 120, y: 60 },
];

export function StepLocationAndPhotos({
  form,
  errors,
  readOnly,
  onChange,
  cameraLoading,
  onPickPhoto,
  locationLatitude,
  locationLongitude,
  onLocationChange,
}: Props) {
  const isRtl = true;

  // Local pin position states derived from latitude/longitude
  const initialPinX = locationLongitude ? Math.round((locationLongitude - 44.1500) * 320.0 / 0.0600) : 160;
  const initialPinY = locationLatitude ? Math.round((15.3800 - locationLatitude) * 220.0 / 0.0800) : 140;

  const [pinPos, setPinPos] = useState({ x: initialPinX, y: initialPinY });

  const handleMapPress = (event: any) => {
    if (readOnly) return;
    const { locationX, locationY } = event.nativeEvent;
    const x = Math.max(10, Math.min(310, locationX));
    const y = Math.max(10, Math.min(210, locationY));
    
    setPinPos({ x, y });

    // Map SVG coordinates to latitude/longitude
    const lat = 15.3800 - (y / 220.0) * 0.0800;
    const lng = 44.1500 + (x / 320.0) * 0.0600;

    onLocationChange(lat, lng);

    // Auto-update short address description based on closest landmark
    let closestLandmark = LANDMARKS[0];
    let minDistance = 999999.0;
    for (const lm of LANDMARKS) {
      const dx = lm.x - x;
      const dy = lm.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        closestLandmark = lm;
      }
    }
    onChange({ addressLine: closestLandmark!.name });
  };

  const handleLocateMe = () => {
    if (readOnly) return;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const x = Math.max(10, Math.min(310, Math.round((longitude - 44.1500) * 320.0 / 0.0600)));
          const y = Math.max(10, Math.min(210, Math.round((15.3800 - latitude) * 220.0 / 0.0800)));
          setPinPos({ x, y });
          onLocationChange(latitude, longitude);

          let closestLandmark = LANDMARKS[0];
          let minDistance = 999999.0;
          for (const lm of LANDMARKS) {
            const dx = lm.x - x;
            const dy = lm.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) {
              minDistance = dist;
              closestLandmark = lm;
            }
          }
          onChange({ addressLine: closestLandmark!.name });
        },
        () => {
          setPinPos({ x: 160, y: 140 });
          onLocationChange(15.3520, 44.1780);
          onChange({ addressLine: LANDMARKS[0]!.name });
        }
      );
    } else {
      setPinPos({ x: 160, y: 140 });
      onLocationChange(15.3520, 44.1780);
      onChange({ addressLine: LANDMARKS[0]!.name });
    }
  };

  const renderPhotoField = (photoKey: PhotoKey, label: string) => {
    const value = form[photoKey];
    const isCapturing = cameraLoading[photoKey];
    const hasRealImage =
      value &&
      (value.startsWith('http') ||
        value.startsWith('blob:') ||
        value.startsWith('data:') ||
        value.startsWith('file:') ||
        value.startsWith('ph:'));

    return (
      <View key={photoKey} style={{ gap: spacing[1], marginVertical: 6 }}>
        <Pressable
          onPress={readOnly ? undefined : () => onPickPhoto(photoKey)}
          style={{
            borderWidth: 1.5,
            borderStyle: hasRealImage ? 'solid' : 'dashed',
            borderColor: hasRealImage ? colorRoles.success : colorRoles.borderStrong,
            borderRadius: radius.md,
            backgroundColor: colorRoles.surfaceBase,
            padding: spacing[3],
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 80,
            overflow: 'hidden',
          }}
        >
          {/* Right: Image Preview / Icon */}
          <View
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              flex: 1,
              gap: spacing[3],
            }}
          >
            {isCapturing ? (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.xs,
                  backgroundColor: colorRoles.surfaceMuted,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colorRoles.borderStrong,
                }}
              >
                <ActivityIndicator size="small" color={colorRoles.brandAction} />
              </View>
            ) : hasRealImage ? (
              <Image
                source={{ uri: value }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.xs,
                  borderWidth: 1,
                  borderColor: colorRoles.borderStrong,
                }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.xs,
                  backgroundColor: colorRoles.surfaceMuted,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colorRoles.borderStrong,
                }}
              >
                <Icon name="camera-outline" size={24} tone="muted" />
              </View>
            )}

            {/* Center: Info text */}
            <View style={{ flex: 1, alignItems: 'flex-end', gap: spacing[1] }}>
              <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
                {label}
              </Text>
              {isCapturing ? (
                <Text role="caption" tone="action">
                  جاري رفع الملف...
                </Text>
              ) : hasRealImage ? (
                <Text role="caption" tone="success">
                  جاهز للتدقيق ✓
                </Text>
              ) : (
                <Text role="caption" tone="muted">
                  اضغط للرفع أو التقاط صورة
                </Text>
              )}
            </View>
          </View>

          {/* Left: Action Icon */}
          {!readOnly && (
            <View style={{ paddingStart: spacing[2] }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.xs,
                  backgroundColor: colorRoles.surfaceMuted,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colorRoles.borderStrong,
                }}
              >
                <Icon name={hasRealImage ? 'sync-outline' : 'add-outline'} size={18} tone="muted" />
              </View>
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        الموقع الجغرافي ونطاق التغطية
      </Text>

      {/* الخريطة التفاعلية لتحديد إحداثيات الفرع */}
      <View style={{ gap: spacing[1] }}>
        <Text role="bodySm" style={{ color: colorRoles.textPrimary, textAlign: 'right', fontWeight: 'bold' }}>
          تحديد موقع الفرع على الخريطة
        </Text>
        
        {!readOnly && (
          <Button
            label="تحديد موقع الفرع الحالي بالـ GPS 🎯"
            tone="secondary"
            size="sm"
            onPress={handleLocateMe}
            style={{ alignSelf: 'center', marginVertical: 4, width: 320 }}
          />
        )}

        <View style={styles.mapContainer}>
          <Pressable onPress={handleMapPress} style={styles.mapPressable}>
            {/* Grid / concentric circles background */}
            <View style={[styles.mapCircle, { width: 100, height: 100, borderRadius: 50, top: 70, left: 110 }]} />
            <View style={[styles.mapCircle, { width: 200, height: 200, borderRadius: 100, top: 20, left: 60 }]} />
            
            {/* Major roads representation */}
            <View style={[styles.mapRoad, { height: 2, width: "100%", top: 120, left: 0 }]} />
            <View style={[styles.mapRoad, { width: 2, height: "100%", left: 160, top: 0 }]} />

            {/* Landmark Pins */}
            {LANDMARKS.map(lm => (
              <View key={lm.name} style={[styles.landmarkPin, { top: lm.y - 4, left: lm.x - 4 }]}>
                <View style={styles.landmarkDot} />
              </View>
            ))}

            {/* Store Location Pin */}
            <View style={[styles.userPin, { top: pinPos.y - 20, left: pinPos.x - 10 }]}>
              <View style={styles.userPinPulse} />
              <Icon name="pin" size={20} color="#1D4ED8" />
            </View>
          </Pressable>
        </View>
        <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: 'right', marginBottom: 4 }}>
          انقر على الخريطة لتحديد موقع فرع الشريك بدقة.
        </Text>
        {locationLatitude !== null && locationLongitude !== null && (
          <Surface tone="inset" style={{ padding: 8, borderRadius: radius.sm, alignItems: 'flex-end' }}>
            <Text role="caption" style={{ color: colorRoles.brandAction, fontWeight: 'bold' }}>
              إحداثيات الفرع المحددة: {locationLatitude.toFixed(6)}، {locationLongitude.toFixed(6)}
            </Text>
          </Surface>
        )}
      </View>

      <TextField
        label="المدينة"
        value={form.city ?? ''}
        disabled={readOnly}
        {...((errors as any).city ? { error: (errors as any).city } : {})}
        onChangeText={(v) => onChange({ city: v })}
        placeholder="مثال: صنعاء"
      />

      <TextField
        label="العنوان المختصر ووصف الشارع"
        value={form.addressLine ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ addressLine: v })}
        placeholder="مثال: صنعاء، المدينة القديمة، باب اليمن"
        multiline
      />

      <TextField
        label="ملخص التغطية الجغرافية"
        value={form.coverageSummary ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ coverageSummary: v })}
        placeholder="وصف إضافي لحدود التوصيل المتفق عليها"
      />

      <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[2] }} />

      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        صور الفرع والتجهيزات
      </Text>

      {renderPhotoField('storefrontPhotoRef', 'صورة الواجهة الخارجية للمحل')}
      {renderPhotoField('interiorPhotoRef', 'صورة المتجر من الداخل والرفوف')}
      {renderPhotoField('signagePhotoRef', 'صورة اللوحة التجارية المطابقة للترخيص')}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: 320,
    height: 220,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    overflow: "hidden",
    alignSelf: "center",
    position: "relative",
    marginVertical: 4,
  },
  mapPressable: {
    width: "100%",
    height: "100%",
  },
  mapCircle: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  mapRoad: {
    position: "absolute",
    backgroundColor: "#E2E8F0",
  },
  landmarkPin: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(100, 116, 139, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  landmarkDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#64748B",
  },
  userPin: {
    position: "absolute",
    zIndex: 10,
  },
  userPinPulse: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(29, 78, 216, 0.3)",
    top: -5,
    left: -5,
  },
});
