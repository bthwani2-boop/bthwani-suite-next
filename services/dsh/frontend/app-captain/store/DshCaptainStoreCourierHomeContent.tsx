import React from 'react';
import { Button, Box, Badge, KeyValueList, Surface, Text } from '@bthwani/ui-kit';

type CourierStage = 'ready_for_pickup' | 'picked_up' | 'out_for_delivery' | 'delivery_failed' | 'delivered';

type StageMeta = {
  badgeLabel: string;
  badgeTone: 'success' | 'warning' | 'danger' | 'default' | 'brand' | 'info';
  stageLabel: string;
  helperText: string;
};

function resolveStageMeta(stage: CourierStage): StageMeta {
  if (stage === 'picked_up') return { badgeLabel: 'تم الاستلام', badgeTone: 'brand', stageLabel: 'الطلب معك ويحتاج بدء التوصيل', helperText: 'أكّد بدء التوصيل قبل الوصول إلى العميل.' };
  if (stage === 'out_for_delivery') return { badgeLabel: 'في الطريق', badgeTone: 'warning', stageLabel: 'الطلب في الطريق إلى العميل', helperText: 'بعد الوصول افتح إثبات التسليم أو صنّف الحالة كتعذر توصيل.' };
  if (stage === 'delivery_failed') return { badgeLabel: 'تعذر التوصيل', badgeTone: 'danger', stageLabel: 'الحالة تحتاج دعمًا أو إعادة محاولة', helperText: 'افتح الدعم لتسجيل الاستثناء أو أعد المحاولة بعد التواصل مع العميل.' };
  if (stage === 'delivered') return { badgeLabel: 'مسلّم', badgeTone: 'success', stageLabel: 'تم التسليم وتوثيق الإثبات', helperText: 'يمكنك العودة للسجل أو مراجعة إثبات التسليم عند الحاجة.' };
  return { badgeLabel: 'جاهز للاستلام', badgeTone: 'success', stageLabel: 'جاهز للاستلام من الفرع', helperText: 'هذا الطلب يخص وضع موصل المتجر فقط ولا يشارك طابور كابتن بثواني.' };
}

type Props = {
  courierStage: CourierStage;
  orderLabel: string;
  storeLabel: string;
  distanceLabel?: string | null;
  earningTodayLabel?: string | null;
  earningWeekLabel?: string | null;
  earningPolicyLabel?: string | null;
  onMarkPickedUp: () => void;
  onMarkOutForDelivery: () => void;
  onOpenProof: () => void;
  onMarkDeliveryFailed: () => void;
  onRetryDelivery: () => void;
  onOpenSupport: () => void;
  onOpenOrders: () => void;
};

export function DshCaptainStoreCourierHomeContent({
  courierStage,
  orderLabel,
  storeLabel,
  distanceLabel,
  earningTodayLabel,
  earningWeekLabel,
  earningPolicyLabel,
  onMarkPickedUp,
  onMarkOutForDelivery,
  onOpenProof,
  onMarkDeliveryFailed,
  onRetryDelivery,
  onOpenSupport,
  onOpenOrders,
}: Props) {
  const { badgeLabel, badgeTone, stageLabel, helperText } = resolveStageMeta(courierStage);
  const SurfaceAny = Surface as any;

  return (
    <Box gap={4}>
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
          <Text role="bodyStrong">{orderLabel}</Text>
          <Badge label={badgeLabel} tone={badgeTone as any} />
        </Box>
        <KeyValueList items={[
          { label: 'المتجر', value: storeLabel },
          { label: 'المرحلة', value: stageLabel },
          { label: 'المسافة', value: distanceLabel ?? 'غير محسوبة' },
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
          { label: 'اليوم', value: earningTodayLabel ?? 'غير متاح' },
          { label: 'هذا الأسبوع', value: earningWeekLabel ?? 'غير متاح' },
          { label: 'نوع الاستحقاق', value: earningPolicyLabel ?? 'غير مربوط بعد' },
        ]} />
        <SurfaceAny tone="inset" padding={2} gap={1} radiusToken="lg">
          <Text role="caption" tone="muted">تظهر المستحقات فقط عند وصول قراءة موثقة من DSH/WLT أو عقد الشريك ذي العلاقة.</Text>
        </SurfaceAny>
      </SurfaceAny>
    </Box>
  );
}
