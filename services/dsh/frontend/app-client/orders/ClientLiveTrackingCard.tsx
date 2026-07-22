import React from 'react';
import { View } from 'react-native';
import { Badge, Box, Icon, Surface, Text } from '@bthwani/ui-kit';
import type { DshLiveTrackingProjection } from '../../shared/dispatch/dispatch-tracking.api';
import { ClientDeliveryProofPanel } from './ClientDeliveryProofPanel';

function freshnessLabel(state: 'fresh' | 'stale' | 'lost'): string {
  if (state === 'fresh') return 'موقع حديث';
  if (state === 'stale') return 'الموقع متأخر';
  return 'انقطع تحديث الموقع';
}

function routeMessage(tracking: DshLiveTrackingProjection): string {
  switch (tracking.routeState) {
    case 'awaiting_location':
      return 'بانتظار أول تحديث موقع مصدق من الكابتن.';
    case 'location_lost':
      return 'توقف تحديث موقع الكابتن. تعمل العمليات على متابعة المهمة.';
    case 'destination_unavailable':
      return 'تعذر احتساب الوصول لأن وجهة الطلب غير متاحة للمسار.';
    case 'provider_unavailable':
      return 'خدمة المسار غير متاحة الآن. حالة المهمة ما زالت محدثة.';
    case 'arrived':
      return 'وصل الكابتن إلى موقع التسليم.';
    case 'ready':
      return 'وقت الوصول محسوب من مزود المسار المعتمد.';
    default:
      return 'سيظهر وقت الوصول بعد استلام الكابتن للطلب وبدء الطريق.';
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(0, Math.ceil(seconds / 60));
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} ساعة` : `${hours} ساعة و${remainder} دقيقة`;
}

export function ClientLiveTrackingCard({
  tracking,
}: {
  readonly tracking: DshLiveTrackingProjection | null;
}) {
  if (!tracking) {
    return (
      <Surface tone="raised" gap={2}>
        <Text role="titleSm">التتبع الحي</Text>
        <Text role="bodySm" tone="muted">
          لا يوجد إسقاط تتبع متاح لهذه المرحلة. تبقى حالة الطلب هي المرجع التشغيلي.
        </Text>
      </Surface>
    );
  }

  const freshness = tracking.location?.freshnessState;
  const eta = tracking.eta;

  return (
    <Box gap={3}>
      <Surface tone="raised" gap={3}>
        <Box layoutDirection="row" justify="space-between" align="center">
          <Text role="titleSm">التتبع الحي ووقت الوصول</Text>
          <Badge
            label={freshness ? freshnessLabel(freshness) : 'الموقع محمي'}
            tone={freshness === 'lost' ? 'danger' : freshness === 'stale' ? 'warning' : freshness === 'fresh' ? 'success' : 'neutral'}
          />
        </Box>

        <View>
          <Text role="bodySm" tone="muted">حماية الخصوصية</Text>
          <Text role="bodyStrong">
            {tracking.locationVisibility === 'delivery_window_rounded'
              ? 'تظهر إحداثيات تقريبية فقط أثناء نافذة التوصيل.'
              : 'موقع الكابتن مخفي حتى يستلم الطلب من المتجر.'}
          </Text>
        </View>

        {eta ? (
          <Box gap={2}>
            <Box layoutDirection="row" align="center" gap={2}>
              <Icon name="time-outline" size={20} tone="brand" />
              <Text role="titleMd">{formatDuration(eta.durationSeconds)}</Text>
            </Box>
            <Text role="bodySm">
              {`الوصول المتوقع ${new Date(eta.estimatedArrivalAt).toLocaleString('ar-YE')}`}
            </Text>
            <Text role="caption" tone="muted">
              {`المسافة التقريبية ${Math.max(0, Math.round(eta.distanceMeters / 100) / 10)} كم · المزود ${eta.providerCode}`}
            </Text>
          </Box>
        ) : (
          <Text role="bodySm" tone={tracking.routeState === 'location_lost' ? 'danger' : 'muted'}>
            {routeMessage(tracking)}
          </Text>
        )}

        {tracking.location ? (
          <Text role="caption" tone="muted">
            {`آخر تحديث منذ ${Math.max(0, tracking.location.ageSeconds)} ثانية · الدقة المعروضة محدودة لحماية الكابتن`}
          </Text>
        ) : null}
      </Surface>

      {tracking.orderId ? (
        <ClientDeliveryProofPanel
          orderId={tracking.orderId}
          captainArrived={tracking.routeState === 'arrived'}
        />
      ) : null}
    </Box>
  );
}
