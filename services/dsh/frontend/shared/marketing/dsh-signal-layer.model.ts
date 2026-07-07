/**
 * P0-08 — DSH Signal Layer Model
 *
 * Centralized signal type contract for all DSH actor surfaces.
 * On-demand retrieval enforced: lists show summaries only; details open on explicit action.
 * No backend binding, no mutation, no eager payload loading.
 *
 * Actor routing: each signal kind declares which surfaces and roles receive it,
 * and which route opens on action — ensuring every signal has a destination.
 */

import {
  getAllApprovalRecords,
  MARKETING_SIGNAL_ENTITY_TYPES,
  MARKETING_SIGNAL_STAGES,
  type ApprovalRecord,
} from '../partner/partner.workflow';

type MediaReviewRecord = ApprovalRecord & {
  systemNote?: string;
};

let _approvalRecordsCache: ApprovalRecord[] = [];

export async function refreshDshMarketingSignals(): Promise<void> {
  _approvalRecordsCache = await getAllApprovalRecords();
}

function getMediaReviewItems(): MediaReviewRecord[] {
  return _approvalRecordsCache
    .filter((record: ApprovalRecord) =>
      (MARKETING_SIGNAL_ENTITY_TYPES as readonly string[]).includes(record.entityType) &&
      (MARKETING_SIGNAL_STAGES as readonly string[]).includes(record.stage)
    )
    .map((record: ApprovalRecord) => {
      const systemNote = record.metadata?.systemNote ?? record.metadata?.requiredFix ?? record.metadata?.rejectionReason;
      const res: MediaReviewRecord = { ...record };
      if (systemNote !== undefined) {
        res.systemNote = systemNote;
      }
      return res;
    });
}

// ─── Event Kinds ─────────────────────────────────────────────────────────────

export type DshSignalEventKind =
  // Partner lifecycle
  | 'partner_submitted'
  | 'partner_docs_missing'
  | 'partner_approved'
  | 'partner_rejected'
  // Catalog
  | 'catalog_item_approved'
  | 'catalog_item_rejected'
  | 'catalog_published'
  // Marketing review lifecycle
  | 'marketing_content_approved'
  | 'marketing_content_rejected'
  | 'marketing_content_needs_fix'
  // Order lifecycle
  | 'order_created'
  | 'payment_failed'
  | 'partner_accepted'
  | 'partner_rejected_order'
  | 'captain_assigned'
  | 'captain_declined'
  | 'reassignment_required'
  | 'picked_up'
  | 'delivered'
  | 'delivery_failed'
  // Support / SLA
  | 'ticket_created'
  | 'ticket_escalated'
  | 'sla_breach'
  | 'manual_call_intake_requested'
  | 'customer_360_followup'
  | 'assisted_order_requested'
  | 'order_rescue_requested'
  | 'partner_capacity_degraded'
  | 'catalog_conflict_detected'
  // WLT finance — read-only display only; DSH never mutates
  | 'refund_pending_wlt'
  | 'refund_completed_wlt'
  | 'settlement_ready_wlt';

// ─── Surface / Role ───────────────────────────────────────────────────────────

export type DshSignalRecipientSurface =
  | 'app-client'
  | 'app-partner'
  | 'app-captain'
  | 'app-field'
  | 'control-panel';

export type DshSignalRecipientRole =
  | 'client'
  | 'partner'
  | 'captain'
  | 'field'
  | 'ops'
  | 'system';

export type DshSignalEntityType =
  | 'order'
  | 'partner'
  | 'catalog'
  | 'marketing'
  | 'captain'
  | 'ticket'
  | 'refund'
  | 'settlement'
  | 'payment'
  | 'sla';

export type DshSignalPriority = 'normal' | 'important' | 'urgent';

// ─── Actions & Policy ─────────────────────────────────────────────────────────

export type DshSignalAction = {
  readonly actionId: string;
  readonly label: string;
  /** Route ID — every signal action must have a destination; no orphan signals */
  readonly routeId: string;
};

export type DshSignalOnDemandPolicy = {
  /** Full detail screen route — opened only on explicit user action, never eagerly */
  readonly detailRoute: string;
  /** Lists always show summaries only — detail is never pre-loaded */
  readonly summaryOnly: true;
  /** How long the signal persists (hours). Undefined = until entity closes */
  readonly retentionHours?: number;
};

// ─── Core Signal Event ────────────────────────────────────────────────────────

export type DshSignalEvent = {
  readonly eventId: string;
  readonly kind: DshSignalEventKind;
  readonly recipientSurface: ReadonlyArray<DshSignalRecipientSurface>;
  readonly recipientRole: ReadonlyArray<DshSignalRecipientRole>;
  readonly entityType: DshSignalEntityType;
  readonly entityId: string;
  readonly priority: DshSignalPriority;
  readonly title: string;
  readonly body: string;
  /** Primary route — where this signal navigates by default */
  readonly routeId: string;
  readonly primaryAction: DshSignalAction;
  readonly secondaryAction?: DshSignalAction;
  readonly readState: 'unread' | 'read';
  readonly auditRequired: boolean;
  readonly onDemandPolicy: DshSignalOnDemandPolicy;
  /** ISO display label — NOT live UTC (scaffold) */
  readonly emittedAt: string;
};

// ─── Lean Summary (list-safe) ─────────────────────────────────────────────────

/** Use in lists — no body, no full actions. Load DshSignalEvent on explicit open. */
export type DshSignalSummary = {
  readonly eventId: string;
  readonly kind: DshSignalEventKind;
  readonly priority: DshSignalPriority;
  readonly title: string;
  readonly entityId: string;
  readonly entityType: DshSignalEntityType;
  readonly readState: 'unread' | 'read';
  readonly routeId: string;
  readonly emittedAt: string;
};

// ─── Actor Routing Registry ───────────────────────────────────────────────────

export type DshSignalActorRoute = {
  readonly kind: DshSignalEventKind;
  readonly surfaces: ReadonlyArray<DshSignalRecipientSurface>;
  readonly roles: ReadonlyArray<DshSignalRecipientRole>;
  readonly routeId: string;
  readonly priority: DshSignalPriority;
  readonly auditRequired: boolean;
  readonly retentionHours?: number;
};

export const DSH_SIGNAL_ACTOR_ROUTES: ReadonlyArray<DshSignalActorRoute> = [
  // Partner lifecycle
  { kind: 'partner_submitted',       surfaces: ['control-panel', 'app-partner'], roles: ['ops', 'partner'],             routeId: 'cp/partners/approval',              priority: 'important', auditRequired: true,  retentionHours: 48 },
  { kind: 'partner_docs_missing',    surfaces: ['control-panel', 'app-partner'], roles: ['ops', 'partner'],             routeId: 'cp/partners/approval',              priority: 'important', auditRequired: false, retentionHours: 48 },
  { kind: 'partner_approved',        surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],             routeId: 'partner/onboarding/approved',       priority: 'important', auditRequired: true,  retentionHours: 72 },
  { kind: 'partner_rejected',        surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],             routeId: 'partner/onboarding/rejected',       priority: 'urgent',    auditRequired: true,  retentionHours: 72 },
  // Catalog
  { kind: 'catalog_item_approved',   surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],             routeId: 'partner/catalog/item',              priority: 'normal',    auditRequired: false, retentionHours: 24 },
  { kind: 'catalog_item_rejected',   surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],             routeId: 'partner/catalog/item',              priority: 'important', auditRequired: true,  retentionHours: 24 },
  { kind: 'catalog_published',       surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],             routeId: 'partner/catalog/published',         priority: 'normal',    auditRequired: false, retentionHours: 24 },
  { kind: 'marketing_content_approved', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],         routeId: 'cp/marketing/media-review',         priority: 'normal',    auditRequired: true,  retentionHours: 48 },
  { kind: 'marketing_content_rejected', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],         routeId: 'cp/marketing/media-review',         priority: 'important', auditRequired: true,  retentionHours: 48 },
  { kind: 'marketing_content_needs_fix', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'],        routeId: 'cp/marketing/media-review',         priority: 'important', auditRequired: true,  retentionHours: 48 },
  // Order lifecycle
  { kind: 'order_created',           surfaces: ['app-client', 'control-panel'],                   roles: ['client', 'ops'],             routeId: 'client/orders/tracking',           priority: 'normal',    auditRequired: false, retentionHours: 48 },
  { kind: 'payment_failed',          surfaces: ['app-client', 'control-panel'],                   roles: ['client', 'ops'],             routeId: 'client/orders/payment-retry',      priority: 'urgent',    auditRequired: true,  retentionHours: 6  },
  { kind: 'partner_accepted',        surfaces: ['app-client', 'app-partner', 'control-panel'],    roles: ['client', 'partner', 'ops'],  routeId: 'client/orders/tracking',           priority: 'normal',    auditRequired: false, retentionHours: 24 },
  { kind: 'partner_rejected_order',  surfaces: ['app-partner', 'control-panel'],                  roles: ['partner', 'ops'],            routeId: 'cp/operations/dispatch-assignment', priority: 'urgent',   auditRequired: true,  retentionHours: 2  },
  { kind: 'captain_assigned',        surfaces: ['app-client', 'app-captain', 'control-panel'],    roles: ['client', 'captain', 'ops'],  routeId: 'client/orders/tracking',           priority: 'normal',    auditRequired: false, retentionHours: 24 },
  { kind: 'captain_declined',        surfaces: ['app-captain', 'control-panel'],                  roles: ['captain', 'ops'],            routeId: 'cp/operations/dispatch-assignment', priority: 'important', auditRequired: true, retentionHours: 2  },
  { kind: 'reassignment_required',   surfaces: ['control-panel'],                                 roles: ['ops'],                       routeId: 'cp/operations/dispatch-assignment', priority: 'urgent',   auditRequired: true,  retentionHours: 1  },
  { kind: 'picked_up',               surfaces: ['app-client', 'app-captain', 'control-panel'],    roles: ['client', 'captain', 'ops'],  routeId: 'client/orders/tracking',           priority: 'normal',    auditRequired: false, retentionHours: 12 },
  { kind: 'delivered',               surfaces: ['app-client', 'app-captain', 'control-panel'],    roles: ['client', 'captain', 'ops'],  routeId: 'client/orders/receipt',            priority: 'normal',    auditRequired: false, retentionHours: 24 },
  { kind: 'delivery_failed',         surfaces: ['app-client', 'app-captain', 'control-panel'],    roles: ['client', 'captain', 'ops'],  routeId: 'cp/operations/exceptions',         priority: 'urgent',    auditRequired: true,  retentionHours: 4  },
  // Support / SLA
  { kind: 'ticket_created',          surfaces: ['control-panel'],                                 roles: ['ops'],                       routeId: 'cp/support/ticket',                priority: 'normal',    auditRequired: false              },
  { kind: 'ticket_escalated',        surfaces: ['control-panel'],                                 roles: ['ops'],                       routeId: 'cp/support/escalation',            priority: 'urgent',    auditRequired: true               },
  { kind: 'sla_breach',              surfaces: ['control-panel'],                                 roles: ['ops'],                       routeId: 'cp/support/sla-dashboard',         priority: 'urgent',    auditRequired: true               },
  { kind: 'manual_call_intake_requested', surfaces: ['control-panel'],                           roles: ['ops'],                       routeId: 'cp/support/call-intake',           priority: 'important', auditRequired: true,  retentionHours: 24 },
  { kind: 'customer_360_followup',   surfaces: ['control-panel'],                                 roles: ['ops'],                       routeId: 'cp/support/customer-360',          priority: 'important', auditRequired: false, retentionHours: 24 },
  { kind: 'assisted_order_requested', surfaces: ['control-panel'],                                roles: ['ops'],                       routeId: 'cp/operations/assisted-order-desk', priority: 'important', auditRequired: true, retentionHours: 12 },
  { kind: 'order_rescue_requested',  surfaces: ['control-panel'],                                 roles: ['ops'],                       routeId: 'cp/operations/order-rescue',       priority: 'urgent',    auditRequired: true,  retentionHours: 12 },
  { kind: 'partner_capacity_degraded', surfaces: ['control-panel', 'app-partner'],               roles: ['ops', 'partner'],            routeId: 'cp/partners/control',              priority: 'important', auditRequired: true,  retentionHours: 12 },
  { kind: 'catalog_conflict_detected', surfaces: ['control-panel', 'app-partner'],               roles: ['ops', 'partner'],            routeId: 'cp/catalogs/governance',           priority: 'important', auditRequired: true,  retentionHours: 24 },
  // WLT finance — view-only signals; DSH never initiates or mutates
  { kind: 'refund_pending_wlt',      surfaces: ['app-client', 'control-panel'],                   roles: ['client', 'ops'],             routeId: 'cp/finance/refunds',               priority: 'important', auditRequired: true,  retentionHours: 72 },
  { kind: 'refund_completed_wlt',    surfaces: ['app-client', 'control-panel'],                   roles: ['client', 'ops'],             routeId: 'cp/finance/refunds',               priority: 'normal',    auditRequired: false, retentionHours: 72 },
  { kind: 'settlement_ready_wlt',    surfaces: ['control-panel'],                                 roles: ['ops'],                       routeId: 'cp/finance/settlements',           priority: 'important', auditRequired: true,  retentionHours: 48 },
];

// ─── Arabic Labels ────────────────────────────────────────────────────────────

const DSH_SIGNAL_EVENT_LABELS: Record<DshSignalEventKind, string> = {
  partner_submitted:      'طلب تسجيل شريك جديد',
  partner_docs_missing:   'وثائق الشريك ناقصة',
  partner_approved:       'تم قبول الشريك',
  partner_rejected:       'تم رفض الشريك',
  catalog_item_approved:  'تم اعتماد منتج في الكتالوج',
  catalog_item_rejected:  'تم رفض منتج في الكتالوج',
  catalog_published:      'تم نشر الكتالوج',
  marketing_content_approved: 'تم اعتماد المحتوى تسويقياً',
  marketing_content_rejected: 'تم رفض المحتوى تسويقياً',
  marketing_content_needs_fix: 'المحتوى يحتاج تعديل تسويقي',
  order_created:          'طلب جديد',
  payment_failed:         'فشل الدفع',
  partner_accepted:       'قبل الشريك الطلب',
  partner_rejected_order: 'رفض الشريك الطلب',
  captain_assigned:       'تم تعيين كابتن',
  captain_declined:       'رفض الكابتن الطلب',
  reassignment_required:  'يلزم إعادة إسناد',
  picked_up:              'تم استلام الطلب',
  delivered:              'تم تسليم الطلب',
  delivery_failed:        'فشل التسليم',
  ticket_created:         'تذكرة دعم جديدة',
  ticket_escalated:       'تصعيد تذكرة دعم',
  sla_breach:             'انتهاك SLA',
  manual_call_intake_requested: 'طلب إدخال مكالمة يدوي',
  customer_360_followup:  'متابعة Customer 360',
  assisted_order_requested: 'طلب Assisted Order',
  order_rescue_requested: 'طلب Order Rescue',
  partner_capacity_degraded: 'تراجع سعة الشريك',
  catalog_conflict_detected: 'تعارض كتالوج مكتشف',
  refund_pending_wlt:     'استرداد قيد المعالجة — WLT',
  refund_completed_wlt:   'تم الاسترداد — WLT',
  settlement_ready_wlt:   'التسوية جاهزة — WLT',
};

// ─── Tone Map ─────────────────────────────────────────────────────────────────

const DSH_SIGNAL_TONES: Record<DshSignalEventKind, 'brand' | 'success' | 'warning' | 'danger' | 'default'> = {
  partner_submitted:      'brand',
  partner_docs_missing:   'warning',
  partner_approved:       'success',
  partner_rejected:       'danger',
  catalog_item_approved:  'success',
  catalog_item_rejected:  'danger',
  catalog_published:      'success',
  marketing_content_approved: 'success',
  marketing_content_rejected: 'danger',
  marketing_content_needs_fix: 'warning',
  order_created:          'brand',
  payment_failed:         'danger',
  partner_accepted:       'success',
  partner_rejected_order: 'danger',
  captain_assigned:       'brand',
  captain_declined:       'warning',
  reassignment_required:  'danger',
  picked_up:              'brand',
  delivered:              'success',
  delivery_failed:        'danger',
  ticket_created:         'warning',
  ticket_escalated:       'danger',
  sla_breach:             'danger',
  manual_call_intake_requested: 'warning',
  customer_360_followup:  'brand',
  assisted_order_requested: 'warning',
  order_rescue_requested: 'danger',
  partner_capacity_degraded: 'warning',
  catalog_conflict_detected: 'warning',
  refund_pending_wlt:     'warning',
  refund_completed_wlt:   'success',
  settlement_ready_wlt:   'brand',
};

// ─── Signal Layer Simulated Events ─────────────────────────────────────────────
// Canonical signal seed data lives in the archived local signal source.
// Re-exported here typed for the signal layer contract.
export const DSH_SIGNAL_EVENTS: ReadonlyArray<DshSignalEvent> = [];

function resolveMarketingReviewSignalKind(item: MediaReviewRecord): DshSignalEventKind | null {
  if (item.stage === 'marketing-approved') {
    return 'marketing_content_approved';
  }

  if (item.stage === 'rejected') {
    return 'marketing_content_rejected';
  }

  if (item.stage === 'needs-fix') {
    return 'marketing_content_needs_fix';
  }

  return null;
}

function resolveMarketingSignalBody(item: MediaReviewRecord): string {
  if (item.systemNote?.trim()) {
    return item.systemNote;
  }

  if (item.stage === 'marketing-approved') {
    return 'اكتملت المراجعة التسويقية، والعنصر جاهز للتسليم إلى الكتالوج أو surface المتفق عليها.';
  }

  if (item.stage === 'needs-fix') {
    return 'المحتوى يحتاج معالجة من المصدر قبل أي ظهور جديد على العميل.';
  }

  return 'رُفض المحتوى في مرحلة التسويق ولن يظهر على العميل حتى يعاد تقديمه بشكل صحيح.';
}

function resolveMarketingSignalEmittedAt(item: MediaReviewRecord): string {
  const lastAuditAt = item.auditTrail?.[item.auditTrail.length - 1]?.at ?? item.submittedAt;
  const deltaMs = Math.max(0, Date.now() - new Date(lastAuditAt).getTime());
  const deltaHours = Math.floor(deltaMs / 3600_000);

  if (deltaHours <= 0) {
    return 'منذ قليل';
  }

  if (deltaHours < 24) {
    return `منذ ${deltaHours} ساعة`;
  }

  return `منذ ${Math.floor(deltaHours / 24)} يوم`;
}

function getAllSignalEvents(): ReadonlyArray<DshSignalEvent> {
  const marketingReviewSignals = getMediaReviewItems()
    .map((item) => {
      const kind = resolveMarketingReviewSignalKind(item);
      if (!kind) {
        return null;
      }

      return {
        eventId: `marketing-${item.stage}-${item.id}`,
        kind,
        recipientSurface: ['app-partner', 'control-panel'],
        recipientRole: ['partner', 'ops'],
        entityType: 'marketing',
        entityId: item.id,
        priority: kind === 'marketing_content_approved' ? 'normal' : 'important',
        title: `${getDshSignalEventLabel(kind)} — ${item.title}`,
        body: resolveMarketingSignalBody(item),
        routeId: 'cp/marketing/media-review',
        primaryAction: { actionId: 'open-review', label: 'فتح المراجعة', routeId: `cp/marketing/media-review?itemId=${item.id}` },
        secondaryAction: { actionId: 'open-details', label: 'عرض القرار', routeId: `cp/marketing/media-review?itemId=${item.id}&tab=details` },
        readState: 'unread',
        auditRequired: true,
        onDemandPolicy: { detailRoute: `cp/marketing/media-review?itemId=${item.id}`, summaryOnly: true, retentionHours: 48 },
        emittedAt: resolveMarketingSignalEmittedAt(item),
      } as const;
    })
    .filter((event): event is NonNullable<typeof event> => event !== null) as DshSignalEvent[];

  return [...DSH_SIGNAL_EVENTS, ...marketingReviewSignals];
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/** Get Arabic label for a signal event kind */
export function getDshSignalEventLabel(kind: DshSignalEventKind): string {
  return DSH_SIGNAL_EVENT_LABELS[kind];
}

/** Get display tone for a signal event kind */
export function getDshSignalEventTone(kind: DshSignalEventKind): 'brand' | 'success' | 'warning' | 'danger' | 'default' {
  return DSH_SIGNAL_TONES[kind];
}

/** Get actor routing config for a signal kind */
export function getDshSignalActorRoute(kind: DshSignalEventKind): DshSignalActorRoute | undefined {
  return DSH_SIGNAL_ACTOR_ROUTES.find((r) => r.kind === kind);
}

/** Get route for a signal kind on a specific surface */
function getDshSignalRouteForSurface(
  kind: DshSignalEventKind,
  _surface: DshSignalRecipientSurface,
): string {
  return getDshSignalActorRoute(kind)?.routeId ?? 'cp/operations';
}

/**
 * Get lean signal summaries for a surface+role — for list display only.
 * Load DshSignalEvent detail on explicit user action via onDemandPolicy.detailRoute.
 * Max 10 results to prevent unbounded list inflation.
 */
export function getDshSignalSummaries(
  surface: DshSignalRecipientSurface,
  role: DshSignalRecipientRole,
): DshSignalSummary[] {
  return getAllSignalEvents()
    .filter((e) => e.recipientSurface.includes(surface) && e.recipientRole.includes(role))
    .slice(0, 10)
    .map((e) => ({
      eventId: e.eventId,
      kind: e.kind,
      priority: e.priority,
      title: e.title,
      entityId: e.entityId,
      entityType: e.entityType,
      readState: e.readState,
      routeId: e.routeId,
      emittedAt: e.emittedAt,
    }));
}

/** Get full signal event detail — call only on explicit user open */
function getDshSignalDetail(eventId: string): DshSignalEvent | undefined {
  return getAllSignalEvents().find((e) => e.eventId === eventId);
}

/** Count unread signals for a surface+role */
function getDshSignalUnreadCount(
  surface: DshSignalRecipientSurface,
  role: DshSignalRecipientRole,
): number {
  return getDshSignalSummaries(surface, role).filter((s) => s.readState === 'unread').length;
}

/** Check if a signal kind requires audit logging */
function isDshSignalAuditRequired(kind: DshSignalEventKind): boolean {
  return getDshSignalActorRoute(kind)?.auditRequired ?? false;
}
