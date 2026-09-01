import {
  getDshPartnerVisibilityBadge,
  getDshPartnerVisibilityBadgeLabel,
  type DshPartnerActivationStatus,
  type DshPartnerVisibilityBadge,
} from './partner-activation.model';
import type { DshPartnerReadiness, DshPartnerReadinessItem } from './partner.types';

// This module only projects canonical DSH readback for presentation. It does
// not infer lifecycle, readiness, publication, or serviceability decisions.
export type DshClientVisibilityBlockedCode =
  | 'partner_suspended'
  | 'publishing_not_ready'
  | 'store_not_linked';

export type DshStoreClientVisibilityResult = {
  readonly visible: boolean;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly badge: DshPartnerVisibilityBadge;
  readonly badgeLabel: string;
  readonly blockedCode?: DshClientVisibilityBlockedCode;
  readonly blockedReason?: string;
  readonly checklist: ReadonlyArray<DshPartnerReadinessItem>;
};

export type DshStoreClientVisibilityOptions = {
  readonly readiness: DshPartnerReadiness;
  readonly storeId: string;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly storeOpen?: boolean;
  readonly busy?: boolean;
  readonly inZone?: boolean;
};

export function resolveDshStoreClientVisibility({
  readiness,
  storeId,
  activationStatus,
  storeOpen = false,
  busy = false,
  inZone = true,
}: DshStoreClientVisibilityOptions): DshStoreClientVisibilityResult {
  const store = readiness.stores.find((candidate) => candidate.storeId === storeId);
  const visible = store?.publicationDecision === 'PUBLISHED' && store.isClientVisible;
  const blockedCode: DshClientVisibilityBlockedCode | undefined =
    activationStatus === 'partner_suspended'
      ? 'partner_suspended'
      : store
        ? (visible ? undefined : 'publishing_not_ready')
        : 'store_not_linked';
  const blockedReason = visible
    ? undefined
    : store?.blockingReasons.join('، ') || readiness.partnerActivationBlockedReason || readiness.blockingReasons.join('، ') || 'قرار النشر محجوب من DSH.';
  const badge = getDshPartnerVisibilityBadge(activationStatus, storeOpen, busy, inZone);

  return {
    visible,
    activationStatus,
    badge,
    badgeLabel: getDshPartnerVisibilityBadgeLabel(badge),
    checklist: readiness.checklist,
    ...(blockedCode ? { blockedCode } : {}),
    ...(blockedReason ? { blockedReason } : {}),
  };
}
