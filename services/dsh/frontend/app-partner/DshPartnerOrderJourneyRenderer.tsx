import React from 'react';
import { DshPartnerRouteRenderer } from './DshPartnerRouteRenderer';
import { OperationalOrderDecisionScreen } from './orders/OperationalOrderDecisionScreen';
import { OperationalOrdersInboxScreen } from './orders/OperationalOrdersInboxScreen';

type Props = React.ComponentProps<typeof DshPartnerRouteRenderer>;

/**
 * Journey-specific renderer that replaces only operational order routes. All
 * unrelated partner routes continue through the established renderer.
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
    return <DshPartnerRouteRenderer {...props} />;
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
          // Only Bthwani-delivery reaches this branch. Partner-delivery and
          // pickup are executed inline by the governed fulfillment panel.
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
