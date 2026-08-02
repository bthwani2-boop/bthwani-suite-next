import React from 'react';
import { useIdentitySession } from '@bthwani/core-identity';
import { Box, Button } from '@bthwani/ui-kit';
import { ActorNotificationsPanel } from '../../shared/notifications';
import type { DshPartnerOperationalFlowId } from '../dsh-partner.types';
import { DshPartnerOrderAlertsPanel } from '../orders/PartnerOrderAlertsPanel';
import { OperationHeader } from './OperationHeader';

import type { DshPartnerOrderAlertItem } from '../../shared/orders';

export type NotificationsScreenProps = {
  activeOrderId?: string;
  alerts?: readonly DshPartnerOrderAlertItem[];
  onOpenInbox?: () => void;
  onOpenOrderSupport?: (orderId: string) => void;
  onOpenAlertsSupport?: (flowId: DshPartnerOperationalFlowId) => void;
  onBack?: () => void;
  onRetry?: () => void;
};

export function NotificationsScreen({
  activeOrderId,
  alerts,
  onOpenInbox,
  onOpenOrderSupport,
  onOpenAlertsSupport,
  onBack,
  onRetry,
}: NotificationsScreenProps) {
  const identity = useIdentitySession();

  return (
    <Box gap={4}>
      <OperationHeader
        title="الإشعارات والتواصل"
        subtitle="مركز إشعارات الممثل العام يظهر أولًا، وتنبيهات الطلب تبقى مرتبطة بسياق الطلب الحالي."
        actions={
          <>
            {onOpenInbox ? <Button label="العودة لصندوق الطلبات" tone="secondary" fullWidth={false} onPress={onOpenInbox} /> : null}
            {onBack ? <Button label="رجوع" fullWidth={false} onPress={onBack} /> : null}
          </>
        }
      />

      <ActorNotificationsPanel
        authKind={identity.state.kind}
        title="إشعارات الشريك"
        emptyDescription="ستظهر هنا إشعارات الفرع، القبول، والمراسلات التشغيلية للشريك."
        appScheme="bthwani-partner-next"
      />

      <DshPartnerOrderAlertsPanel
        {...(activeOrderId !== undefined ? { activeOrderId } : {})}
        {...(alerts !== undefined ? { items: alerts } : {})}
        onOpenOrder={(orderId) => onOpenOrderSupport?.(orderId)}
        onOpenFlow={(flowId) => onOpenAlertsSupport?.(flowId)}
        {...(onRetry !== undefined ? { onRetry } : {})}
      />
    </Box>
  );
}
