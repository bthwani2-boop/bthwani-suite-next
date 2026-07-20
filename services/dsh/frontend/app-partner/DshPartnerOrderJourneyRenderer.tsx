import React from 'react';
import type { GovernedPartnerOrderItem } from '../shared/partner/partner.adapters';
import { DshPartnerRouteRenderer } from './DshPartnerRouteRenderer';
import { OperationalOrderDecisionScreen } from './orders/OperationalOrderDecisionScreen';
import { OperationalOrdersInboxScreen } from './orders/OperationalOrdersInboxScreen';

type LegacyRendererProps = React.ComponentProps<typeof DshPartnerRouteRenderer>;
type Props = Omit<LegacyRendererProps, 'handleMarkReady' | 'partnerOrders' | 'refreshOrders'> & {
  readonly partnerOrders: readonly GovernedPartnerOrderItem[];
  readonly refreshOrders: () => void | Promise<void>;
};

/**
 * Journey-specific renderer that owns all operational order routes. The legacy
 * mark-ready callback is injected only when delegating unrelated routes and is
 * unreachable from the inbox/decision journey.
 */
export function DshPartnerOrderJourneyRenderer(props: Props): React.ReactElement {
  const activeOrder = props.partnerOrders.find((order) => order.id === props.activeOrderId)
    ?? props.partnerOrders[0];

  if (props.route === 'order-rejection') {
    return props.renderSurfaceShell(
      <OperationalOrderDecisionScreen
        order={activeOrder}
        orderId={activeOrder?.id ?? props.activeOrderId ?? props.initialOrderId}
        refreshOrders={props.refreshOrders}
        onBack={props.openOrdersBoard}
      />,
    );
  }

  if (props.route !== 'inbox') {
    return <DshPartnerRouteRenderer {...props} handleMarkReady={() => undefined} />;
  }

  return props.renderMainShell(
    <OperationalOrdersInboxScreen
      state={props.partnerOrdersState}
      items={props.partnerOrders}
      teamMembers={props.teamMembers}
      searchMode={props.ordersSearchMode}
      onCloseSearch={() => props.setOrdersSearchMode(false)}
      onRetry={props.refreshOrders}
      onNavigateAction={(actionId, orderId) => {
        props.setActiveOrderId(orderId);
        if (actionId === 'reject') {
          props.setRoute('order-rejection');
          return;
        }
        if (actionId === 'issue') {
          props.openSupportCommandFromOperationalFlow('order-issue-queue', 'orders');
          return;
        }
        if (actionId === 'handoff') {
          props.openSupportCommandFromOperationalFlow('order-handoff', 'orders');
          return;
        }
        if (actionId === 'delivering') {
          props.openSupportCommandFromOperationalFlow('order-out-for-delivery', 'orders');
          return;
        }
        props.openSupportScreen('order-get', 'orders');
      }}
    />,
  );
}
