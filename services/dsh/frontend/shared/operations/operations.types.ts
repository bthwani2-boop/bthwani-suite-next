// DSH Operations domain — workspace IDs, group meta, focus params, view state.
// No JSX. No ui-kit. No Tamagui.

import type { DshFulfillmentDeliveryMode } from '../delivery/delivery.contract';
import type { CanonicalOperationsGroupId } from './dsh-operational.contract';
export type { CanonicalOperationsGroupId };

export type OperationsPanelId = 'detail' | 'chat' | 'batches';

export type DshFulfillmentOperationalMode = DshFulfillmentDeliveryMode;

export type OperationsFocusParams = {
  orderId?: string | undefined;
  customerId?: string | undefined;
  ticketId?: string | undefined;
  callId?: string | undefined;
  requestId?: string | undefined;
  panel?: OperationsPanelId | undefined;
  subGroup?: string | undefined;
};

export const DSH_FULFILLMENT_OPERATIONAL_MODE_META: Readonly<Record<DshFulfillmentOperationalMode, {
  readonly label: string;
  readonly operationalOwner: string;
  readonly requiresCaptain: boolean;
  readonly requiresPartnerCourier: boolean;
  readonly requiresCustomerPickup: boolean;
}>> = {
  bthwani_delivery: {
    label: 'توصيل بثواني',
    operationalOwner: 'الكابتن + بثواني',
    requiresCaptain: true,
    requiresPartnerCourier: false,
    requiresCustomerPickup: false,
  },
  partner_delivery: {
    label: 'توصيل الشريك',
    operationalOwner: 'ساعي الشريك',
    requiresCaptain: false,
    requiresPartnerCourier: true,
    requiresCustomerPickup: false,
  },
  pickup: {
    label: 'استلام ذاتي',
    operationalOwner: 'العميل + المتجر',
    requiresCaptain: false,
    requiresPartnerCourier: false,
    requiresCustomerPickup: true,
  },
} as const;

type DshOperationsOrderRow = {
  id: string;
  storeName: string;
  customerName: string;
  statusLabel: string;
  statusTone: 'warning' | 'danger' | 'success' | 'neutral';
  fulfillmentMode: DshFulfillmentOperationalMode;
  nextAction: string;
  slaLabel: string;
};

export type LegacyOperationsWorkspaceId =
  | 'overview'
  | 'orders'
  | 'dashboard'
  | 'dispatch-fleet'
  | 'tracking-handoff'
  | 'exceptions-sla'
  | 'partner-readiness'
  | 'proxy-shein-awnak'
  | 'audit-evidence'
  | 'captain-ops'
  | 'field-ops'
  | 'issues'
  | 'serviceability'
  | 'guard-status'
  | 'evidence'
  | 'order-detail'
  | 'orderchat'
  | 'assisted-order-desk'
  | 'order-rescue'
  | 'dispatch-assignment'
  | 'geo-heatmap'
  | 'sheinproxy'
  | 'awnak-operations'
  | 'captain-operations'
  | 'partner-stores'
  | 'area-capacity'
  | 'exceptions-escalations'
  | 'audit-support-sla'
  | 'dispatch'
  | 'live-tracking'
  | 'exceptions'
  | 'sla'
  | 'audit'
  | 'partner-prep'
  | 'handoff'
  | 'proof-review'
  | 'capacity'
  | 'partners'
  | 'catalogs'
  | 'catalog-categories'
  | 'marketing'
  | 'banners'
  | 'growth'
  | 'loyalty'
  | 'smart-signal'
  | 'reassign'
  | 'peak-mode'
  | 'bell'
  | 'arrival-bell'
  | 'zone-set'
  | 'live-map-capacity';

export type LegacySectionRedirectId =
  | 'support'
  | 'finance'
  | 'settlements'
  | 'cod'
  | 'refunds'
  | 'catalogs'
  | 'catalog-categories'
  | 'marketing'
  | 'banners'
  | 'growth'
  | 'loyalty'
  | 'smart-signal'
  | 'partners'
  | 'platform'
  | 'administration';

export type AnyOperationsWorkspaceId = CanonicalOperationsGroupId | LegacyOperationsWorkspaceId | LegacySectionRedirectId | 'orders' | 'overview';

export type NonOperationsSectionRootId = 'support' | 'finance' | 'catalogs' | 'marketing' | 'partners' | 'platform' | 'administration';

export type OperationsSubGroupMeta = {
  id: string;
  label: string;
};

export type OperationsTertiaryFilterId = 'الكل' | 'في الطريق' | 'فوق الحد' | 'أعلى خطر' | 'أدنى خطر';

export type OperationsGroupMeta = {
  id: CanonicalOperationsGroupId;
  label: string;
  description: string;
  badge: string;
  subGroups?: readonly OperationsSubGroupMeta[];
  tertiaryFilters?: readonly OperationsTertiaryFilterId[];
};

export type OperationsNormalizationResult =
  | {
      kind: 'group';
      group: CanonicalOperationsGroupId;
      sourceWorkspace?: AnyOperationsWorkspaceId | undefined;
      panel?: OperationsPanelId | undefined;
      subGroup?: string | undefined;
    }
  | {
      kind: 'redirect';
      sourceWorkspace: AnyOperationsWorkspaceId;
      section: NonOperationsSectionRootId;
      href: `/dsh/${NonOperationsSectionRootId}`;
    };

export type OperationsViewState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled';

export type StateViewCopy = {
  stateId?: 'loading' | 'empty' | 'offline' | 'recoverableError';
  kind?: 'warning';
  title: string;
  description: string;
  actionLabel: string;
};
