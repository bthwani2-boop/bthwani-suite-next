import React from 'react';
import { CaptainOrderSupportConversationScreen } from './CaptainOrderSupportConversationScreen';
import type { DshCaptainOrderId } from '../../shared/orders';

export type OrderChatSectionProps = {
  readonly orderId?: DshCaptainOrderId | undefined;
  readonly pickupLabel?: string | undefined;
  readonly dropoffLabel?: string | undefined;
  readonly state?: 'active' | 'readOnly' | undefined;
  readonly onBack?: (() => void) | undefined;
};

/**
 * Compatibility adapter for legacy captain order surfaces.
 *
 * The previous component created messages and success states in local React
 * state. This adapter preserves the old import surface while delegating all
 * reads and writes to the governed DSH actor-support conversation.
 */
export const OrderChatSection = React.memo(function OrderChatSection({
  orderId,
  state = 'active',
  onBack,
}: OrderChatSectionProps) {
  return (
    <CaptainOrderSupportConversationScreen
      {...(orderId ? { orderId } : {})}
      composerEnabled={state === 'active'}
      onBack={onBack ?? (() => undefined)}
    />
  );
});
