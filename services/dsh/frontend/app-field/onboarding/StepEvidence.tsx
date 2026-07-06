// app-field — Step 3: المستندات والصور المرفقة
// Merged documents + branch photos into one optional evidence step. The field
// agent first picks (via chips) which item to attach, then uploads each
// required document/photo via camera or gallery.
import React from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Chip, Text, spacing, radius, colorRoles, Icon } from '@bthwani/ui-kit';

export type EvidenceKind = 'document' | 'photo';

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
  readonly onPick?: (item: EvidenceItem, source: 'camera' | 'library') => void;
};

export function StepEvidence({ items, loadingMap, onPick }: Props) {
  const [manuallyRevealed, setManuallyRevealed] = React.useState<Set<string>>(new Set());

  const toggleRevealed = (key: string) => {
    setManuallyRevealed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        المستندات والصور المرفقة
      </Text>

      <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
        اختر المستند أو الصورة المطلوبة، ثم أرفقها بالكاميرا أو من المعرض قبل إرسال الملف.
      </Text>

      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] }}>
        {items.map((item) => {
          const hasFile = item.status === 'uploaded';
          return (
            <Chip
              key={item.key}
              label={item.label}
              selected={hasFile || manuallyRevealed.has(item.key)}
              onPress={() => toggleRevealed(item.key)}
            />
          );
        })}
      </View>

      <View style={{ gap: spacing[2] }}>
        {items
          .filter((item) => item.status === 'uploaded' || manuallyRevealed.has(item.key))
          .map((item) => {
            const isUploading = loadingMap?.[item.key];
            const hasFile = item.status === 'uploaded';

            return (
              <View
                key={item.key}
                style={{
                  borderWidth: 1.5,
                  borderStyle: hasFile ? 'solid' : 'dashed',
                  borderColor: hasFile ? colorRoles.success : colorRoles.borderStrong,
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
                {/* Right: preview/icon + label — tapping captures with the camera */}
                <Pressable
                  disabled={isUploading || !onPick}
                  onPress={() => onPick?.(item, 'camera')}
                  style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: spacing[3] }}
                >
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
                    <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
                      {item.label}
                    </Text>
                    {isUploading ? (
                      <Text role="caption" tone="action">جاري الرفع...</Text>
                    ) : hasFile ? (
                      <Text role="caption" tone="success">تم الإرفاق ✓</Text>
                    ) : (
                      <Text role="caption" tone="muted">اضغط للرفع أو التقاط صورة</Text>
                    )}
                  </View>
                </Pressable>

                {/* Left: attaches an existing photo from the device gallery, no camera */}
                {onPick && !isUploading && (
                  <View style={{ paddingStart: spacing[2] }}>
                    <Pressable
                      accessibilityLabel="اختر صورة"
                      onPress={() => onPick(item, 'library')}
                      hitSlop={12}
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
                      <Icon name={hasFile ? 'sync-outline' : 'add-outline'} size={18} tone="muted" />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
      </View>
    </View>
  );
}
