import {
  getDshPartnerActivationStateMetadata,
  getDshPartnerReadinessChecklist,
  getDshPartnerVisibilityBadge,
  getDshPartnerVisibilityBadgeLabel,
  type DshPartnerActivationStatus,
  type DshPartnerReadinessCheckItem,
  type DshPartnerVisibilityBadge,
} from './partner-activation.model';

export type DshClientVisibilityBlockedCode =
  | 'field_readiness_not_ready'
  | 'documents_not_verified'
  | 'ops_not_approved'
  | 'partner_not_active'
  | 'catalog_not_published'
  | 'delivery_mode_not_available'
  | 'serviceability_not_available'
  | 'product_not_approved'
  | 'category_not_mapped'
  | 'duplicate_detected'
  | 'media_policy_not_satisfied'
  | 'publishing_not_ready';

export type DshStoreClientVisibilityResult = {
  readonly visible: boolean;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly badge: DshPartnerVisibilityBadge;
  readonly badgeLabel: string;
  readonly blockedCode?: DshClientVisibilityBlockedCode | undefined;
  readonly blockedReason?: string | undefined;
  readonly checklist: ReadonlyArray<DshPartnerReadinessCheckItem>;
  readonly catalogPublished: boolean;
  readonly deliveryModesReady: boolean;
  readonly serviceabilityAvailable: boolean;
};

export type DshStoreClientVisibilityOptions = {
  readonly storeId?: string;
  readonly publishStage?: string | undefined;
  readonly approvalStage?: string;
  readonly activationStatus?: DshPartnerActivationStatus | undefined;
  readonly fieldReadinessReady?: boolean;
  readonly documentsVerified?: boolean;
  readonly opsApproved?: boolean;
  readonly catalogPublished?: boolean;
  readonly deliveryModesReady?: boolean;
  readonly serviceabilityAvailable?: boolean;
  readonly storeOpen?: boolean;
  readonly busy?: boolean;
  readonly inZone?: boolean;
  readonly supportsPickup?: boolean;
  readonly supportsPartnerDelivery?: boolean;
  readonly hasBthwaniDelivery?: boolean;
  readonly serviceLabel?: string;
  readonly deliveryLabel?: string;
};

export function mapApprovalStageToPartnerActivationStatus(
  stage?: string,
): DshPartnerActivationStatus {
  switch (stage) {
    case 'field-submitted':
      return 'documents_uploaded';
    case 'partner-submitted':
      return 'submitted';
    case 'partner-review':
      return 'documents_verified';
    case 'partner-approved':
      return 'catalog_not_ready';
    case 'marketing-review':
      return 'catalog_ready';
    case 'marketing-approved':
      return 'delivery_modes_ready';
    case 'catalog-adopted':
      return 'partner_active';
    case 'client-visible':
    case 'published':
      return 'client_visible';
    case 'rejected':
      return 'ops_rejected';
    case 'needs-fix':
      return 'documents_missing';
    case 'field-draft':
    case 'draft':
      return 'draft';
    default:
      return 'draft';
  }
}

export function mapPublishStageToPartnerActivationStatus(
  publishStage?: string,
): DshPartnerActivationStatus {
  if (publishStage === 'published-preview') {
    return 'partner_active';
  }
  return mapApprovalStageToPartnerActivationStatus(publishStage);
}

function inferFieldReadinessReady(
  status: DshPartnerActivationStatus,
  explicit?: boolean,
): boolean {
  if (typeof explicit === 'boolean') return explicit;
  return status !== 'draft';
}

function inferDocumentsVerified(
  status: DshPartnerActivationStatus,
  explicit?: boolean,
): boolean {
  if (typeof explicit === 'boolean') return explicit;
  return (
    status !== 'draft' &&
    status !== 'submitted' &&
    status !== 'field_visit_scheduled' &&
    status !== 'field_visit_completed' &&
    status !== 'documents_missing' &&
    status !== 'documents_uploaded'
  );
}

function inferOpsApproved(
  status: DshPartnerActivationStatus,
  explicit?: boolean,
): boolean {
  if (typeof explicit === 'boolean') return explicit;
  return (
    status === 'ops_approved' ||
    status === 'partner_active' ||
    status === 'client_visible' ||
    status === 'client_hidden'
  );
}

function inferCatalogPublished(publishStage?: string): boolean {
  return publishStage === 'published' || publishStage === 'client-visible' || publishStage === 'published-preview';
}

function inferDeliveryModesReady(options: DshStoreClientVisibilityOptions): boolean {
  if (typeof options.deliveryModesReady === 'boolean') return options.deliveryModesReady;
  return !!options.supportsPickup || !!options.supportsPartnerDelivery || !!options.hasBthwaniDelivery;
}

function inferServiceabilityAvailable(options: DshStoreClientVisibilityOptions): boolean {
  if (typeof options.serviceabilityAvailable === 'boolean') return options.serviceabilityAvailable;
  return true;
}

function resolveStoreBlockedReason(
  code: DshClientVisibilityBlockedCode,
  status: DshPartnerActivationStatus,
): string {
  const metadata = getDshPartnerActivationStateMetadata(status);
  switch (code) {
    case 'field_readiness_not_ready':
      return 'الزيارة الميدانية وتدقيق البيانات لم يكتمل بعد.';
    case 'documents_not_verified':
      return metadata.blockedReason || 'الوثائق غير معتمدة أو لم يتم التحقق منها بعد.';
    case 'ops_not_approved':
      return 'بانتظار الاعتماد النهائي من العمليات وتفعيل المتجر.';
    case 'partner_not_active':
      return 'الشريك غير نشط تشغيليًا حاليًا.';
    case 'catalog_not_published':
      return 'الكتالوج غير معتمد أو غير جاهز للنشر للعملاء.';
    case 'delivery_mode_not_available':
      return 'أوضاع التوصيل غير مكتملة — يجب تحديد طريقة توصيل واحدة على الأقل.';
    case 'serviceability_not_available':
      return 'الخدمة غير متوفرة في النطاق الجغرافي المحدد.';
    default:
      return metadata.blockedReason || 'المتجر غير نشط بانتظار الاعتماد.';
  }
}

function withServiceabilityChecklist(
  checklist: ReadonlyArray<DshPartnerReadinessCheckItem>,
  serviceabilityAvailable: boolean,
): ReadonlyArray<DshPartnerReadinessCheckItem> {
  return [
    ...checklist,
    {
      id: 'serviceability',
      label: 'الخدمة متوفرة في النطاق',
      satisfied: serviceabilityAvailable,
      blockedReason: serviceabilityAvailable ? undefined : 'الموقع المحدد خارج نطاق تغطية الخدمة حاليًا.',
    },
  ];
}

export function resolveDshStoreClientVisibility(
  options: DshStoreClientVisibilityOptions,
): DshStoreClientVisibilityResult {
  let activationStatus = options.activationStatus;
  if (!activationStatus) {
    activationStatus = mapPublishStageToPartnerActivationStatus(options.approvalStage ?? options.publishStage);
  }
  const fieldReadinessReady = inferFieldReadinessReady(activationStatus, options.fieldReadinessReady);
  const documentsVerified = inferDocumentsVerified(activationStatus, options.documentsVerified);
  const opsApproved = inferOpsApproved(activationStatus, options.opsApproved);
  const partnerActive = activationStatus === 'partner_active' || activationStatus === 'client_visible';
  const catalogPublished = typeof options.catalogPublished === 'boolean'
    ? options.catalogPublished
    : inferCatalogPublished(options.publishStage);
  const deliveryModesReady = inferDeliveryModesReady(options);
  const serviceabilityAvailable = inferServiceabilityAvailable(options);
  
  const badge = getDshPartnerVisibilityBadge(
    activationStatus,
    options.storeOpen ?? true,
    options.busy ?? false,
    options.inZone ?? serviceabilityAvailable,
  );
  const checklist = withServiceabilityChecklist(
    getDshPartnerReadinessChecklist(activationStatus),
    serviceabilityAvailable,
  );

  const blockedCode =
    !fieldReadinessReady ? 'field_readiness_not_ready'
      : !documentsVerified ? 'documents_not_verified'
        : !opsApproved ? 'ops_not_approved'
          : !partnerActive ? 'partner_not_active'
            : !catalogPublished ? 'catalog_not_published'
              : !deliveryModesReady ? 'delivery_mode_not_available'
                : !serviceabilityAvailable ? 'serviceability_not_available'
                  : undefined;

  return {
    visible: !blockedCode,
    activationStatus,
    badge,
    badgeLabel: getDshPartnerVisibilityBadgeLabel(badge),
    blockedCode,
    blockedReason: blockedCode ? resolveStoreBlockedReason(blockedCode, activationStatus) : undefined,
    checklist,
    catalogPublished,
    deliveryModesReady,
    serviceabilityAvailable,
  };
}

// ─── Transport Error & Readiness Status ──────────────────────────────────────
// Used by InventoryCatalogScreen and other catalog surfaces
type DshStoreVisibilityTransportError = {
  readonly code: string;
  readonly message: string;
};

type PartnerReadinessStatus =
  | 'ready'
  | 'not_ready'
  | 'pending'
  | 'blocked';
