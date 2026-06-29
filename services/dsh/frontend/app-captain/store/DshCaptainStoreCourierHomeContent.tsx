import React from 'react';
import { Button, Box, Badge, KeyValueList, MobileScrollView, Surface, Text } from '@bthwani/ui-kit';

type CourierStage = 'ready_for_pickup' | 'picked_up' | 'out_for_delivery' | 'delivery_failed' | 'delivered';

type StageMeta = {
  badgeLabel: string;
  badgeTone: 'success' | 'warning' | 'danger' | 'default' | 'brand' | 'info';
  stageLabel: string;
  distanceLabel: string;
  helperText: string;
};

function resolveStageMeta(stage: CourierStage): StageMeta {
  if (stage === 'picked_up') return { badgeLabel: 'تم الاستلام', badgeTone: 'brand', stageLabel: 'الطلب معك ويحتاج بدء التوصيل', distanceLabel: '1.6 كم', helperText: 'أكّد بدء التوصيل قبل الوصول إلى العميل.' };
  if (stage === 'out_for_delivery') return { badgeLabel: 'في الطريق', badgeTone: 'warning', stageLabel: 'الطلب في الطريق إلى العميل', distanceLabel: '0.9 كم', helperText: 'بعد الوصول افتح إثبات التسليم أو صنّف الحالة كتعذر توصيل.' };
  if (stage === 'delivery_failed') return { badgeLabel: 'تعذر التوصيل', badgeTone: 'danger', stageLabel: 'الحالة تحتاج دعمًا أو إعادة محاولة', distanceLabel: '—', helperText: 'افتح الدعم لتسجيل الاستثناء أو أعد المحاولة بعد التواصل مع العميل.' };
  if (stage === 'delivered') return { badgeLabel: 'مسلّم', badgeTone: 'success', stageLabel: 'تم التسليم وتوثيق الإثبات', distanceLabel: '—', helperText: 'يمكنك العودة للسجل أو مراجعة إثبات التسليم عند الحاجة.' };
  return { badgeLabel: 'جاهز للاستلام', badgeTone: 'success', stageLabel: 'جاهز للاستلام من الفرع', distanceLabel: '2.3 كم', helperText: 'هذا الطلب يخص وضع موصل المتجر فقط ولا يشارك طابور كابتن بثواني.' };
}

type Props = {
  courierStage: CourierStage;
  showBottomNav: boolean;
  isAndroid: boolean;
  safeAreaBottom: number;
  onMarkPickedUp: () => void;
  onMarkOutForDelivery: () => void;
  onOpenProof: () => void;
  onMarkDeliveryFailed: () => void;
  onRetryDelivery: () => void;
  onOpenSupport: () => void;
  onOpenOrders: () => void;
  bottomNavNode: React.ReactNode;
};

export function DshCaptainStoreCourierHomeContent({
  courierStage,
  showBottomNav,
  isAndroid,
  safeAreaBottom,
  onMarkPickedUp,
  onMarkOutForDelivery,
  onOpenProof,
  onMarkDeliveryFailed,
  onRetryDelivery,
  onOpenSupport,
  onOpenOrders,
  bottomNavNode,
}: Props) {
  const { badgeLabel, badgeTone, stageLabel, distanceLabel, helperText } = resolveStageMeta(courierStage);
  const bottomPadding = showBottomNav ? (isAndroid ? 112 : 80) + 16 : safeAreaBottom + 16;
  const SurfaceAny = Surface as any;

  return (
    <MobileScrollView padding={4} gap={4} contentContainerStyle={{ paddingBottom: bottomPadding }}>
      <SurfaceAny tone="raised" padding={3} gap={2} radiusToken="xl">
        <Box layoutDirection="row" align="center" justify="space-between" gap={2}>
          <Box gap={1}>
            <Text role="bodyStrong">وضع موصل المتجر</Text>
            <Text role="bodySm" tone="muted">تُعرض فقط الطلبات المسندة إليك من المتجر.</Text>
          </Box>
          <Badge label="نشط" tone="success" />
        </Box>
      </SurfaceAny>

      <SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
        <Text role="label" tone="muted">الطلب المسند</Text>
        <Box layoutDirection="row" align="center" justify="space-between" gap={2}>
          <Text role="bodyStrong">ORD-4401</Text>
          <Badge label={badgeLabel} tone={badgeTone as any} />
        </Box>
        <KeyValueList items={[
          { label: 'المتجر', value: 'فرع الياسمين' },
          { label: 'المرحلة', value: stageLabel },
          { label: 'المسافة', value: distanceLabel },
        ]} />
        <SurfaceAny tone="inset" padding={2} gap={1} radiusToken="lg">
          <Text role="caption" tone="muted">{helperText}</Text>
        </SurfaceAny>
        <Box gap={2}>
          {courierStage === 'ready_for_pickup' ? (
            <>
              <Button label="استلام من الفرع" tone="success" onPress={onMarkPickedUp} />
              <Button label="فتح الدعم" tone="secondary" onPress={onOpenSupport} />
            </>
          ) : null}
          {courierStage === 'picked_up' ? (
            <>
              <Button label="بدأ التوصيل" tone="primary" onPress={onMarkOutForDelivery} />
              <Button label="الرجوع إلى الاستلام" tone="secondary" onPress={onRetryDelivery} />
            </>
          ) : null}
          {courierStage === 'out_for_delivery' ? (
            <Box layoutDirection="row" gap={2}>
              <Box style={{ flex: 1 }}><Button label="تم التوصيل" tone="ghost" onPress={onOpenProof} /></Box>
              <Box style={{ flex: 1 }}><Button label="تعذر التوصيل" tone="danger" onPress={onMarkDeliveryFailed} /></Box>
            </Box>
          ) : null}
          {courierStage === 'delivery_failed' ? (
            <Box layoutDirection="row" gap={2}>
              <Box style={{ flex: 1 }}><Button label="إعادة المحاولة" tone="secondary" onPress={onRetryDelivery} /></Box>
              <Box style={{ flex: 1 }}><Button label="الدعم" tone="danger" onPress={onOpenSupport} /></Box>
            </Box>
          ) : null}
          {courierStage === 'delivered' ? (
            <Box layoutDirection="row" gap={2}>
              <Box style={{ flex: 1 }}><Button label="عرض إثبات التسليم" tone="secondary" onPress={onOpenProof} /></Box>
              <Box style={{ flex: 1 }}><Button label="فتح السجل" tone="ghost" onPress={onOpenOrders} /></Box>
            </Box>
          ) : null}
        </Box>
      </SurfaceAny>

      <SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
        <Text role="label" tone="muted">مستحقاتي من المتجر</Text>
        <KeyValueList items={[
          { label: 'اليوم', value: '45 ريال' },
          { label: 'هذا الأسبوع', value: '210 ريال' },
          { label: 'نوع الاستحقاق', value: 'مبلغ ثابت لكل توصيلة' },
        ]} />
        <SurfaceAny tone="inset" padding={2} gap={1} radiusToken="lg">
          <Text role="caption" tone="muted">هذا المبلغ من المتجر مباشرةً — ليس تسوية كابتن بثواني.</Text>
        </SurfaceAny>
      </SurfaceAny>
    </MobileScrollView>
  );
}
