import type { CaptainSupportRoute, CompactOrderChatMessage, CaptainAvailabilityStatus, CaptainGpsStatus, CaptainAppMode, CaptainServiceType, CaptainAvailabilityMeta } from './captain.contract';
import type { DshCaptainRoute, DshCaptainCommandTarget } from './captain.contract';
import type { ActiveOrderPhase, StoreCourierStage } from './delivery.contract';
import type { DshCaptainOrderBellItem, DshCaptainOrderDetailSummary } from '../orders';
export type { ActiveOrderPhase, StoreCourierStage } from './delivery.contract';

export type DshCaptainNavigationCommand = {
  token: number;
  target: DshCaptainCommandTarget;
};

export type DshCaptainSurfaceState = {
  activeServiceType: CaptainServiceType;
  route: DshCaptainRoute;
  inboxState: 'ready' | 'loading' | 'error' | 'empty' | 'delivered' | 'offer-accepting' | 'offer-accepted';
  activeAssignmentId: string;
  activeOrderId: string;
  inboxItems: DshCaptainOrderBellItem[];
  selectedSupportScreen: CaptainSupportRoute;
  isPickupSheetVisible: boolean;
  isDeliverySheetVisible: boolean;
  captainAvailabilityStatus: CaptainAvailabilityStatus;
  gpsStatus: CaptainGpsStatus;
  activeOrderExpanded: boolean;
  activeOrderPhase: ActiveOrderPhase;
  captainAppMode: CaptainAppMode;
  activeOrderDraft: string;
  activeOrderMessages: CompactOrderChatMessage[];
  storeCourierStage: StoreCourierStage;
  captainPodState: 'ready' | 'loading' | 'success' | 'error' | 'retry-required';
  captainPodPhotoUri: string | undefined;
  captainPodMediaKey: string | undefined;
  isDeclineSheetVisible: boolean;
  declineSheetState: 'ready' | 'loading' | 'success' | 'error';
  declineOrderId: string;
  pickupSheetState: 'ready' | 'loading' | 'success' | 'error';
};

export type DshCaptainSurfaceDerived = {
  isStoreCourierMode: boolean;
  isCaptainAvailable: boolean;
  isGpsEnabled: boolean;
  captainPodRequired: boolean;
  captainCollectsCod: boolean;
  showBottomNav: boolean;
  captainBottomActiveId: string;
  currentAvailabilityMeta: CaptainAvailabilityMeta;
  activeOrderDisplayId: string;
  activeSummary: DshCaptainOrderDetailSummary;
  homeTicker: {
    statusLabel: string;
    message: string;
    onPress: () => void;
    marquee: boolean;
  };
};
