import React from 'react';
import { Box, Button, Divider, Text } from '@bthwani/ui-kit';
import type { GovernedPartnerOrderItem } from '../../shared/partner/partner.adapters';
import type { PartnerTeamMember } from '../team/partner-team.types';
import {
  DshPartnerOrdersScreen,
  type PartnerOrdersHomeScreenState,
} from './OrdersInboxScreen';
import { PartnerFulfillmentActionsPanel } from './PartnerFulfillmentActionsPanel';
import {
  resolvePartnerOrderMutation,
  usePartnerOrderCommands,
} from './usePartnerOrderCommands';

type OrderHubAction = 'accept' | 'reject' | 'details' | 'prepare' | 'ready' | 'handoff' | 'issue' | 'delivering';

export type OperationalOrdersInboxScreenProps = {
  readonly state: PartnerOrdersHomeScreenState;
  readonly items: readonly GovernedPartnerOrderItem[];
  readonly teamMembers: readonly PartnerTeamMember[];
  readonly searchMode: boolean;
  readonly onCloseSearch: () => void;
  readonly onRetry: () => void | Promise<void>;
  readonly onNavigateAction: (actionId: OrderHubAction, orderId: string) => void;
};

/**
 * Operational wrapper for the partner order command center. The visual screen
 * remains presentation-only while this boundary executes governed mutations
 * and performs read-after-write refreshes.
 */
export function OperationalOrdersInboxScreen({
  state,
  items,
  teamMembers,
  searchMode,
  onCloseSearch,
  onRetry,
  onNavigateAction,
}: OperationalOrdersInboxScreenProps) {
  const commands = usePartnerOrderCommands(onRetry);
  const [expandedFulfillmentOrderId, setExpandedFulfillmentOrderId] = React.useState<string | null>(null);
  const pendingDecisions = React.useMemo(
    () => items.filter((item) => item.allowedActions.includes('accept') || item.allowedActions.includes('reject')),
    [items],
  );
  const expandedFulfillmentOrder = React.useMemo(
    () => items.find((item) => item.id === expandedFulfillmentOrderId) ?? null,
    [expandedFulfillmentOrderId, items],
  );

  React.useEffect(() => {
    if (expandedFulfillmentOrderId && !expandedFulfillmentOrder) {
      setExpandedFulfillmentOrderId(null);
    }
  }, [expandedFulfillmentOrder, expandedFulfillmentOrderId]);

  const handleOrderAction = React.useCallback((actionId: OrderHubAction, orderId: string) => {
    const item = items.find((candidate) => candidate.id === orderId);
    if (!item) {
      onNavigateAction('details', orderId);
      return;
    }

    if (actionId === 'reject') {
      onNavigateAction(item.allowedActions.includes('reject') ? 'reject' : 'details', orderId);
      return;
    }

    // A pending-order issue is an acceptance decision, not a support incident.
    if (actionId === 'issue' && item.allowedActions.includes('reject')) {
      onNavigateAction('reject', orderId);
      return;
    }

    if (actionId === 'handoff') {
      if (!item.allowedActions.includes('handoff')) {
        onNavigateAction('details', orderId);
        return;
      }
      if (item.orderMode === 'partner_delivery' || item.orderMode === 'pickup') {
        setExpandedFulfillmentOrderId(orderId);
        return;
      }
      onNavigateAction('details', orderId);
      return;
    }

    const mutation = resolvePartnerOrderMutation(actionId, item.allowedActions);
    if (mutation) {
      void commands.execute(mutation, orderId);
      return;
    }

    onNavigateAction(actionId === 'details' ? 'details' : 'details', orderId);
  }, [commands, items, onNavigateAction]);

  return (
    <>
      {commands.state.kind === 'error' ? (
        <Box paddingX={4} paddingY={2} background="dangerSurface">
          <Text role="bodySm" tone="danger">{commands.state.message}</Text>
        </Box>
      ) : null}
      {commands.state.kind === 'submitting' ? (
        <Box paddingX={4} paddingY={2} background="surfaceInset">
          <Text role="bodySm" tone="muted">جارٍ تثبيت انتقال حالة الطلب…</Text>
        </Box>
      ) : null}
      {pendingDecisions.length > 0 ? (
        <Box padding={4} gap={3} background="warningSurface">
          <Text role="bodyStrong">طلبات تحتاج قرار قبول</Text>
          <Text role="caption" tone="muted">القرار هنا يغيّر حالة الطلب فعليًا ويُحدّث جميع الأسطح بعد نجاح الخادم.</Text>
          {pendingDecisions.map((order, index) => (
            <React.Fragment key={order.id}>
              {index > 0 ? <Divider /> : null}
              <Box gap={2}>
                <Text role="bodySm">{`${order.orderCode} · ${order.itemsCountLabel} · ${order.amountLabel}`}</Text>
                <Box layoutDirection="row" gap={2}>
                  {order.allowedActions.includes('accept') ? (
                    <Button
                      label="قبول الطلب"
                      size="sm"
                      fullWidth={false}
                      disabled={commands.state.kind === 'submitting'}
                      onPress={() => void commands.execute('accept', order.id)}
                    />
                  ) : null}
                  {order.allowedActions.includes('reject') ? (
                    <Button
                      label="رفض مع سبب"
                      size="sm"
                      tone="danger"
                      fullWidth={false}
                      disabled={commands.state.kind === 'submitting'}
                      onPress={() => onNavigateAction('reject', order.id)}
                    />
                  ) : null}
                </Box>
              </Box>
            </React.Fragment>
          ))}
        </Box>
      ) : null}

      {expandedFulfillmentOrder ? (
        <Box padding={4} gap={3} background="surfaceInset">
          <Box layoutDirection="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Box gap={1}>
              <Text role="bodyStrong">تنفيذ {expandedFulfillmentOrder.orderCode}</Text>
              <Text role="caption" tone="muted">{expandedFulfillmentOrder.orderTypeLabel}</Text>
            </Box>
            <Button
              label="إغلاق"
              tone="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => setExpandedFulfillmentOrderId(null)}
            />
          </Box>
          <PartnerFulfillmentActionsPanel
            orderId={expandedFulfillmentOrder.id}
            fulfillmentMode={expandedFulfillmentOrder.orderMode}
            teamMembers={teamMembers}
          />
        </Box>
      ) : null}

      <DshPartnerOrdersScreen
        state={state}
        items={items}
        searchMode={searchMode}
        onCloseSearch={onCloseSearch}
        onOpenOrderAction={handleOrderAction}
        onRetry={onRetry}
      />
    </>
  );
}
