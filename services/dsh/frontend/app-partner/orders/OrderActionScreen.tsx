import React from 'react';
import { Box, Button, Surface, Text } from '@bthwani/ui-kit';
import { OperationHeader } from '../account/OperationHeader';
import { DSH_ORDER_LIFECYCLE_HANDOFFS, getSurfaceObservation } from '../../shared/orders';
import { DshPartnerOrderActionPanel, type PartnerOrderActionFlowId } from './PartnerOrderActionPanel';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';
import type { PartnerTeamMember } from '../team/partner-team.types';

export type OrderActionScreenProps = {
  activeFlowId?: PartnerOrderActionFlowId;
  /** Real order id + fulfillment mode — enables real partner_delivery/pickup actions. */
  orderId?: string;
  fulfillmentMode?: DshFulfillmentDeliveryMode;
  teamMembers?: readonly PartnerTeamMember[];
  onBack?: () => void;
  onOpenScreen?: (screenId: PartnerOrderActionFlowId) => void;
  onSecondaryAction?: () => void;
};

const orderActionFlowCopy: Record<PartnerOrderActionFlowId, { title: string; subtitle: string; secondaryLabel: string }> = {
  'order-accept': {
    title: 'قبول الطلب',
    subtitle: 'ابدأ التنفيذ من نقطة القبول الرسمية ثم انتقل إلى التحضير داخل نفس سياق الطلب.',
    secondaryLabel: 'الانتقال إلى استلام الطلب',
  },
  'order-get': {
    title: 'استلام الطلب',
    subtitle: 'أكّد أن الفرع استلم الطلب بالكامل وجهّزه للانتقال إلى handoff أو الإغلاق التالي.',
    secondaryLabel: 'الانتقال إلى التسليم للمندوب',
  },
  'order-prepare': {
    title: 'تحضير الطلب',
    subtitle: 'تابع تجهيز الطلب قبل إعلانه جاهزًا أو تسليمه للمندوب.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-ready': {
    title: 'تأكيد الجاهزية',
    subtitle: 'ثبّت جاهزية الطلب قبل handoff أو التسليم النهائي.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-handoff': {
    title: 'تسليم للمندوب',
    subtitle: 'أكمل handoff من نفس المسار التشغيلي المختصر.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-out-for-delivery': {
    title: 'قيد التوصيل',
    subtitle: 'تابع الطلب بعد خروجه من الفرع ضمن نفس دورة التنفيذ.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
  'order-store-delivered': {
    title: 'تسليم داخل المتجر',
    subtitle: 'أغلق حالة التسليم عندما يكون الفرع هو نقطة الاستلام النهائية.',
    secondaryLabel: 'العودة لدليل العمليات',
  },
};

export function OrderActionScreen({ activeFlowId = 'order-accept', orderId, fulfillmentMode, teamMembers, onBack, onOpenScreen, onSecondaryAction }: OrderActionScreenProps) {
  const activeCopy = orderActionFlowCopy[activeFlowId];

  // SSoT Handoff lookup dynamically matching the flow state
  const matchedHandoff = React.useMemo(() => {
    if (activeFlowId === 'order-accept') {
      return DSH_ORDER_LIFECYCLE_HANDOFFS.find((h) => h.handoffId === 'operations_approved');
    }
    if (activeFlowId === 'order-ready') {
      return DSH_ORDER_LIFECYCLE_HANDOFFS.find((h) => h.handoffId === 'pickup_ready_client_collect' || h.handoffId === 'ready_for_pickup_captain_assigned');
    }
    if (activeFlowId === 'order-handoff') {
      return DSH_ORDER_LIFECYCLE_HANDOFFS.find((h) => h.handoffId === 'picked_up' || h.handoffId === 'partner_delivery_dispatched');
    }
    return undefined;
  }, [activeFlowId]);

  const observation = matchedHandoff ? getSurfaceObservation(matchedHandoff, 'app-partner') : undefined;

  return (
    <Box gap={4}>
      <OperationHeader
        title={activeCopy.title}
        subtitle={activeCopy.subtitle}
        actions={
          <>
            {onBack ? <Button label="العودة" tone="secondary" fullWidth={false} onPress={onBack} /> : null}
            {onSecondaryAction ? <Button label={activeCopy.secondaryLabel} fullWidth={false} onPress={onSecondaryAction} /> : null}
          </>
        }
      />

      {observation ? (
        <Surface tone="info" padding={3} gap={1}>
          <Text role="bodyStrong" tone="action" style={{ textAlign: 'right' }}>
            {`ملاحظة النقل (SSoT): ${observation.label}`}
          </Text>
          <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
            {`سلوك الواجهة المقترح: ${observation.uiStateHint} ${observation.actionRequired ? '— الإجراء مطلوب!' : ''}`}
          </Text>
        </Surface>
      ) : null}

      <DshPartnerOrderActionPanel
        activeFlowId={activeFlowId}
        {...(orderId ? { orderId } : {})}
        {...(fulfillmentMode ? { fulfillmentMode } : {})}
        {...(teamMembers ? { teamMembers } : {})}
        onSelectFlow={(flowId) => {
          if (flowId === activeFlowId) {
            onSecondaryAction?.();
            return;
          }
          onOpenScreen?.(flowId);
        }}
      />
    </Box>
  );
}
