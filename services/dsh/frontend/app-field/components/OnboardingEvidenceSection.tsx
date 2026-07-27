// app-field — OnboardingEvidenceSection
// Every required document/photo is visible immediately. The field agent can
// use the camera, gallery, or a real PDF/file picker without first revealing a
// hidden chip. Upload errors remain attached to the exact evidence row.
import React from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Button, Text, spacing, radius, colorRoles, Icon } from '@bthwani/ui-kit';

export type EvidenceKind = 'document' | 'photo';
export type EvidencePickSource = 'camera' | 'library' | 'document';

export type EvidenceItem = {
  readonly key: string;
  readonly kind: EvidenceKind;
  readonly label: string;
  readonly status: 'missing' | 'uploaded';
  readonly previewUri?: string;
};

type Props = {
  readonly items: readonly EvidenceItem[];
  readonly loadingMap?: Record<string, boolean>;
  readonly errorMap?: Record<string, string | undefined>;
  readonly onPick?: (item: EvidenceItem, source: EvidencePickSource) => void;
};

export function OnboardingEvidenceSection({ items, loadingMap, errorMap, onPick }: Props) {
  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        المستندات والصور المرفقة
      </Text>

      <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
        أرفق كل عنصر بالكاميرا أو المعرض. المستندات تقبل أيضًا PDF وملفات الصور مباشرة.
      </Text>

      <View style={{ gap: spacing[3] }}>
        {items.map((item) => {
          const isUploading = Boolean(loadingMap?.[item.key]);
          const hasFile = item.status === 'uploaded';
          const error = errorMap?.[item.key];

          return (
            <View
              key={item.key}
              style={{
                borderWidth: 1.5,
                borderStyle: hasFile ? 'solid' : 'dashed',
                borderColor: error
                  ? colorRoles.danger
                  : hasFile
                    ? colorRoles.success
                    : colorRoles.borderStrong,
                borderRadius: radius.md,
                backgroundColor: colorRoles.surfaceBase,
                padding: spacing[3],
                gap: spacing[3],
                minHeight: 112,
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3] }}>
                {isUploading ? (
                  <View style={{ width: 56, height: 56, borderRadius: radius.xs, backgroundColor: colorRoles.surfaceMuted, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colorRoles.borderStrong }}>
                    <ActivityIndicator size="small" color={colorRoles.brandAction} />
                  </View>
                ) : item.previewUri ? (
                  <Image
                    source={{ uri: item.previewUri }}
                    style={{ width: 56, height: 56, borderRadius: radius.xs, borderWidth: 1, borderColor: colorRoles.borderStrong }}
                    alt=""
                  />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: radius.xs, backgroundColor: colorRoles.surfaceMuted, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colorRoles.borderStrong }}>
                    <Icon name={item.kind === 'photo' ? 'camera-outline' : 'document-text-outline'} size={24} tone="muted" />
                  </View>
                )}

                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, fontSize: 14, fontWeight: 'bold', textAlign: 'right' }}>
                    {item.label}
                  </Text>
                  {isUploading ? (
                    <Text role="caption" tone="action">جاري الرفع والتحقق...</Text>
                  ) : hasFile ? (
                    <Text role="caption" tone="success">تم الإرفاق والتحقق ✓</Text>
                  ) : (
                    <Text role="caption" tone="muted">غير مرفوع</Text>
                  )}
                </View>
              </View>

              {error ? (
                <Text role="caption" tone="danger" style={{ textAlign: 'right' }}>
                  {error}
                </Text>
              ) : null}

              {onPick ? (
                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] }}>
                  <Button
                    label="التقاط صورة"
                    size="sm"
                    tone="secondary"
                    onPress={() => onPick(item, 'camera')}
                    disabled={isUploading}
                    leading={<Icon name="camera-outline" size={16} />}
                  />
                  <Button
                    label="اختيار صورة"
                    size="sm"
                    tone="ghost"
                    onPress={() => onPick(item, 'library')}
                    disabled={isUploading}
                    leading={<Icon name="images-outline" size={16} />}
                  />
                  {item.kind === 'document' ? (
                    <Button
                      label="اختيار PDF/ملف"
                      size="sm"
                      tone="ghost"
                      onPress={() => onPick(item, 'document')}
                      disabled={isUploading}
                      leading={<Icon name="document-attach-outline" size={16} />}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
