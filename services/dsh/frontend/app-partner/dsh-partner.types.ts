import type {
  DshPartnerOperationalFlowId,
  DshPartnerRoute,
  DshPartnerSupportCommandContext,
  DshPartnerSupportCommandFilterId,
  DshPartnerSupportIssueCategoryId,
  DshPartnerSupportRouteId,
  PartnerHubSection,
} from '../shared/partner/partner.types';
// Re-export domain types from shared so consumers can import from one place.
export type {
  DshPartnerOperationalFlowId,
  DshPartnerSupportCommandContext,
  DshPartnerSupportCommandFilterId,
  DshPartnerSupportIssueCategoryId,
  DshPartnerSupportRouteId,
  DshPartnerRoute,
  PartnerHubSection,
} from '../shared/partner/partner.types';
export {
  DSH_PARTNER_OPERATIONAL_FLOW_IDS,
  DSH_PARTNER_SUPPORT_ROUTE_IDS,
  DSH_PARTNER_SUPPORT_ISSUE_CATEGORY_IDS,
  DSH_PARTNER_SUPPORT_ROUTE_TO_OPERATIONAL_FLOW,
  DSH_PARTNER_OPERATIONAL_FLOW_TO_SUPPORT_ROUTE,
} from '../shared/partner/partner.types';
export {
  mapDshPartnerOperationalFlowToSupportRoute,
  mapDshPartnerSupportRouteToOperationalFlow,
} from '../shared/partner/partner.flow-maps';

export type DshPartnerSurfaceProps = {
  initialRoute?: DshPartnerRoute;
  initialOrderId?: string;
};

export type PartnerDshSurfaceState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled';

export type DshPartnerSurfaceId = DshPartnerRoute | 'wallet-bridge' | 'detail';

export type DshPartnerHubSurfaceProps = {
  state?: PartnerDshSurfaceState;
  section?: PartnerHubSection;
  onSectionChange?: (section: PartnerHubSection) => void;
  storeName?: string;
  branchLabel?: string;
  cityLabel?: string;
  managerLabel?: string;
  todayHoursLabel?: string;
  activeZoneLabel?: string;
  storeOpen?: boolean;
  listingEnabled?: boolean;
  activeOrdersCount?: number;
  urgentOrdersCount?: number;
  pendingActionsCount?: number;
  onOpenOrdersBoard?: () => void;
  onOpenOrdersSearch?: () => void;
  onOpenInventoryManagement?: () => void;
  onOpenStoreScope?: () => void;
  onOpenSupportDirectory?: () => void;
  onOpenWalletHub?: () => void;
  onOpenBell?: () => void;
  onOpenOperationalFlow?: (screenId: DshPartnerOperationalFlowId) => void;
  onOpenSupportScreen?: (screenId: DshPartnerSupportRouteId) => void;
  onOpenStoreCourierSetup?: () => void;
  onOpenTeamManagement?: () => void;
  teamMembers?: readonly import('./teammanagement/PartnerTeamManagementScreen').PartnerTeamMember[];
  onToggleAvailability?: (isAvailable: boolean) => void;
  canonicalStoreId?: string;
  dshClientId?: string | null;
  walletBalanceLabel?: string;
};
