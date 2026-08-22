import React from 'react';
import { StateView } from '@bthwani/ui-kit';
import { DshPartnerRouteRenderer } from './DshPartnerRouteRenderer';
import {
  buildDshPartnerSupportDirectoryRouteFromFlow,
  buildDshPartnerSupportScreenRoute,
} from './partner-navigation';
import { OperationalOrderDecisionScreen } from './orders/OperationalOrderDecisionScreen';
import { OperationalOrdersInboxScreen } from './orders/OperationalOrdersInboxScreen';
import { PartnerDispatchTrackingScreen } from './orders/PartnerDispatchTrackingScreen';

type Props = React.ComponentProps<typeof DshPartnerRouteRenderer>;

export function DshPartnerOrderJourneyRenderer(props: Props): React.ReactElement {
  const { route, navigation } = props;

  if (route.kind === 'order-rejection') {
    const activeOrder = props.partnerOrders.find((order) => order.id === route.orderId);
    return props.renderSurfaceShell(
      <OperationalOrderDecisionScreen
        order={activeOrder}
        orderId={route.orderId}
        refreshOrders={props.refreshOrders}
        onBack={navigation.back}
      />,
    );
  }

  if (route.kind === 'support-screen' && route.screenId === 'order-out-for-delivery') {
    if (!route.orderId) {
      return props.renderSurfaceShell(
        <StateView
          title="حدد الطلب أولًا"
          description="تتبع التسليم يحتاج معرّف طلب صريحًا في المسار ولا يعتمد على أول طلب في القائمة."
          tone="warning"
          actionLabel="العودة للطلبات"
          onActionPress={() => navigation.navigate({ kind: 'inbox' }, 'replace')}
        />,
      );
    }
    return props.renderSurfaceShell(
      <PartnerDispatchTrackingScreen orderId={route.orderId} onBack={navigation.back} />,
    );
  }

  if (route.kind !== 'inbox') return <DshPartnerRouteRenderer {...props} />;

  return props.renderMainShell(
    <OperationalOrdersInboxScreen
      state={props.partnerOrdersState}
      items={props.partnerOrders}
      teamMembers={props.teamMembers}
      searchMode={route.search ?? false}
      onCloseSearch={() => navigation.navigate({ kind: 'inbox' }, 'replace')}
      onRetry={props.refreshOrders}
      onNavigateAction={(actionId, orderId) => {
        if (actionId === 'reject') {
          navigation.navigate({ kind: 'order-rejection', orderId });
          return;
        }
        if (actionId === 'issue') {
          navigation.navigate(buildDshPartnerSupportDirectoryRouteFromFlow('order-issue-queue', 'orders', orderId));
          return;
        }
        if (actionId === 'handoff') {
          navigation.navigate(buildDshPartnerSupportDirectoryRouteFromFlow('order-handoff', 'orders', orderId));
          return;
        }
        if (actionId === 'delivering') {
          navigation.navigate(buildDshPartnerSupportDirectoryRouteFromFlow('order-out-for-delivery', 'orders', orderId));
          return;
        }
        navigation.navigate(buildDshPartnerSupportScreenRoute('order-get', 'orders', orderId));
      }}
    />,
  );
}
