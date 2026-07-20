import React from 'react';
import { Box, Button, Divider, Text } from '@bthwani/ui-kit';
import type { PartnerOrderItem } from '../../shared/orders/orders.contract';
import {
  DshPartnerOrdersScreen,
  type PartnerOrdersHomeScreenState,
} from './OrdersInboxScreen';
import {
  resolvePartnerOrderMutation,
  usePartnerOrderCommands,
} from './usePartnerOrderCommands';

type OrderHubAction = 'accept' | 'reject' | 'details' | 'prepare' | 'ready' | 'handoff' | 'issue' | 'delivering';

export type OperationalOrdersInboxScreenProps = {
  readonly state: PartnerOrdersHomeScreenState;
  readonly items: readonly PartnerOrderItem[];
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
  searchMode,
  onCloseSearch,
  onRetry,
  onNavigateAction,
}: OperationalOrdersInboxScreenProps) {
  const commands = usePartnerOrderCommands(onRetry);
  const pendingDecisions = React.useMemo(
    () => items.filter((item) => item.status === 'new' || item.status === 'needs_accept'),
    [items],
  );

  const handleOrderAction = React.useCallback((actionId: OrderHubAction, orderId: string) => {
    const item = items.find((candidate) => candidate.id === orderId);
    if (!item) {
      onNavigateAction('details', orderId);
      return;
    }

    if (actionId === 'reject') {
      onNavigateAction('reject', orderId);
      return;
    }

    // A pending-order issue is an acceptance decision, not a support incident.
    if (actionId === 'issue' && (item.status === 'new' || item.status === 'needs_accept')) {
      onNavigateAction('reject', orderId);
      return;
    }

    const mutation = resolvePartnerOrderMutation(actionId, item.status);
    if (mutation) {
      void commands.execute(mutation, orderId);
      return;
    }

    onNavigateAction(actionId, orderId);
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
                  <Button
                    label="قبول وبدء التجهيز"
                    size="sm"
                    fullWidth={false}
                    disabled={commands.state.kind === 'submitting'}
                    onPress={() => void commands.execute('accept', order.id)}
                  />
                  <Button
                    label="رفض مع سبب"
                    size="sm"
                    tone="danger"
                    fullWidth={false}
                    disabled={commands.state.kind === 'submitting'}
                    onPress={() => onNavigateAction('reject', order.id)}
                  />
                </Box>
              </Box>
            </React.Fragment>
          ))}
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
