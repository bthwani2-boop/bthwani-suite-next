import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Box, Button, StateView, Surface, Text, colorRoles, spacing } from '@bthwani/ui-kit';
import { OperationHeader } from '../account/OperationHeader';
import { DELIVERY_STATUS_LABELS } from '../../shared/dispatch';
import { usePartnerDispatchTracking } from '../../shared/dispatch/use-partner-dispatch-tracking';

export function PartnerDispatchTrackingScreen({
  orderId,
  onBack,
}: {
  readonly orderId: string;
  readonly onBack: () => void;
}) {
  const { state, reload } = usePartnerDispatchTracking(orderId);

  return (
    <Box gap={4}>
      <OperationHeader
        title="مرجع التوصيل"
        subtitle="قراءة مرجعية لحالة الكابتن ووقت الوصول فقط. لا يعرض هذا السطح إحداثيات الكابتن ولا يغيّر دورة التوصيل."
        actions={<Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} />}
      />

      {state.kind === 'loading' ? (
        <StateView title="جارٍ تحميل مرجع التوصيل" description="نقرأ أحدث حالة من DSH." loading />
      ) : state.kind === 'empty' ? (
        <StateView
          title="لا يوجد إسناد توصيل"
          description="لم تُنشأ مهمة كابتن لهذا الطلب بعد أو انتهى مرجعها."
          actionLabel="إعادة التحقق"
          onActionPress={() => void reload()}
        />
      ) : state.kind === 'error' ? (
        <StateView
          title="تعذر تحميل مرجع التوصيل"
          description={state.message}
          tone="danger"
          actionLabel="إعادة المحاولة"
          onActionPress={() => void reload()}
        />
      ) : (
        <>
          <Surface tone="raised" gap={3}>
            <Box layoutDirection="row" justify="space-between" align="center">
              <Text role="titleSm">الحالة المرجعية</Text>
              <Badge
                label={DELIVERY_STATUS_LABELS[state.value.assignment.delivery.status]}
                tone={state.value.assignment.delivery.status === 'delivered' ? 'success' : 'info'}
              />
            </Box>
            <View style={styles.row}>
              <Text role="bodySm" tone="muted">معرف الطلب</Text>
              <Text role="bodyStrong">{state.value.assignment.orderId}</Text>
            </View>
            <View style={styles.row}>
              <Text role="bodySm" tone="muted">معرف الإسناد</Text>
              <Text role="bodyStrong">{state.value.assignment.id}</Text>
            </View>
            <View style={styles.row}>
              <Text role="bodySm" tone="muted">آخر تحديث</Text>
              <Text role="bodyStrong">{new Date(state.value.assignment.updatedAt).toLocaleString('ar-YE')}</Text>
            </View>
          </Surface>

          <Surface tone="inset" gap={2}>
            <Text role="bodyStrong">حدود الخصوصية</Text>
            <Text role="bodySm" tone="muted">
              الإحداثيات محجوبة عن الشريك. يعرض DSH الحالة وETA المرجعي فقط، بينما تبقى تفاصيل الموقع للعميل ضمن نافذة التوصيل وللمشغل وفق الصلاحية.
            </Text>
          </Surface>

          {state.value.tracking.eta ? (
            <Surface tone="raised" gap={2}>
              <Text role="titleSm">وقت الوصول المرجعي</Text>
              <Text role="titleMd">
                {`${Math.max(0, Math.ceil(state.value.tracking.eta.durationSeconds / 60))} دقيقة`}
              </Text>
              <Text role="bodySm">
                {new Date(state.value.tracking.eta.estimatedArrivalAt).toLocaleString('ar-YE')}
              </Text>
              <Text role="caption" tone="muted">
                {`مزود المسار: ${state.value.tracking.eta.providerCode}`}
              </Text>
            </Surface>
          ) : (
            <StateView
              title="ETA غير متاح الآن"
              description={state.value.tracking.routeState === 'location_lost'
                ? 'انقطع تحديث الموقع وتحتاج المهمة إلى متابعة العمليات.'
                : 'سيظهر وقت الوصول بعد بدء مسار التوصيل وتوفر عينة موقع حديثة.'}
              tone={state.value.tracking.routeState === 'location_lost' ? 'warning' : 'neutral'}
            />
          )}

          <Button label="تحديث المرجع" tone="secondary" onPress={() => void reload()} />
        </>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
});
