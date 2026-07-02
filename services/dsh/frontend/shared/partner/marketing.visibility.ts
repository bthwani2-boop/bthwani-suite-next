import type { PartnerOfferRecord } from './dsh-partner-offer-types';

export type MarketingVisibilityRecord = {
  readonly campaignId?: string;
  readonly contentType: string;
  readonly targetSurface: string;
  readonly linkedStoreId?: string;
  readonly linkedProductId?: string;
  readonly linkedCategoryId?: string;
  readonly partnerVisibilityRequired: boolean;
  readonly catalogPublishingRequired: boolean;
  readonly approvalStatus: string;
  readonly displayStatus: 'visible' | 'hidden' | 'blocked' | 'summary-only';
  readonly routeHint?: string;
  readonly blockedReason?: string;
};

export function getPartnerOfferVisibilityRecord(
  offer: PartnerOfferRecord,
  options: { targetSurface: string; partnerStatus?: string; productApprovalStatus?: string }
): MarketingVisibilityRecord {
  const isBlocked = offer.status === 'paused' || offer.status === 'rejected';
  return {
    contentType: 'offer',
    targetSurface: options.targetSurface,
    approvalStatus: offer.status,
    partnerVisibilityRequired: false,
    catalogPublishingRequired: false,
    displayStatus: (offer.status === 'rejected' || offer.status === 'archived') ? 'hidden' : 'visible',
    ...(isBlocked ? { blockedReason: 'تم إيقاف العرض أو رفضه.' } : {}),
  };
}
