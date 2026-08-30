// Canonical location: dsh/frontend/app-partner/useDshPartnerSurfaceModel.ts
// Authority: app-partner — domain/runtime state. Navigation truth is owned by Expo Router.

import type {
  DshPartnerOperationalScope,
  DshPartnerRoute,
} from '../shared/partner/partner.types';
import type { GovernedPartnerOrderItem, PartnerDeliveryOpsSummary } from '../shared/partner/partner.adapters';
import { useStoreScopeModel } from '../shared/partner/store-scope.model';
import { usePartnerOrdersModel } from './orders/usePartnerOrdersModel';
import { usePartnerOpsSummaryModel } from '../shared/operations/partner-ops-summary.model';
import { usePartnerTeamModel, type PartnerTeamMutationResult } from './team/usePartnerTeamModel';
import type { PartnerTeamMember } from './team/partner-team.types';

export type DshPartnerSurfaceState = {
  readonly storeScopeVisible: boolean;
  readonly selectedStoreScopeId: string;
};

export type DshPartnerSurfaceActions = {
  readonly setStoreScopeVisible: (visible: boolean) => void;
  readonly setSelectedStoreScopeId: (id: string) => void;
  readonly openStoreScope: () => void;
  readonly refreshOrders: () => void | Promise<void>;
  readonly onInviteMember: (identity: string) => Promise<PartnerTeamMutationResult>;
  readonly onMemberAction: (memberId: string, action: string) => Promise<PartnerTeamMutationResult>;
};

export type DshPartnerSurfaceModel = {
  readonly state: DshPartnerSurfaceState;
  readonly actions: DshPartnerSurfaceActions;
  readonly scopes: DshPartnerOperationalScope[];
  readonly selectedStoreScope: DshPartnerOperationalScope | null;
  readonly isLoadingScopes: boolean;
  readonly scopesError: string | null;
  readonly runtimePartnerProfile: {
    readonly storeName: string;
    readonly branchLabel: string;
    readonly cityLabel: string;
    readonly managerLabel: string;
    readonly todayHoursLabel: string;
    readonly activeZoneLabel: string;
  };
  readonly partnerOrdersState: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';
  readonly partnerOrders: readonly GovernedPartnerOrderItem[];
  readonly deliveryOpsSummary: PartnerDeliveryOpsSummary;
  readonly teamMembers: readonly PartnerTeamMember[];
  readonly isTeamLoading: boolean;
  readonly teamError: string | null;
};

export function useDshPartnerSurfaceModel(route: DshPartnerRoute): DshPartnerSurfaceModel {
  const storeScope = useStoreScopeModel();
  const verifiedStoreId = !storeScope.isLoadingScopes && !storeScope.scopesError
    ? storeScope.selectedStoreScope?.storeId
    : undefined;
  const orders = usePartnerOrdersModel({
    route,
    ...(verifiedStoreId ? { storeId: verifiedStoreId } : {}),
  });
  const opsSummary = usePartnerOpsSummaryModel(orders.partnerOrders);
  const team = usePartnerTeamModel({
    route,
    storeId: verifiedStoreId ?? null,
  });

  return {
    state: {
      storeScopeVisible: storeScope.storeScopeVisible,
      selectedStoreScopeId: storeScope.selectedStoreScopeId ?? '',
    },
    actions: {
      setStoreScopeVisible: storeScope.setStoreScopeVisible,
      setSelectedStoreScopeId: storeScope.setSelectedStoreScopeId,
      openStoreScope: storeScope.openStoreScope,
      refreshOrders: orders.refresh,
      onInviteMember: team.onInviteMember,
      onMemberAction: team.onMemberAction,
    },
    scopes: storeScope.scopes,
    selectedStoreScope: storeScope.selectedStoreScope,
    isLoadingScopes: storeScope.isLoadingScopes,
    scopesError: storeScope.scopesError,
    runtimePartnerProfile: storeScope.runtimePartnerProfile,
    partnerOrdersState: orders.partnerOrdersState,
    partnerOrders: orders.partnerOrders,
    deliveryOpsSummary: opsSummary.deliveryOpsSummary,
    teamMembers: team.teamMembers,
    isTeamLoading: team.isTeamLoading,
    teamError: team.teamError,
  };
}
