import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  Button,
  Icon,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  TopBar,
  colorRoles,
  spacing,
} from '@bthwani/ui-kit';
import type { DshCaptainLocationPush } from '../../shared/delivery';

export type OperationalCaptainExecutionScreenProps = {
  readonly assignmentId: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly currentStageLabel: string;
  readonly podRequired: boolean;
  readonly onBack: () => void;
  readonly onConfirmPickup: () => void;
  readonly onConfirmDelivery: () => void;
  readonly onOpenPod: () => void;
  readonly onPushLocation: (push: DshCaptainLocationPush) => Promise<unknown>;
};

async function readForegroundLocation(): Promise<{ latitude: number; longitude: number }> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('خدمة الموقع غير متاحة في هذا الجهاز.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        () => reject(new Error('تعذر قراءة الموقع الحالي.')),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    });
  }

  // @ts-ignore optional device dependency
  const Location = await import('expo-location');
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('صلاحية الموقع مطلوبة أثناء تنفيذ المهمة.');
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function OperationalCaptainExecutionScreen({
  assignmentId,
  orderId,
  captainId,
  currentStageLabel,
  podRequired,
  onBack,
  onConfirmPickup,
  onConfirmDelivery,
  onOpenPod,
  onPushLocation,
}: OperationalCaptainExecutionScreenProps) {
  const [locationState, setLocationState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = React.useState('');

  if (!assignmentId) {
    return (
      <StateView
        title="لا توجد مهمة نشطة"
        description="اختر إسنادًا حقيقيًا من صندوق الطلبات قبل فتح التنفيذ الميداني."
        tone="warning"
        actionLabel="العودة"
        onActionPress={onBack}
      />
    );
  }

  const pushCurrentLocation = async () => {
    setLocationState('loading');
    setLocationMessage('');
    try {
      const point = await readForegroundLocation();
      await onPushLocation({
        // The runtime contract currently names this field orderId, but the
        // authority key passed here is intentionally the assignment id.
        orderId: assignmentId,
        captainId,
        latitude: point.latitude,
        longitude: point.longitude,
        lifecycleStatus: currentStageLabel,
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
      <TopBar title="تنفيذ المهمة" onBackPress={onBack} />
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
            <Text role="bodySm" tone={locationState === 'error' ? 'danger' : 'success'}>
              {locationMessage}
            </Text>
          ) : null}
        </Surface>

        <Surface tone="raised" gap={3}>
          <Text role="titleSm">انتقالات المهمة</Text>
          <Button label="تأكيد الاستلام من المتجر" onPress={onConfirmPickup} />
          {podRequired ? (
            <Button label="فتح إثبات التسليم" tone="primary" onPress={onOpenPod} />
          ) : (
            <Button label="تأكيد التسليم" tone="primary" onPress={onConfirmDelivery} />
          )}
          <Text role="caption" tone="muted">
            كل انتقال يثبت في DSH ويظهر للعميل ولوحة العمليات؛ لا يوجد تحديث محلي متفائل.
          </Text>
        </Surface>
      </MobileScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceWarm },
  content: { paddingBottom: spacing[12] },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3] },
  flex: { flex: 1, alignItems: 'flex-end', gap: spacing[1] },
  inverted: { color: colorRoles.surfaceBase, textAlign: 'right' },
});
