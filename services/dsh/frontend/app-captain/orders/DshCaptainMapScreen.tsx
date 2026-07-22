import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Box,
  KeyValueList,
  SectionHeader,
  Surface,
  Text,
  colorRoles,
  spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen, type DshOperationScreenState } from '../DshOperationScreen';
import { getDshCaptainFlowPolicy } from '../dsh-captain-binding.contracts';
import { getDshFlowPolicySummary } from '../../shared/operations/dsh-operational-registry';
import {
  readCaptainForegroundLocation,
  type DshCaptainLocationPush,
} from '../../shared/delivery';

type LastLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
  readonly recordedAt: string;
  readonly syncState: 'sent' | 'queued';
};

export interface DshCaptainMapScreenProps {
  readonly assignmentId: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly currentStageLabel: string;
  readonly onBack: () => void;
  readonly onPushLocation: (push: DshCaptainLocationPush) => Promise<unknown>;
}

function locationSyncKind(result: unknown): 'sent' | 'queued' {
  if (
    typeof result === 'object'
    && result !== null
    && 'kind' in result
    && (result as { readonly kind?: unknown }).kind === 'queued'
  ) {
    return 'queued';
  }
  return 'sent';
}

export function DshCaptainMapScreen({
  assignmentId,
  orderId,
  captainId,
  currentStageLabel,
  onBack,
  onPushLocation,
}: DshCaptainMapScreenProps) {
  const [screenState, setScreenState] = React.useState<DshOperationScreenState>('ready');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [lastLocation, setLastLocation] = React.useState<LastLocation | null>(null);

  const mapFlowPolicy = getDshCaptainFlowPolicy('captain-map-navigation');
  const mapFlowSummary = getDshFlowPolicySummary('captain-map-navigation');

  const pushCurrentLocation = async () => {
    if (!assignmentId || !orderId || !captainId) {
      setErrorMessage('لا توجد مهمة حية مكتملة لربط تحديث الموقع.');
      return;
    }

    setScreenState('loading');
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const point = await readCaptainForegroundLocation();
      const recordedAt = new Date().toISOString();
      const result = await onPushLocation({
        assignmentId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracyMeters: point.accuracyMeters,
        recordedAt,
      });
      const syncState = locationSyncKind(result);
      setLastLocation({ ...point, recordedAt, syncState });
      setSuccessMessage(
        syncState === 'sent'
          ? 'تم إرسال الموقع المصدق وربطه بالإسناد النشط.'
          : 'الشبكة غير مستقرة. حُفظت آخر عينة للنقل وستعاد مزامنتها عند عودة الاتصال.',
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث الموقع الفعلي.');
    } finally {
      setScreenState('ready');
    }
  };

  return (
    <DshOperationScreen
      state={screenState}
      title="الموقع الحي للمهمة"
      subtitle={`الطلب ${orderId} · الإسناد ${assignmentId}`}
      content={
        <Box gap={3}>
          {errorMessage ? (
            <Surface tone="danger" padding={3} gap={1}>
              <Text role="bodyStrong" tone="danger">تعذر تحديث الموقع</Text>
              <Text role="bodySm" tone="danger">{errorMessage}</Text>
            </Surface>
          ) : null}

          {successMessage ? (
            <Surface tone="raised" padding={3} gap={1}>
              <Text role="bodyStrong" tone="success">حالة مزامنة الموقع</Text>
              <Text role="bodySm" tone="success">{successMessage}</Text>
            </Surface>
          ) : null}

          <Surface tone="action" gap={3}>
            <View style={styles.headerRow}>
              <Badge label="GPS مصدق" tone="success" />
              <Text role="bodyStrong" style={styles.inverted}>{currentStageLabel}</Text>
            </View>
            <Text role="bodySm" style={styles.inverted}>
              لا تُعرض أو تُرسل إحداثيات افتراضية. لا يقبل DSH العينة إلا بدقة لا تتجاوز 100 متر ومن مقدمة التطبيق فقط.
            </Text>
          </Surface>

          <Surface tone="raised" gap={3}>
            <SectionHeader
              title="مرجع المهمة الحي"
              subtitle="المعرفات والحالة تأتي من DSH ولا تُنشأ محليًا داخل الشاشة."
            />
            <KeyValueList
              items={[
                { label: 'معرف الإسناد', value: assignmentId },
                { label: 'معرف الطلب', value: orderId },
                { label: 'معرف الكابتن', value: captainId },
                { label: 'الحالة التشغيلية', value: currentStageLabel },
              ]}
            />
          </Surface>

          <Surface tone="raised" gap={3}>
            <SectionHeader
              title="آخر عينة من هذا الجهاز"
              subtitle="تُحفظ عينة نقل واحدة مؤقتًا عند انقطاع الشبكة، ولا يُنشأ سجل مسار محلي."
            />
            {lastLocation ? (
              <KeyValueList
                items={[
                  { label: 'خط العرض', value: lastLocation.latitude.toFixed(6) },
                  { label: 'خط الطول', value: lastLocation.longitude.toFixed(6) },
                  { label: 'الدقة', value: `${Math.round(lastLocation.accuracyMeters)} متر` },
                  { label: 'المزامنة', value: lastLocation.syncState === 'sent' ? 'أرسلت إلى DSH' : 'بانتظار الشبكة' },
                  {
                    label: 'وقت أخذ العينة',
                    value: new Date(lastLocation.recordedAt).toLocaleString('ar-YE'),
                  },
                ]}
              />
            ) : (
              <Text role="bodySm" tone="muted">
                لم تؤخذ عينة موقع من هذه الشاشة بعد. استخدم زر التحديث لقراءة GPS الفعلي.
              </Text>
            )}
          </Surface>

          <Surface tone="inset" gap={2} padding={3}>
            <Text role="bodyStrong">سياسة الملاحة</Text>
            <Text role="bodySm" tone="muted">
              {mapFlowSummary?.nextPolicyActionPreview ?? 'تعرض الشاشة حقيقة المهمة وتحديث الموقع فقط.'}
            </Text>
            <Text role="caption" tone="muted">
              {`النمط: ${mapFlowPolicy ?? 'live-location-only'}`}
            </Text>
          </Surface>
        </Box>
      }
      primaryActionLabel="تحديث موقعي المصدق"
      tertiaryActionLabel="العودة للتفاصيل"
      onPrimaryAction={() => void pushCurrentLocation()}
      onTertiaryAction={onBack}
    />
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  inverted: {
    color: colorRoles.surfaceBase,
    textAlign: 'right',
  },
});
