import React from 'react';
import { Badge, Box, Button, Chip, ListItem, StateView, Surface, Text } from '@bthwani/ui-kit';
import type { DshPartnerOperationalFlowId } from '../dsh-partner.types';
import type { DshPartnerOrderAlertItem } from '../../shared/orders';

type DshPartnerOrderAlertsPanelState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled';

export type DshPartnerOrderAlertsPanelProps = {
  state?: DshPartnerOrderAlertsPanelState;
  activeOrderId?: string;
  items?: readonly DshPartnerOrderAlertItem[];
  onOpenOrder?: (orderId: string) => void;
  onOpenFlow?: (flowId: DshPartnerOperationalFlowId) => void;
  onRetry?: () => void;
};

const defaultItems: DshPartnerOrderAlertItem[] = [
  {
    id: 'order-alert-1',
    orderId: 'ord-4401',
    alertId: 'order_needs_accept',
    title: 'طلب يحتاج قبولًا فوريًا',
    description: 'الطلب 4401 دخل الآن إلى الفرع ويحتاج قرار قبول سريع قبل بدء التجهيز.',
    timeLabel: 'منذ دقيقتين',
    status: 'new',
    urgent: true,
  },
  {
    id: 'order-alert-2',
    orderId: 'ord-4391',
    alertId: 'order_ready',
    title: 'طلب جاهز للتسليم',
    description: 'الطلب 4391 أصبح جاهزًا ويحتاج نقلًا فوريًا إلى مسار التسليم للكابتن.',
    timeLabel: 'منذ 5 دقائق',
    status: 'new',
  },
  {
    id: 'order-alert-3',
    orderId: 'ord-4385',
    alertId: 'order_handoff_pending',
    title: 'تسليم للكابتن بانتظار الإغلاق',
    description: 'الطلب 4385 بانتظار تثبيت التسليم للكابتن من نفس دورة الطلب.',
    timeLabel: 'منذ 9 دقائق',
    status: 'seen',
  },
  {
    id: 'order-alert-4',
    orderId: 'ord-4359',
    alertId: 'order_issue_required',
    title: 'طلب يحتاج معالجة مشكلة',
    description: 'الطلب 4359 يحتاج قرارًا واضحًا بسبب نقص عنصر بعد القبول.',
    timeLabel: 'منذ 14 دقيقة',
    status: 'new',
    urgent: true,
  },
];

function renderState(state: Exclude<DshPartnerOrderAlertsPanelState, 'ready'>, onRetry?: () => void) {
  if (state === 'loading') {
    return <StateView title="جارٍ تجهيز تنبيهات الطلب" description="نرتب التنبيهات المرتبطة بدورة الطلب الحالية فقط." />;
  }

  if (state === 'empty') {
    return <StateView title="لا توجد تنبيهات طلب الآن" description="عند ظهور طلب يحتاج قبولًا أو معالجة سيظهر هنا داخل نفس سياق الطلب." actionLabel={onRetry ? 'تحديث' : undefined} onActionPress={onRetry} />;
  }

  if (state === 'offline') {
    return <StateView title="تنبيهات الطلب غير متصلة" description="أعد المحاولة عند عودة الاتصال لاسترجاع آخر تنبيه مرتبط بالطلب." actionLabel={onRetry ? 'إعادة المحاولة' : undefined} onActionPress={onRetry} />;
  }

  if (state === 'disabled') {
    return <StateView tone="warning" title="تنبيهات الطلب متوقفة مؤقتًا" description="المسار ظاهر لكن التنبيهات معلقة لحين اكتمال التحقق التشغيلي." actionLabel={onRetry ? 'تحقق الآن' : undefined} onActionPress={onRetry} />;
  }

  return <StateView title="تعذر تحميل تنبيهات الطلب" description="أعد المحاولة من دون مغادرة سياق الطلب الحالي." actionLabel={onRetry ? 'إعادة المحاولة' : undefined} onActionPress={onRetry} />;
}

function resolveAlertChipLabel(alertId: DshPartnerOrderAlertItem['alertId']) {
  if (alertId === 'order_needs_accept') return 'تحتاج قبول';
  if (alertId === 'order_sla_risk') return 'خطر SLA';
  if (alertId === 'order_ready') return 'جاهزة';
  if (alertId === 'order_handoff_pending') return 'تسليم معلق';
  if (alertId === 'order_issue_required') return 'مشكلة';
  if (alertId === 'order_rejected') return 'مرفوضة';
  return 'تم التسليم';
}

export function DshPartnerOrderAlertsPanel({
  state = 'ready',
  activeOrderId,
  items = defaultItems,
  onOpenOrder,
  onOpenFlow,
  onRetry,
}: DshPartnerOrderAlertsPanelProps) {
  if (state !== 'ready') {
    return renderState(state, onRetry);
  }

  const visibleItems = activeOrderId ? items.filter((item) => item.orderId === activeOrderId) : items;
  const urgentCount = visibleItems.filter((item) => item.urgent).length;

  if (visibleItems.length === 0) {
    return renderState('empty', onRetry);
  }

  return (
    <Surface tone="raised" padding={3} gap={3}>
      <Box gap={1}>
        <Text role="label">تنبيهات الطلب</Text>
        <Text role="bodySm" tone="muted">لا يوجد مركز إشعارات عام هنا. كل تنبيه مربوط مباشرةً بطلب محدد عبر orderId.</Text>
      </Box>

      <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
        <Chip label={`${visibleItems.length} تنبيه`} selected />
        <Chip label={`${urgentCount} عاجلة`} />
      </Box>

      <Box gap={2}>
        {visibleItems.map((item) => (
          <ListItem
            key={item.id}
            title={`${item.title} · ${item.orderId}`}
            subtitle={item.description}
            meta={item.timeLabel}
            trailing={<Badge label={resolveAlertChipLabel(item.alertId)} tone="neutral" />}
            onPress={() => onOpenOrder?.(item.orderId)}
          />
        ))}
      </Box>

      <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
        <Button label="فتح تنبيهات الطلب" tone="secondary" fullWidth={false} onPress={() => onOpenFlow?.('order-alerts')} />
        <Button label="فتح الطلب المحدد" fullWidth={false} onPress={() => onOpenOrder?.(visibleItems[0]!.orderId)} />
      </Box>
    </Surface>
  );
}

export default DshPartnerOrderAlertsPanel;
