import type { CaptainSupportRoute, CompactOrderChatMessage, CaptainAvailabilityStatus, CaptainGpsStatus, CaptainAppMode, CaptainServiceType, CaptainAvailabilityMeta } from './captain.contract';
import type { DshCaptainRoute } from './captain.contract';
import type { DshDeliveryStatus } from '../dispatch';
import type {
  DshCaptainDeliveryActionId,
  DshCaptainOrderBellItem,
  DshCaptainOrderDetailSummary,
} from '../orders';
import type { CaptainPodState } from '../media/pod/pod-upload-flow';

export type CaptainDeliveryActionId = DshCaptainDeliveryActionId;
export type CaptainDeliveryAction = {
  readonly id: CaptainDeliveryActionId;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
};

export type CaptainHomeTickerAction =
  | 'toggle-availability'
  | 'go-inbox'
  | 'reset-inbox'
  | 'toggle-order';

export type DshCaptainSurfaceState = {
  activeServiceType: CaptainServiceType;
  route: DshCaptainRoute;
  inboxState: 'ready' | 'loading' | 'error' | 'empty' | 'delivered' | 'offer-accepting' | 'offer-accepted';
  activeAssignmentId: string;
  activeOrderId: string;
  activeDeliveryStatus: DshDeliveryStatus | '';
  inboxItems: DshCaptainOrderBellItem[];
  selectedSupportScreen: CaptainSupportRoute;
  captainAvailabilityStatus: CaptainAvailabilityStatus;
  gpsStatus: CaptainGpsStatus;
  activeOrderExpanded: boolean;
  captainAppMode: CaptainAppMode;
  activeOrderDraft: string;
  activeOrderMessages: CompactOrderChatMessage[];
  captainPodState: CaptainPodState;
  captainPodPhotoUri: string | undefined;
  isDeclineSheetVisible: boolean;
  declineSheetState: 'ready' | 'loading' | 'success' | 'error';
  declineOrderId: string;
  deliveryActionState: 'idle' | 'loading' | 'success' | 'error';
  deliveryActionMessage: string | null;
};

export type DshCaptainSurfaceDerived = {
  isStoreCourierMode: boolean;
  isCaptainAvailable: boolean;
  isGpsEnabled: boolean;
  captainPodRequired: boolean;
  showBottomNav: boolean;
  captainBottomActiveId: string;
  currentAvailabilityMeta: CaptainAvailabilityMeta;
  activeOrderDisplayId: string;
  activeSummary: DshCaptainOrderDetailSummary;
  activeDeliveryAction: CaptainDeliveryAction;
  homeTicker: {
    statusLabel: string;
    message: string;
    action: CaptainHomeTickerAction;
    marquee: boolean;
  };
};
