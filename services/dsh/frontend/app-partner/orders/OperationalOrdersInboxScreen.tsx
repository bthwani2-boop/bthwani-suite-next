import React from 'react';
import { Box, Button, Text } from '@bthwani/ui-kit';
import { OrderTruthReadbackSummary } from '../../shared/order-truth';
import type { GovernedPartnerOrderItem } from '../../shared/partner/partner.adapters';
import type { PartnerTeamMember } from '../team/partner-team.types';
import {
  GovernedPartnerOrdersScreen,
  type GovernedPartnerOrderActionId,
} from './GovernedPartnerOrdersScreen';
import type { PartnerOrdersHomeScreenState } from './OrdersInboxScreen';
import { PartnerFulfillmentActionsPanel } from './PartnerFulfillmentActionsPanel';
import { PreparationEstimateRevisionPanel } from './PreparationEstimateRevisionPanel';
import {
  resolvePartnerOrderMutation,
  usePartnerOrderCommands,
} from './usePartnerOrderCommands';

type OrderHubAction = GovernedPartnerOrderActionId;

export type OperationalOrdersInboxScreenProps = {
  readonly state: PartnerOrdersHomeScreenState;
  readonly items: readonly GovernedPartnerOrderItem[];
  readonly teamMembers: readonly PartnerTeamMember[];
  readonly searchMode: boolean;
  readonly onCloseSearch: () => void;
  readonly onRetry: () => void | Promise<void>;
  readonly onNavigateAction: (actionId: OrderHubAction, orderId: string) => void;
};

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
  const [estimateOrderId, setEstimateOrderId] = React.useState<string | null>(null);
  const expandedFulfillmentOrder = React.useMemo(
    () => items.find((item) => item.id === expandedFulfillmentOrderId) ?? null,
    [expandedFulfillmentOrderId, items],
  );
  const estimateOrder = React.useMemo(
    () => items.find((item) => item.id === estimateOrderId) ?? null,
    [estimateOrderId, items],
  );

  React.useEffect(() => {
    if (expandedFulfillmentOrderId && !expandedFulfillmentOrder) setExpandedFulfillmentOrderId(null);
    if (estimateOrderId && (!estimateOrder || !estimateOrder.allowedActions.includes('revise_estimate'))) {
      setEstimateOrderId(null);
    }
  }, [expandedFulfillmentOrder, expandedFulfillmentOrderId, estimateOrder, estimateOrderId]);

  const handleOrderAction = React.useCallback((actionId: OrderHubAction, orderId: string) => {
    const item = items.find((candidate) => candidate.id === orderId);
    if (!item) {
      onNavigateAction('details', orderId);
      return;
    }

    if (actionId === 'revise_estimate') {
      if (item.allowedActions.includes('revise_estimate')) setEstimateOrderId(orderId);
      else onNavigateAction('details', orderId);
      return;
    }
    if (actionId === 'reject') {
      onNavigateAction(item.allowedActions.includes('reject') ? 'reject' : 'details', orderId);
      return;
    }
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
      const handoffMutation = resolvePartnerOrderMutation('handoff', item.allowedActions);
      if (handoffMutation) {
        void commands.execute(handoffMutation, orderId);
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
    onNavigateAction(actionId === 'delivering' || actionId === 'issue' ? actionId : 'details', orderId);
  }, [commands, items, onNavigateAction]);

  return (
    <>
      <OrderTruthReadbackSummary
        actor="partner"
        title="حقيقة الطلبات المرتبطة بالمتجر"
        limit={5}
        onOpenOrder={(orderId) => onNavigateAction('details', orderId)}
      />

      {commands.state.kind === 'error' ? (
        <Box paddingX={4} paddingY={2} background="dangerSurface">
          <Text role="bodySm" tone="danger">{commands.state.message}</Text>
        </Box>
      ) : null}
      {commands.state.kind === 'submitting' ? (
        <Box paddingX={4} paddingY={2} background="surfaceInset">
          <Text role="bodySm" tone="muted">
            {commands.state.command === 'handoff'
              ? 'جارٍ تثبيت تسليم العهدة للكابتن…'
              : 'جارٍ تثبيت انتقال حالة الطلب…'}
          </Text>
        </Box>
      ) : null}
      {commands.state.kind === 'success' && commands.state.command === 'handoff' ? (
        <Box paddingX={4} paddingY={2} background="successSurface">
          <Text role="bodySm" tone="success">تم تأكيد تسليم الطلب للكابتن. ينتظر النظام تأكيده الاستلام.</Text>
        </Box>
      ) : null}

      {estimateOrder ? (
        <PreparationEstimateRevisionPanel
          order={estimateOrder}
          onClose={() => setEstimateOrderId(null)}
          onUpdated={onRetry}
        />
      ) : null}

      {expandedFulfillmentOrder ? (
        <Box padding={4} gap={3} background="surfaceInset">
          <Box layoutDirection="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Box gap={1}>
              <Text role="bodyStrong">تنفيذ {expandedFulfillmentOrder.orderCode}</Text>
              <Text role="caption" tone="muted">{expandedFulfillmentOrder.orderTypeLabel}</Text>
            </Box>
            <Button label="إغلاق" tone="ghost" size="sm" fullWidth={false} onPress={() => setExpandedFulfillmentOrderId(null)} />
          </Box>
          <PartnerFulfillmentActionsPanel
            orderId={expandedFulfillmentOrder.id}
            fulfillmentMode={expandedFulfillmentOrder.orderMode}
            teamMembers={teamMembers}
          />
        </Box>
      ) : null}

      <GovernedPartnerOrdersScreen
        state={state}
        items={items}
        searchMode={searchMode}
        onCloseSearch={onCloseSearch}
        onRetry={onRetry}
        onAction={handleOrderAction}
      />
    </>
  );
}
