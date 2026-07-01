import type { DshPartnerActivationStatus } from './partner-activation.model';

export type DshPartner = {
  readonly id: string;
  readonly legalNameAr: string;
  readonly legalNameEn: string;
  readonly displayName: string;
  readonly legalIdentityType: string;
  readonly legalIdentityNumber: string;
  readonly ownerName: string;
  readonly primaryPhone: string;
  readonly secondaryPhone: string;
  readonly email: string;
  readonly category: string;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly notes: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerSummary = {
  readonly id: string;
  readonly displayName: string;
  readonly legalNameAr: string;
  readonly category: string;
  readonly activationStatus: DshPartnerActivationStatus;
  readonly primaryPhone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerDocument = {
  readonly id: string;
  readonly partnerId: string;
  readonly documentType: string;
  readonly documentStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_resubmit';
  readonly uploadedByActorId: string;
  readonly mediaRef: string;
  readonly notes: string;
  readonly rejectionReason: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshPartnerFieldVisit = {
  readonly id: string;
  readonly partnerId: string;
  readonly storeId: string;
  readonly fieldActorId: string;
  readonly visitStatus: 'draft' | 'in_progress' | 'submitted' | 'escalated';
  readonly visitNotes: string;
  readonly locationLatitude: number | null;
  readonly locationLongitude: number | null;
  readonly evidenceMediaRefs: string[];
  readonly version: number;
  readonly createdAt: string;
  readonly submittedAt: string | null;
};

export type DshPartnerReadinessItem = {
  readonly id: string;
  readonly label: string;
  readonly satisfied: boolean;
  readonly blockedReason?: string;
};

export type DshPartnerReadiness = {
  readonly partnerId: string;
  readonly canActivate: boolean;
  readonly blockedReason?: string;
  readonly checklist: DshPartnerReadinessItem[];
};

export type DshPartnerAuditEvent = {
  readonly id: string;
  readonly partnerId: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly actorId: string;
  readonly actorSurface: string;
  readonly reason: string;
  readonly correlationId: string;
  readonly createdAt: string;
};

export type DshPartnerStore = {
  readonly id: string;
  readonly partnerId: string;
  readonly slug: string;
  readonly displayName: string;
  readonly status: string;
  readonly isVisible: boolean;
  readonly cityCode: string;
  readonly createdAt: string;
};

export type DshFieldPartnerProduct = {
  readonly id: string;
  readonly storeId: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string;
  readonly sku: string;
  readonly priceReference: string;
  readonly isActive: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshFieldPartnerProductInput = {
  readonly name: string;
  readonly description?: string;
  readonly priceReference: string;
  readonly isActive?: boolean;
  readonly expectedVersion?: number;
};

export type DshCreatePartnerInput = {
  readonly legalNameAr: string;
  readonly legalNameEn?: string;
  readonly displayName: string;
  readonly legalIdentityType: string;
  readonly legalIdentityNumber: string;
  readonly ownerName?: string;
  readonly primaryPhone: string;
  readonly secondaryPhone?: string;
  readonly email?: string;
  readonly category?: string;
  readonly notes?: string;
};

export type DshUpdatePartnerRequest = {
  readonly displayName?: string;
  readonly ownerName?: string;
  readonly primaryPhone?: string;
  readonly secondaryPhone?: string;
  readonly email?: string;
  readonly notes?: string;
};

export type DshPartnerTransitionInput = {
  readonly toStatus: DshPartnerActivationStatus;
  readonly reason?: string;
};

export type DshAddDocumentInput = {
  readonly documentType: string;
  readonly mediaRef: string;
  readonly notes?: string;
};

export type DshReviewDocumentInput = {
  readonly decision: 'approved' | 'rejected' | 'needs_resubmit';
  readonly reason?: string;
};

export type DshCreatePartnerFieldVisitRequest = {
  readonly storeId?: string;
  readonly visitNotes?: string;
  readonly locationLatitude?: number;
  readonly locationLongitude?: number;
  readonly evidenceMediaRefs?: string[];
};

export type DshPartnerListResponse = {
  readonly partners: DshPartnerSummary[];
  readonly pagination: {
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
  };
};

export type DshPartnerDocumentType =
  | "national_id"
  | "commercial_register"
  | "lease_agreement"
  | "health_certificate"
  | "store_photo"
  | "owner_photo"
  | "other";

export const REQUIRED_DOCUMENT_TYPES: DshPartnerDocumentType[] = [
  "national_id",
  "commercial_register",
];

export const DOCUMENT_TYPE_LABELS: Record<DshPartnerDocumentType, string> = {
  national_id: "الهوية الوطنية",
  commercial_register: "السجل التجاري",
  lease_agreement: "عقد الإيجار أو الملكية",
  health_certificate: "شهادة صحة / ترخيص",
  store_photo: "صورة المتجر",
  owner_photo: "صورة المالك",
  other: "مستند آخر",
};

export type DshFulfillmentDeliveryMode = 'partner_delivery' | 'bthwani_delivery' | 'pickup';

export const DSH_PARTNER_OPERATIONAL_FLOW_IDS = [
  'order-accept',
  'order-get',
  'order-handoff',
  'order-alerts',
  'order-sla-risk',
  'order-issue-queue',
  'order-issue-required',
  'order-out-for-delivery',
  'order-prepare',
  'order-ready',
  'order-reject',
  'order-store-delivered',
  'order-chat-read-ack',
  'order-chat-send',
  'order-quick-reply-config',
  'order-quick-reply-settings',
  'order-quick-reply-setup',
  'inventory-adjust',
  'inventory-update',
  'items-upsert',
  'doc-upload',
  'intake-start',
  'store-nomination',
  'video-upload',
  'partner-finance-bridge',
  'partner-settlement-summary',
  'partner-commission-summary',
] as const;

export type DshPartnerOperationalFlowId = (typeof DSH_PARTNER_OPERATIONAL_FLOW_IDS)[number];

export const DSH_PARTNER_OPERATIONAL_FLOW_IDS_EXPECTED_COUNT = DSH_PARTNER_OPERATIONAL_FLOW_IDS.length;

export const DSH_PARTNER_SUPPORT_ROUTE_IDS = [
  'auction-status-update',
  'chat-read-ack',
  'chat-send',
  'doc-upload',
  'intake-start',
  'inventory-adjust',
  'inventory-update',
  'items-upsert',
  'order-accept',
  'order-get',
  'order-handoff',
  'order-issue-queue',
  'order-out-for-delivery',
  'order-prepare',
  'order-ready',
  'order-reject',
  'order-store-delivered',
  'quick-reply-config',
  'quick-reply-settings',
  'quick-reply-setup',
  'store-nomination',
  'video-upload',
] as const;

export type DshPartnerSupportRouteId = (typeof DSH_PARTNER_SUPPORT_ROUTE_IDS)[number];

export const DSH_PARTNER_SUPPORT_ISSUE_CATEGORY_IDS = [
  'delayed-preparation',
  'item-unavailable',
  'partner-reject-request',
  'courier-not-arrived',
  'customer-not-responding',
  'handoff-mismatch',
  'wrong-item',
  'payment-refund-review',
] as const;

export type DshPartnerSupportIssueCategoryId = (typeof DSH_PARTNER_SUPPORT_ISSUE_CATEGORY_IDS)[number];

export type DshPartnerSupportCommandFilterId =
  | 'all'
  | 'active-orders'
  | 'order-issues'
  | 'conversations'
  | 'inventory-branch'
  | 'escalation'
  | 'urgent';

export type DshPartnerSupportCommandContext = {
  filterId: DshPartnerSupportCommandFilterId;
  highlightedCaseId?: string | null;
  highlightedIssueCategoryId?: DshPartnerSupportIssueCategoryId | null;
  preferredOperationalFlowId?: DshPartnerOperationalFlowId | null;
  preferredSupportRouteId?: DshPartnerSupportRouteId | null;
  source?: 'operations' | 'bell' | 'settings' | 'orders' | 'hub';
};

export const DSH_PARTNER_HIDDEN_COMPAT_SUPPORT_ROUTE_IDS = [
  'auction-status-update',
] as const satisfies readonly DshPartnerSupportRouteId[];

export const DSH_PARTNER_HIDDEN_COMPAT_OPERATIONAL_FLOW_IDS = [
  'order-alerts',
  'order-sla-risk',
  'order-issue-required',
  'partner-finance-bridge',
  'partner-settlement-summary',
  'partner-commission-summary',
] as const satisfies readonly DshPartnerOperationalFlowId[];

export const DSH_PARTNER_SUPPORT_ROUTE_TO_OPERATIONAL_FLOW: Record<DshPartnerSupportRouteId, DshPartnerOperationalFlowId | null> = {
  'auction-status-update': null,
  'chat-read-ack': 'order-chat-read-ack',
  'chat-send': 'order-chat-send',
  'doc-upload': 'doc-upload',
  'intake-start': 'intake-start',
  'inventory-adjust': 'inventory-adjust',
  'inventory-update': 'inventory-update',
  'items-upsert': 'items-upsert',
  'order-accept': 'order-accept',
  'order-get': 'order-get',
  'order-handoff': 'order-handoff',
  'order-issue-queue': 'order-issue-queue',
  'order-out-for-delivery': 'order-out-for-delivery',
  'order-prepare': 'order-prepare',
  'order-ready': 'order-ready',
  'order-reject': 'order-reject',
  'order-store-delivered': 'order-store-delivered',
  'quick-reply-config': 'order-quick-reply-config',
  'quick-reply-settings': 'order-quick-reply-settings',
  'quick-reply-setup': 'order-quick-reply-setup',
  'store-nomination': 'store-nomination',
  'video-upload': 'video-upload',
};

export const DSH_PARTNER_OPERATIONAL_FLOW_TO_SUPPORT_ROUTE: Record<DshPartnerOperationalFlowId, DshPartnerSupportRouteId | null> = {
  'order-accept': 'order-accept',
  'order-get': 'order-get',
  'order-handoff': 'order-handoff',
  'order-alerts': null,
  'order-sla-risk': null,
  'order-issue-queue': 'order-issue-queue',
  'order-issue-required': null,
  'order-out-for-delivery': 'order-out-for-delivery',
  'order-prepare': 'order-prepare',
  'order-ready': 'order-ready',
  'order-reject': 'order-reject',
  'order-store-delivered': 'order-store-delivered',
  'order-chat-read-ack': 'chat-read-ack',
  'order-chat-send': 'chat-send',
  'order-quick-reply-config': 'quick-reply-config',
  'order-quick-reply-settings': 'quick-reply-settings',
  'order-quick-reply-setup': 'quick-reply-setup',
  'inventory-adjust': 'inventory-adjust',
  'inventory-update': 'inventory-update',
  'items-upsert': 'items-upsert',
  'doc-upload': 'doc-upload',
  'intake-start': 'intake-start',
  'store-nomination': 'store-nomination',
  'video-upload': 'video-upload',
  'partner-finance-bridge': null,
  'partner-settlement-summary': null,
  'partner-commission-summary': null,
};

export type PartnerStoreScopeOption = {
  id: string;
  label: string;
  description: string;
};

export const storeScopeOptions: readonly PartnerStoreScopeOption[] = [
  { id: 'all', label: 'كل الفروع', description: 'إظهار لوحة موحدة لكل فروع الشريك.' },
  { id: 'fakhama-1', label: 'فرع الفخامة 1', description: 'الفرع التشغيلي الأساسي الحالي.' },
  { id: 'fakhama-2', label: 'فرع الفخامة 2', description: 'فرع مدينة الرياض الحيوي للشريك.' },
  { id: 'fakhama-3', label: 'فرع الفخامة 3', description: 'فرع طريق الملك عبد العزيز المطور.' },
] as const;

export type PartnerRuntimeProfile = {
  storeName: string;
  branchLabel: string;
  cityLabel: string;
  managerLabel: string;
  todayHoursLabel: string;
  activeZoneLabel: string;
};

export type DshPartnerRoute =
  | 'home'
  | 'entry'
  | 'inbox'
  | 'bell'
  | 'support-directory'
  | 'support-screen'
  | 'inventory-management'
  | 'order-rejection'
  | 'store-courier'
  | 'product-edit'
  | 'category-management'
  | 'product-media'
  | 'product-overrides'
  | 'team-management';

export type PartnerHubSection = 'hub' | 'profile' | 'operations' | 'inventory' | 'wallet' | 'analytics' | 'settings';

