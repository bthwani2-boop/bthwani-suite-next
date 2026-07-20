import React from 'react';
import { DshPartnerRouteRenderer } from './DshPartnerRouteRenderer';
import { OperationalOrdersInboxScreen } from './orders/OperationalOrdersInboxScreen';

type Props = React.ComponentProps<typeof DshPartnerRouteRenderer>;

/**
 * Journey-specific renderer that replaces only the partner order inbox. All
 * unrelated partner routes continue through the established renderer.
 */
export function DshPartnerOrderJourneyRenderer(props: Props): React.ReactElement {
  if (props.route !== 'inbox') {
    return <DshPartnerRouteRenderer {...props} />;
  }

  return props.renderMainShell(
    <OperationalOrdersInboxScreen
      state={props.partnerOrdersState}
      items={props.partnerOrders}
      searchMode={props.ordersSearchMode}
      onCloseSearch={() => props.setOrdersSearchMode(false)}
      onRetry={props.refreshOrders}
      onNavigateAction={(actionId, orderId) => {
        props.setActiveOrderId(orderId);
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
