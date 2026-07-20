import React from 'react';
import type { PartnerOrderItem } from '../../shared/orders/orders.contract';
import { DshPartnerOrderRejectionScreen } from './DshPartnerOrderRejectionScreen';
import { usePartnerOrderCommands } from './usePartnerOrderCommands';

const REJECTION_REASONS = [
  { id: 'out-of-stock', label: 'بعض الأصناف غير متوفرة' },
  { id: 'busy', label: 'المتجر مزدحم جداً حالياً' },
  { id: 'closing-soon', label: 'المتجر سيغلق قريباً' },
  { id: 'technical-issue', label: 'مشكلة تقنية في استقبال الطلبات' },
  { id: 'other', label: 'سبب تشغيلي آخر' },
] as const;

export type OperationalOrderDecisionScreenProps = {
  readonly order: PartnerOrderItem | undefined;
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

  const state = commands.state.kind === 'submitting'
    ? 'loading'
    : commands.state.kind === 'success'
      ? 'success'
      : commands.state.kind === 'error'
        ? 'error'
        : 'ready';

  return (
    <DshPartnerOrderRejectionScreen
      state={state}
      orderCode={order?.orderCode ?? `#${orderId}`}
      amount={order?.amountLabel ?? '—'}
      items={[
        {
          id: order?.id ?? orderId,
          name: order?.itemsSummaryLabel ?? order?.itemsCountLabel ?? 'تفاصيل الطلب',
          quantity: 1,
        },
      ]}
      rejectionReasons={[...REJECTION_REASONS]}
      onAccept={() => {
        void commands.execute('accept', orderId).then((ok) => {
          if (ok) onBack();
        });
      }}
      onReject={(reasonId) => {
        const reason = REJECTION_REASONS.find((candidate) => candidate.id === reasonId);
        void commands.execute('reject', orderId, reason?.label ?? reasonId);
      }}
      onBack={onBack}
    />
  );
}
