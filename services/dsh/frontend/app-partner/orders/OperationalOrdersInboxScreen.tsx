import React from 'react';
import { Box, Text } from '@bthwani/ui-kit';
import type { PartnerOrderItem } from '../../shared/orders/orders.contract';
import {
  DshPartnerOrdersScreen,
  type PartnerOrdersHomeScreenState,
} from './OrdersInboxScreen';
import {
  resolvePartnerOrderMutation,
  usePartnerOrderCommands,
} from './usePartnerOrderCommands';

type OrderHubAction = 'accept' | 'details' | 'prepare' | 'ready' | 'handoff' | 'issue' | 'delivering';

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

  const handleOrderAction = React.useCallback((actionId: OrderHubAction, orderId: string) => {
    const item = items.find((candidate) => candidate.id === orderId);
    if (!item) {
      onNavigateAction('details', orderId);
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
