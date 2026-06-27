// app-field — Step 3: المستندات والتراخيص الرسمية
// Extracted 1:1 from bthwani-suite donor. No business logic here.
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text, spacing, radius, colorRoles, Icon } from '@bthwani/ui-kit';

export type DocumentKind = 'commercial_registration' | 'identity_proof';

export type DocumentStatus = 'missing' | 'uploaded' | 'approved' | 'rejected' | 'needs_reupload';

export type DocumentItem = {
  readonly id: DocumentKind;
  readonly label: string;
  readonly required: boolean;
  readonly status: DocumentStatus;
  readonly referenceLabel?: string;
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  missing: 'مفقود',
  uploaded: 'مرفوع',
  approved: 'معتمد',
  rejected: 'مرفوض',
  needs_reupload: 'يحتاج إعادة رفع',
};

const STATUS_TONE: Record<DocumentStatus, 'success' | 'action' | 'warning' | 'danger' | 'muted'> = {
  missing: 'muted',
  uploaded: 'action',
  approved: 'success',
  rejected: 'danger',
  needs_reupload: 'warning',
};

type Props = {
  readonly documents: readonly DocumentItem[];
  readonly loadingMap?: Record<string, boolean>;
  readonly onUploadDocument?: (kind: DocumentKind) => void;
};

export function StepDocuments({ documents, loadingMap, onUploadDocument }: Props) {
  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        المستندات والتراخيص الرسمية
      </Text>

      <Text role="titleSm" style={{ textAlign: 'right' }}>التحقق من المستندات</Text>
      <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
        حالة المستندات المرفقة للمراجعة والتدقيق.
      </Text>

      <View style={{ gap: spacing[2] }}>
        {documents.map((doc) => {
          const isUploading = loadingMap?.[doc.id];
          const hasFile = doc.status !== 'missing';

          return (
            <Pressable
              key={doc.id}
              disabled={isUploading || !onUploadDocument}
              onPress={() => onUploadDocument?.(doc.id)}
              style={({ pressed }) => [
                {
                  borderWidth: 1.5,
                  borderStyle: hasFile ? 'solid' : 'dashed',
                  borderColor:
                    doc.status === 'rejected'
                      ? colorRoles.danger
                      : hasFile
                      ? colorRoles.success
                      : colorRoles.borderStrong,
                  borderRadius: radius.md,
                  backgroundColor: colorRoles.surfaceBase,
                  padding: spacing[3],
                  flexDirection: 'row-reverse' as const,
                  alignItems: 'center' as const,
                  justifyContent: 'space-between' as const,
                  minHeight: 80,
                  overflow: 'hidden' as const,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              {/* Right: Doc icon / spinner */}
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: spacing[3] }}>
                {isUploading ? (
                  <View style={{ width: 56, height: 56, borderRadius: radius.xs, backgroundColor: colorRoles.surfaceMuted, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colorRoles.borderStrong }}>
                    <ActivityIndicator size="small" color={colorRoles.brandAction} />
                  </View>
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: radius.xs, backgroundColor: colorRoles.surfaceMuted, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colorRoles.borderStrong }}>
                    <Icon name="document-text-outline" size={24} tone="muted" />
                  </View>
                )}

                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
                    {doc.label}{' '}
                    {doc.required && <Text role="bodySm" tone="danger">*</Text>}
                  </Text>
                  {isUploading ? (
                    <Text role="caption" tone="action">جاري رفع المستند...</Text>
                  ) : hasFile ? (
                    <Text role="caption" tone={STATUS_TONE[doc.status]}>
                      تم الرفع ({STATUS_LABEL[doc.status]}) ✓
                    </Text>
                  ) : (
                    <Text role="caption" tone="muted">اضغط للرفع أو التقاط صورة</Text>
                  )}
                  {doc.referenceLabel && !isUploading && (
                    <Text role="caption" tone="muted" style={{ fontSize: 10, textAlign: 'right', marginTop: 2 }} numberOfLines={1}>
                      لا يوجد مرجع مرفوع بعد
                    </Text>
                  )}
                </View>
              </View>

              {/* Left: Action icon */}
              {onUploadDocument && !isUploading && (
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
                    <Icon name={hasFile ? 'sync-outline' : 'add-outline'} size={18} tone="muted" />
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
