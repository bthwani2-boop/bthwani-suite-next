// DSH Operations domain — workspace IDs, group meta, focus params, view state.
// No JSX. No ui-kit. No Tamagui.

import type { CanonicalOperationsGroupId } from './dsh-operational.contract';
export type { CanonicalOperationsGroupId };

export type OperationsPanelId = 'detail' | 'timeline' | 'chat' | 'batches' | 'proof' | 'audit' | 'dispatch' | 'exception';

export type DshControlPanelTone = 'neutral' | 'success' | 'warning' | 'danger';

/**
 * Normalizes data-driven tone labels (from preview/runtime data) to
 * the standard set used by UI components.
 * Used by all operations screens to render status tags and risk badges.
 */
export const DSH_CONTROL_PANEL_TONE_MAP: Record<string, DshControlPanelTone> = {
  warning: 'warning',
  danger: 'danger',
  best: 'success',
  brand: 'neutral',
  success: 'success',
  neutral: 'neutral',
  completed: 'success',
  delivered: 'success',
  cancelled: 'danger',
  pending: 'warning',
};

export type OperationsFocusParams = {
  orderId?: string | undefined;
  customerId?: string | undefined;
  ticketId?: string | undefined;
  callId?: string | undefined;
  requestId?: string | undefined;
  panel?: OperationsPanelId | undefined;
  subGroup?: string | undefined;
};

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

export type OperationsViewState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled';

export type StateViewCopy = {
  stateId?: 'loading' | 'empty' | 'offline' | 'recoverableError';
  kind?: 'warning';
  title: string;
  description: string;
  actionLabel: string;
};
