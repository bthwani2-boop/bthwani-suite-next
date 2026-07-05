import React from 'react';
import { Badge, Box, Button, ListItem, SectionHeader, Surface, Text } from '@bthwani/ui-kit';
import type { DshPartnerPreparationStage } from '../../shared/orders';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery';
import { getSurfaceModeCapability } from '../../shared/identity-access';

type PartnerFulfillmentMode = DshFulfillmentDeliveryMode;

const FULFILLMENT_MODE_INSTRUCTIONS: Record<PartnerFulfillmentMode, { title: string; instruction: string }> = {
  pickup: {
    title: 'استلام بنفسي',
    instruction: 'جهّز الطلب لاستلام العميل — لا كابتن ولا موصل.',
  },
  partner_delivery: {
    title: 'توصيل المتجر',
    instruction: 'جهّز الطلب وعيّن موصل الشريك — لا كابتن بثواني.',
  },
  bthwani_delivery: {
    title: 'توصيل بثواني',
    instruction: 'جهّز الطلب لتسليمه لكابتن بثواني — انتظر تعيين الكابتن.',
  },
};

export type PartnerOrderActionFlowId =
  | 'order-accept'
  | 'order-get'
  | 'order-prepare'
  | 'order-ready'
  | 'order-handoff'
  | 'order-out-for-delivery'
  | 'order-store-delivered';

const ORDER_ACTION_ITEMS: Array<DshPartnerPreparationStage & { id: PartnerOrderActionFlowId }> = [
  { id: 'order-accept', title: 'قبول الطلب', subtitle: 'ثبّت قبول الطلب ثم انقل الفريق إلى التحضير.', badgeLabel: 'قبول', lifecycleStatus: 'partner_accepted', prerequisiteStatus: 'operations_approved' },
  { id: 'order-get', title: 'استلام الطلب', subtitle: 'أكد استلام الطلب داخل الفرع قبل نقله إلى handoff أو المسار التالي.', badgeLabel: 'استلام', lifecycleStatus: 'partner_accepted', prerequisiteStatus: 'operations_approved' },
  { id: 'order-prepare', title: 'تحضير الطلب', subtitle: 'تابع التجهيز قبل الانتقال إلى الجاهزية.', badgeLabel: 'تحضير', lifecycleStatus: 'preparing', prerequisiteStatus: 'order_received' },
  { id: 'order-ready', title: 'تأكيد الجاهزية', subtitle: 'أعلن أن الطلب جاهز للتسليم من الفرع.', badgeLabel: 'جاهز', lifecycleStatus: 'ready_for_pickup' },
  { id: 'order-handoff', title: 'تسليم للمندوب', subtitle: 'ثبّت التسليم عند اكتمال التغليف والتحقق.', badgeLabel: 'تسليم', lifecycleStatus: 'picked_up' },
  { id: 'order-out-for-delivery', title: 'خرج للتوصيل', subtitle: 'تابع الحالة بعد مغادرة الطلب من الفرع.', badgeLabel: 'مسار', lifecycleStatus: 'enroute_to_dropoff' },
  { id: 'order-store-delivered', title: 'تسليم داخل المتجر', subtitle: 'أغلق حالة الاستلام عندما يكون الفرع هو نقطة التسليم.', badgeLabel: 'إغلاق', lifecycleStatus: 'delivered' },
];

export type DshPartnerOrderActionPanelProps = {
  activeFlowId?: PartnerOrderActionFlowId;
  fulfillmentMode?: PartnerFulfillmentMode;
  onSelectFlow?: (flowId: PartnerOrderActionFlowId) => void;
};

export function DshPartnerOrderActionPanel({ activeFlowId, fulfillmentMode, onSelectFlow }: DshPartnerOrderActionPanelProps) {
  const resolvedMode: PartnerFulfillmentMode = fulfillmentMode ?? 'bthwani_delivery';
  const modeInfo = FULFILLMENT_MODE_INSTRUCTIONS[resolvedMode];

  return (
    <Surface tone="raised" gap={3}>
      <SectionHeader
        title="مسارات تنفيذ الطلب"
        subtitle="إجراءات الطلب تبقى قصيرة وواضحة من القبول حتى الإغلاق دون أي منطق خلفي."
      />

      <Surface tone="default" gap={2}>
        <Text role="label">{modeInfo?.title}</Text>
        <Text role="bodySm" tone="muted">{modeInfo?.instruction}</Text>
      </Surface>

      {getSurfaceModeCapability(resolvedMode).partner.manageCourier ? (
        <Surface tone="raised" gap={2}>
          <SectionHeader
            title="موصل الشريك"
            subtitle="تعيين الموصل يتم عبر إعدادات الفريق لاحقًا."
          />
          <ListItem
            title="اسم الموصل"
            subtitle="لم يُعيَّن بعد — أضف موصل الشريك من إعدادات الفريق."
            trailing={<Badge label="معلّق" tone="neutral" />}
          />
          <ListItem
            title="حالة التعيين"
            subtitle="في انتظار التعيين من مشرف الفرع."
            trailing={<Badge label="لم يُعيَّن" tone="neutral" />}
          />
          <Box gap={2}>
            <Button label="جاهز للخروج" size="sm" tone="secondary" fullWidth={false} />
            <Button label="تم التسليم من طرف الشريك" size="sm" fullWidth={false} />
          </Box>
          <Text role="bodySm" tone="muted">
            موصل الشريك مسؤول عن التوصيل — لا كابتن بثواني في هذا الطلب.
          </Text>
        </Surface>
      ) : null}

      <Box gap={2}>
        {ORDER_ACTION_ITEMS.map((item) => (
          <ListItem
            key={item.id}
            title={item.title}
            subtitle={`${item.subtitle} — الحالة: ${item.lifecycleStatus}${item.prerequisiteStatus ? ` — يبدأ بعد: ${item.prerequisiteStatus}` : ''}`}
            trailing={<Badge label={item.badgeLabel} tone="neutral" />}
            meta={activeFlowId === item.id ? 'المسار النشط' : 'افتح المسار'}
            onPress={() => onSelectFlow?.(item.id as PartnerOrderActionFlowId)}
          />
        ))}
      </Box>
      <Text role="bodySm" tone="muted">
        كل مسار هنا تشغيلي فقط ومحدد ضمن دورة الطلب.
      </Text>
      <Button label="متابعة من داخل الطلب" tone="secondary" onPress={activeFlowId ? () => onSelectFlow?.(activeFlowId) : undefined} />
    </Surface>
  );
}

export default DshPartnerOrderActionPanel;
