// Shared types for the DSH partner hub surface and its sub-panels.
// Extracted from app-partner/account/PartnerHubScreen.tsx as part of the
// hub-screen decomposition (Workstream B.1). Kept here so multiple
// app-partner/account/* files can share a single source of truth without
// reaching back into the (still shrinking) hub screen module.
import type React from 'react';
import type { Icon } from '@bthwani/ui-kit';
import type { PartnerHubSection } from './partner.types';

export type BThwaniAppearanceMode = 'lightPremium' | 'darkGlass';

export type DshCanonicalStoreCard = {
  readonly id?: string;
  readonly sourceRecordId?: string;
  readonly publishStage?: string;
  readonly zoneLabel?: string;
  readonly storeName?: string;
  readonly cityLabel?: string;
  readonly branchLabel?: string;
  readonly managerName?: string;
  readonly operatingHoursLabel?: string;
  readonly deliveryReadinessLabel?: string;
  readonly coverageSummary?: string;
};

export type PartnerOperationalModeId = 'pickup' | 'partner_delivery' | 'bthwani_delivery';

export type PartnerOperationalMode = {
  id: PartnerOperationalModeId;
  title: string;
  subtitle: string;
  commission: string | undefined;
  enabled: boolean;
};

export type HubNavigationItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  section: Exclude<PartnerHubSection, 'hub'>;
};

export type SummaryItem = {
  id: string;
  label: string;
  value: string;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'info' | 'danger';
};

export type NotificationPreferenceId =
  | 'orders'
  | 'operations'
  | 'inventory'
  | 'finance'
  | 'marketing'
  | 'system'
  | 'sound'
  | 'dailyDigest'
  | 'priorityOnly';

export type NotificationPreferenceState = Record<NotificationPreferenceId, boolean>;

// Coverage zone shape is owned centrally in partner.types.ts as
// `DshPartnerCoverageZone` (identical shape). Re-export instead of
// duplicating the type definition.
export type { DshPartnerCoverageZone as PartnerCoverageZone } from './partner.types';
export type { DshPartnerCoverageZone } from './partner.types';
import type { DshPartnerCoverageZone as _DshPartnerCoverageZone } from './partner.types';
export type PartnerCoverageZoneStatus = _DshPartnerCoverageZone['status'];
