import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Box, Button, Icon, MobileScrollView, StateView, Surface, Text, TopBar, colorRoles, spacing } from '@bthwani/ui-kit';
import {
  StoreCaptainHandoffExceptionForm,
  useStoreCaptainHandoffException,
} from '../../shared/dispatch';
import {
  readCaptainForegroundLocation,
  type DshCaptainLocationPush,
} from '../../shared/delivery/use-captain-order-runtime';

export type OperationalCaptainExecutionScreenProps = {
  readonly assignmentId: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly currentStageLabel: string;
  readonly handoffExceptionEnabled: boolean;
  readonly podRequired: boolean;
  readonly onBack: () => void;
  readonly onRefresh: () => void | Promise<void>;
  readonly onConfirmPickup: () => void;
  readonly onConfirmDelivery: () => void;
  readonly onOpenPod: () => void;
  readonly onPushLocation: (push: DshCaptainLocationPush) => Promise<unknown>;
};

export function OperationalCaptainExecutionScreen({
  assignmentId,
  orderId,
  captainId,
  currentStageLabel,
  handoffExceptionEnabled,
  podRequired,
  onBack,
  onRefresh,
  onConfirmPickup,
  onConfirmDelivery,
  onOpenPod,
  onPushLocation,
}: OperationalCaptainExecutionScreenProps) {
  const [locationState, setLocationState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = React.useState<string | null>(null);
  const handoffException = useStoreCaptainHandoffException('captain', onRefresh);
  const handoffExceptionKind = handoffException.state.kind;
  const cancelHandoffException = handoffException.cancel;
  const handoffBlocked = handoffExceptionKind !== 'idle';

  React.useEffect(() => {
    if (
      !handoffExceptionEnabled
      && handoffExceptionKind !== 'idle'
      && handoffExceptionKind !== 'success'
    ) {
      cancelHandoffException();
    }
  }, [cancelHandoffException, handoffExceptionEnabled, handoffExceptionKind]);

  const pushCurrentLocation = async () => {
    if (!assignmentId || !captainId) {
      setLocationState('error');
      setLocationMessage('لا توجد مهمة نشطة مرتبطة بالكابتن.');
      return;
    }
    setLocationState('loading');
    setLocationMessage(null);
    try {
      const point = await readCaptainForegroundLocation();
      await onPushLocation({
        assignmentId,
        latitude: point.latitude,
        longitude: point.longitude,
      });
      setLocationState('success');
      setLocationMessage('تم تحديث آخر موقع فعلي للمهمة.');
    } catch (error) {
      setLocationState('error');
      setLocationMessage(error instanceof Error ? error.message : 'تعذر تحديث الموقع.');
    }
  };

  return (
    <View style={styles.root}>
      <TopBar title="تنفيذ المهمة" onBack={onBack} />
      <MobileScrollView fill padding={4} gap={4} contentContainerStyle={styles.content}>
        <Surface tone="action" gap={3}>
          <Text role="titleMd" style={styles.inverted}>{`الطلب #${orderId}`}</Text>
          <Text role="bodySm" style={styles.inverted}>{currentStageLabel}</Text>
          <Text role="caption" style={styles.inverted}>{`الإسناد: ${assignmentId}`}</Text>
        </Surface>

        <Surface tone="raised" gap={3}>
          <View style={styles.row}>
            <Icon name="navigate-outline" size={22} tone="brand" />
            <View style={styles.flex}>
              <Text role="bodyStrong">الموقع الفعلي فقط</Text>
              <Text role="bodySm" tone="muted">
                يُحدّث من GPS أثناء وجود التطبيق في المقدمة. لا تُرسل إحداثيات تجريبية ولا يُحفظ سجل للمسار.
              </Text>
            </View>
          </View>
          <Button
            label={locationState === 'loading' ? 'جارٍ قراءة GPS…' : 'تحديث موقعي الآن'}
            tone="secondary"
            disabled={locationState === 'loading'}
            onPress={() => void pushCurrentLocation()}
          />
          {locationMessage ? (
            <StateView
              title={locationState === 'success' ? 'تم تحديث الموقع' : 'تعذر تحديث الموقع'}
              description={locationMessage}
              tone={locationState === 'success' ? 'success' : 'danger'}
            />
          ) : null}
        </Surface>

        {handoffExceptionKind === 'success' ? (
          <StateView
            title="تم إيقاف الاستلام"
            description="سُجل استثناء العهدة في طابور العمليات. لا تؤكد الاستلام حتى تعالج العمليات البلاغ."
            tone="warning"
          />
        ) : null}

        {handoffExceptionKind !== 'idle' && handoffExceptionKind !== 'success' ? (
          <StoreCaptainHandoffExceptionForm
            entityLabel={`الإسناد ${assignmentId}`}
            state={handoffException.state}
            onReasonCodeChange={handoffException.setReasonCode}
            onNoteChange={handoffException.setNote}
            onSubmit={handoffException.submit}
            onCancel={cancelHandoffException}
          />
        ) : null}

        <Surface tone="raised" gap={3}>
          <Text role="bodyStrong">إجراءات المهمة</Text>
          <Box gap={2}>
            <Button
              label="تأكيد الاستلام"
              disabled={handoffBlocked}
              onPress={onConfirmPickup}
            />
            {handoffExceptionEnabled && handoffExceptionKind === 'idle' ? (
              <Button
                label="نقص أو عدم تطابق في الطرد"
                tone="danger"
                onPress={() => handoffException.begin(assignmentId)}
              />
            ) : null}
            <Button
              label={podRequired ? 'فتح إثبات التسليم' : 'تأكيد التسليم'}
              tone="secondary"
              onPress={podRequired ? onOpenPod : onConfirmDelivery}
            />
          </Box>
        </Surface>
      </MobileScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  content: { paddingBottom: spacing[8] },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3] },
  flex: { flex: 1, alignItems: 'flex-end', gap: spacing[1] },
  inverted: { color: colorRoles.surfaceBase, textAlign: 'right' },
});
