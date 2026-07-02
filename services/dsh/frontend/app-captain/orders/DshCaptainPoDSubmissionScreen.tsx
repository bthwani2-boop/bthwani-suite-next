import React from 'react';
import { Pressable, StyleSheet, View, Image } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Icon,
  SectionHeader,
  Divider,
  Text,
  useTheme,
  colorPalette,
  spacing,
  radius,
  StateView,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import { getDshCaptainFlowPolicy } from '../dsh-captain-binding.contracts';
import { getDshFlowPolicySummary, resolveDshOnDemandPolicyLabel } from '../../shared/runtime/dsh-flow-registry';
import { resolveDshControlPanelSectionLabel } from '../../shared';

export type DshCaptainPoDSubmissionScreenProps = {
  state?: 'ready' | 'loading' | 'success' | 'error' | 'rejected' | 'retry-required';
  orderId: string;
  onCapturePhoto: () => void;
  onConfirm: () => void;
  onReportFailure: () => void;
  onBack?: () => void;
  onRetry?: () => void;
  photoUri?: string;
};

export function DshCaptainPoDSubmissionScreen({
  state = 'ready',
  orderId = 'ORD-9021',
  onCapturePhoto,
  onConfirm,
  onReportFailure,
  onBack,
  onRetry,
  photoUri,
}: DshCaptainPoDSubmissionScreenProps) {
  const theme = useTheme() as any;
  const podFlowPolicy = getDshCaptainFlowPolicy('captain-proof-of-delivery');
  const podFlowSummary = getDshFlowPolicySummary('captain-proof-of-delivery');
  const [proofGuideVisible, setProofGuideVisible] = React.useState(false);
  const [proofPreviewVisible, setProofPreviewVisible] = React.useState(false);

  if (state === 'success') {
    return (
      <View style={styles.root}>
        <StateView
          tone="success"
          title="تم رفع الإثبات بنجاح"
          description="تم تسجيل إثبات التسليم للطلب بنجاح. يمكنك الآن الانتقال للمهمة التالية."
          actionLabel="العودة لصندوق الطلبات"
          onActionPress={onBack}
        />
      </View>
    );
  }

  if (state === 'rejected') {
    return (
      <View style={styles.root}>
        <StateView
          tone="danger"
          title="فشل إثبات التسليم"
          description="الصورة المرفوعة غير واضحة أو لا تستوفي المعايير المطلوبة. يرجى إعادة المحاولة."
          actionLabel="إعادة المحاولة"
          onActionPress={onCapturePhoto}
        />
      </View>
    );
  }

  if (state === 'retry-required') {
    return (
      <View style={styles.root}>
        <StateView
          tone="danger"
          title="مطلوب إعادة التقاط الإثبات"
          description="refused proof: rejected proof"
          actionLabel="التقاط صورة جديدة"
          onActionPress={onCapturePhoto}
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.root}>
        <StateView
          tone="warning"
          title="فشل الاتصال بالخادم"
          description="تعذر إكمال العملية المطلوبة حالياً. يرجى التحقق من اتصال الشبكة وإعادة المحاولة."
          actionLabel="إعادة المحاولة"
          onActionPress={onRetry}
        />
      </View>
    );
  }

  return (
    <DshOperationScreen
      title="إثبات التسليم (PoD)"
      subtitle="يجب التقاط صورة واضحة للطلب عند باب العميل أو مع المستلم."
      content={
        <Box gap={4} style={{ paddingHorizontal: spacing[1] }}>
          <Box gap={3}>
            <Box layoutDirection="row" justify="space-between" align="center">
              <Badge label="إثبات مطلوب" tone="warning" />
              <Text role="caption" tone="muted">#{orderId}</Text>
            </Box>
            <Text role="bodySm" tone="muted">
              هذا الإثبات ضروري لإغلاق الطلب وضمان حقوق الكابتن والعميل.
            </Text>

            <Divider />

            <Box gap={2} paddingY={2}>
              <Box layoutDirection="row" align="center" justify="space-between" gap={2} style={{ flexDirection: 'row-reverse' }}>
                <Box gap={1} style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text role="bodyStrong" style={{ textAlign: 'right' }}>سياسة الإثبات من السجل المركزي</Text>
                  <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                    {podFlowSummary?.nextPolicyActionPreview ?? 'الإثبات أو معاينته لا يظهران إلا عند فتحهما من داخل المهمة.'}
                  </Text>
                </Box>
                <Badge label={resolveDshOnDemandPolicyLabel(podFlowPolicy)} tone="action" />
              </Box>
              <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                {`المراجعة التشغيلية النهائية يملكها ${resolveDshControlPanelSectionLabel('support')}.`}
              </Text>
            </Box>
          </Box>

          <Divider />

          <Box style={{ paddingVertical: spacing[1], overflow: 'hidden' }}>
            <Pressable onPress={onCapturePhoto} style={[styles.photoContainer, { backgroundColor: theme.surfaceInset }]}>
              {photoUri && proofPreviewVisible ? (
                <View style={styles.previewWrapper}>
                  <Image source={{ uri: photoUri }} style={styles.previewImage} />
                  <View style={styles.changeOverlay}>
                    <Icon name="camera-outline" size={24} color={colorPalette.white} />
                    <Text role="bodySm" style={{ color: colorPalette.white }}>تغيير الصورة</Text>
                  </View>
                </View>
              ) : photoUri ? (
                <View style={styles.placeholderWrapper}>
                  <Icon name="image-outline" size={40} tone="brand" />
                  <Text role="titleMd" style={[styles.placeholderText, { color: theme.brandStrong || theme.text }]}>تم حفظ لقطة الإثبات</Text>
                  <Text role="caption" tone="muted">افتح المعاينة عند الحاجة فقط ثم ثبّت الإرسال.</Text>
                </View>
              ) : (
                <View style={styles.placeholderWrapper}>
                  <Icon name="camera" size={48} tone="brand" />
                  <Text role="titleMd" style={[styles.placeholderText, { color: theme.brandStrong || theme.text }]}>اضغط لالتقاط صورة</Text>
                  <Text role="caption" tone="muted">صورة واضحة للطلب في موقع التسليم</Text>
                </View>
              )}
            </Pressable>
          </Box>

          {photoUri ? (
            <Button
              label={proofPreviewVisible ? 'إخفاء معاينة الإثبات' : 'عرض معاينة الإثبات'}
              tone={proofPreviewVisible ? 'secondary' : 'ghost'}
              fullWidth={false}
              size="sm"
              onPress={() => setProofPreviewVisible((current) => !current)}
            />
          ) : null}

          <Divider />

          <Box gap={2} paddingY={2}>
            <SectionHeader title="شروط الإثبات الصحيح" subtitle="تأكد من النقاط التالية لتجنب رفض الإثبات." />
            <Button
              label={proofGuideVisible ? 'إخفاء الشروط' : 'فتح الشروط'}
              tone={proofGuideVisible ? 'secondary' : 'ghost'}
              size="sm"
              fullWidth={false}
              onPress={() => setProofGuideVisible((current) => !current)}
            />
            {proofGuideVisible ? (
              <Box gap={1}>
                <Text role="caption" tone="muted">• ظهور الطلب بشكل كامل وواضح.</Text>
                <Text role="caption" tone="muted">• ظهور علامة واضحة للموقع (رقم الشقة أو الباب) إن أمكن.</Text>
                <Text role="caption" tone="muted">• تجنب تصوير وجوه الأشخاص حفاظاً على الخصوصية.</Text>
              </Box>
            ) : (
              <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                افتح هذا الجزء فقط عند مراجعة معايير الإثبات قبل الإرسال.
              </Text>
            )}
          </Box>

          <Box paddingY={2}>
            <Button
              label="لا يمكنني التقاط صورة"
              tone="secondary"
              onPress={onReportFailure}
            />
          </Box>
        </Box>
      }
      primaryActionLabel="تأكيد وإرسال الإثبات"
      onPrimaryAction={onConfirm}
      primaryActionDisabled={!photoUri || state === 'loading'}
      primaryActionLoading={state === 'loading'}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  photoContainer: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  placeholderText: {
  },
  previewWrapper: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
});
export default DshCaptainPoDSubmissionScreen;
