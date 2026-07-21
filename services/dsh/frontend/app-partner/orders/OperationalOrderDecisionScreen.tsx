import React from 'react';
import type { GovernedPartnerOrderItem } from '../../shared/partner/partner.adapters';
import {
  PARTNER_CANCELLATION_REASONS,
  useOrderCancellationController,
  type PartnerCancellationReasonCode,
} from '../../shared/orders';
import { DshPartnerOrderRejectionScreen } from './DshPartnerOrderRejectionScreen';
import { usePartnerOrderCommands } from './usePartnerOrderCommands';

export type OperationalOrderDecisionScreenProps = {
  readonly order: GovernedPartnerOrderItem | undefined;
  readonly orderId: string;
  readonly refreshOrders: () => void | Promise<void>;
  readonly onBack: () => void;
};

export function OperationalOrderDecisionScreen({
  order,
  orderId,
  refreshOrders,
  onBack,
}: OperationalOrderDecisionScreenProps) {
  const commands = usePartnerOrderCommands(refreshOrders);
  const cancellation = useOrderCancellationController({
    surface: 'partner',
    orderId,
    onCancelled: refreshOrders,
  });
  const canAccept = Boolean(order?.allowedActions.includes('accept'));
  const canReject = Boolean(order?.allowedActions.includes('reject'));

  const state = commands.state.kind === 'submitting' || cancellation.state.kind === 'submitting'
    ? 'loading'
    : cancellation.state.kind === 'ready'
      ? 'success'
      : commands.state.kind === 'error' || cancellation.state.kind === 'error' || cancellation.state.kind === 'requires_review'
        ? 'error'
        : 'ready';
  const errorMessage = commands.state.kind === 'error'
    ? commands.state.message
    : cancellation.state.kind === 'error' || cancellation.state.kind === 'requires_review'
      ? cancellation.state.message
      : undefined;

  return (
    <DshPartnerOrderRejectionScreen
      state={state}
      {...(errorMessage === undefined ? {} : { errorMessage })}
      orderCode={order?.orderCode ?? `#${orderId}`}
      amount={order?.amountLabel ?? '—'}
      items={[
        {
          id: order?.id ?? orderId,
          name: order?.itemsSummaryLabel ?? order?.itemsCountLabel ?? 'تفاصيل الطلب',
          quantity: 1,
        },
      ]}
      rejectionReasons={PARTNER_CANCELLATION_REASONS.map((reason) => ({
        id: reason.code,
        label: reason.label,
        description: reason.description,
        requiresNote: reason.code === 'other',
      }))}
      canAccept={canAccept}
      canReject={canReject}
      onAccept={() => {
        if (!canAccept) return;
        void commands.execute('accept', orderId).then((ok) => {
          if (ok) onBack();
        });
      }}
      onReject={(reasonId, reasonNote) => {
        if (!canReject) return;
        void cancellation.submit({
          reasonCode: reasonId as PartnerCancellationReasonCode,
          reasonNote,
        });
      }}
      onBack={onBack}
    />
  );
}
