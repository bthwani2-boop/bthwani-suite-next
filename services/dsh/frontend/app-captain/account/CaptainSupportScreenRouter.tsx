import React from 'react';
import {
  DshCaptainOrderAcceptScreen,
  DshCaptainOrderDeliverScreen,
  DshCaptainOrderDetailsScreen,
  DshCaptainOrderGetScreen,
  DshCaptainOrderPickupScreen,
  DshCaptainOrdersListScreen,
  DshCaptainOrdersOffersListScreen,
  DshCaptainProofUploadScreen,
} from '../orders/DshCaptainOrdersScreen';
import {
  DshCaptainChatReadAckScreen,
  DshCaptainChatSendScreen,
} from './DshCaptainOperationsScreen';
import { DshCaptainCodBalanceScreen } from './DshCaptainFinanceScreen';
import {
  DshCaptainProfileGetScreen,
  DshCaptainTierEvaluateScreen,
  DshCaptainTierInfoScreen,
} from './DshCaptainProfileScreen';

type CaptainSupportRoute =
  | 'chat-read-ack'
  | 'chat-send'
  | 'cod-liability'
  | 'order-accept'
  | 'order-deliver'
  | 'order-details'
  | 'order-get'
  | 'order-pickup'
  | 'orders-list'
  | 'orders-offers-list'
  | 'profile-get'
  | 'proof-upload'
  | 'tier-evaluate'
  | 'tier-info';

export type CaptainSupportScreenRouterProps = {
  selectedSupportScreen: CaptainSupportRoute;
  onBack: () => void;
  onNavigate: (screenId: CaptainSupportRoute) => void;
  captainCollectsCod: boolean;
  dshAuthBearerToken?: string | undefined;
  dshClientId?: string | undefined;
  activeOrderId?: string;
  onAcceptTask: (orderId: string) => void;
  onDeclineTask: (orderId: string) => void;
};

export function CaptainSupportScreenRouter({
  selectedSupportScreen,
  onBack,
  onNavigate,
  captainCollectsCod,
  dshAuthBearerToken,
  dshClientId,
  activeOrderId,
  onAcceptTask,
  onDeclineTask,
}: CaptainSupportScreenRouterProps): React.ReactNode {
  switch (selectedSupportScreen) {
    case 'chat-read-ack':
      return <DshCaptainChatReadAckScreen onBack={onBack} onSecondaryAction={onBack} />;
    case 'chat-send':
      return <DshCaptainChatSendScreen onBack={onBack} onSecondaryAction={onBack} />;
    case 'cod-liability':
      return captainCollectsCod ? (
        <DshCaptainCodBalanceScreen
          onBack={onBack}
          onRetry={onBack}
          {...(dshAuthBearerToken !== undefined ? { dshAuthBearerToken } : {})}
          {...(dshClientId !== undefined ? { dshClientId } : {})}
        />
      ) : null;
    case 'order-accept':
      return (
        <DshCaptainOrderAcceptScreen
          orderId={activeOrderId}
          onBack={onBack}
          onAccept={onAcceptTask}
          onDecline={onDeclineTask}
        />
      );
    case 'order-deliver':
      return <DshCaptainOrderDeliverScreen onBack={onBack} onSecondaryAction={() => onNavigate('proof-upload')} />;
    case 'order-details':
      return <DshCaptainOrderDetailsScreen onBack={onBack} onSecondaryAction={onBack} />;
    case 'order-get':
      return <DshCaptainOrderGetScreen onBack={onBack} onSecondaryAction={onBack} />;
    case 'order-pickup':
      return <DshCaptainOrderPickupScreen onBack={onBack} onSecondaryAction={() => onNavigate('order-deliver')} />;
    case 'orders-list':
      return <DshCaptainOrdersListScreen onBack={onBack} onSecondaryAction={() => onNavigate('orders-offers-list')} />;
    case 'orders-offers-list':
      return <DshCaptainOrdersOffersListScreen onBack={onBack} onSecondaryAction={() => onNavigate('order-accept')} />;
    case 'profile-get':
      return <DshCaptainProfileGetScreen onBack={onBack} onRetry={onBack} />;
    case 'proof-upload':
      return <DshCaptainProofUploadScreen onBack={onBack} onSecondaryAction={onBack} />;
    case 'tier-evaluate':
      return <DshCaptainTierEvaluateScreen onBack={onBack} onRetry={onBack} />;
    case 'tier-info':
      return <DshCaptainTierInfoScreen onBack={onBack} onRetry={onBack} />;
    default:
      return null;
  }
}
