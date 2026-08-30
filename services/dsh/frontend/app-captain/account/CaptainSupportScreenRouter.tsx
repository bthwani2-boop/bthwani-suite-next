import React from 'react';
import type { CaptainSupportRoute } from '../../shared/delivery';
import { CaptainOrderSupportConversationScreen } from '../orders/CaptainOrderSupportConversationScreen';

export type CaptainSupportScreenRouterProps = {
  selectedSupportScreen: CaptainSupportRoute;
  onBack: () => void;
  activeOrderId?: string | undefined;
};

export function CaptainSupportScreenRouter({
  selectedSupportScreen,
  onBack,
  activeOrderId,
}: CaptainSupportScreenRouterProps): React.ReactNode {
  const activeOrderProps = activeOrderId ? { orderId: activeOrderId } : {};

  switch (selectedSupportScreen) {
    case 'chat-read-ack':
      return (
        <CaptainOrderSupportConversationScreen
          {...activeOrderProps}
          composerEnabled={false}
          onBack={onBack}
        />
      );
    case 'chat-send':
      return (
        <CaptainOrderSupportConversationScreen
          {...activeOrderProps}
          composerEnabled
          onBack={onBack}
        />
      );
    default:
      return null;
  }
}
