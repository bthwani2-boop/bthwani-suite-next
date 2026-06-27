// app-field — Step 2: الموقع والصور الميدانية
// Extracted 1:1 from bthwani-suite donor. No business logic here.
import React from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { TextField, Text, spacing, radius, borders, colorRoles, Icon } from '@bthwani/ui-kit';
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
};

export function StepLocationAndPhotos({
  form,
  errors,
  readOnly,
  onChange,
  cameraLoading,
  onPickPhoto,
}: Props) {
  const isRtl = true;

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

      <TextField
        label="المدينة"
        value={form.city ?? ''}
        disabled={readOnly}
        {...((errors as any).city ? { error: (errors as any).city } : {})}
        onChangeText={(v) => onChange({ city: v })}
        placeholder="مثال: الرياض"
      />

      <TextField
        label="العنوان المختصر ووصف الشارع"
        value={form.addressLine ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ addressLine: v })}
        placeholder="مثال: طريق الملك فهد، بجانب البنك الأهلي"
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
