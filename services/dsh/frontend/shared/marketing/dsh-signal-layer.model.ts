/**
 * DSH signal actor-routing contract.
 *
 * This module owns routing metadata only. Runtime signal retrieval and event
 * persistence are not fabricated here; actor surfaces consume backend-owned
 * projections through their respective capabilities.
 */

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

export type DshSignalPriority = 'normal' | 'important' | 'urgent';

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
  { kind: 'partner_submitted', surfaces: ['control-panel', 'app-partner'], roles: ['ops', 'partner'], routeId: 'cp/partners/approval', priority: 'important', auditRequired: true, retentionHours: 48 },
  { kind: 'partner_docs_missing', surfaces: ['control-panel', 'app-partner'], roles: ['ops', 'partner'], routeId: 'cp/partners/approval', priority: 'important', auditRequired: false, retentionHours: 48 },
  { kind: 'partner_approved', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'partner/onboarding/approved', priority: 'important', auditRequired: true, retentionHours: 72 },
  { kind: 'partner_rejected', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'partner/onboarding/rejected', priority: 'urgent', auditRequired: true, retentionHours: 72 },
  // Catalog and marketing review
  { kind: 'catalog_item_approved', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'partner/catalog/item', priority: 'normal', auditRequired: false, retentionHours: 24 },
  { kind: 'catalog_item_rejected', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'partner/catalog/item', priority: 'important', auditRequired: true, retentionHours: 24 },
  { kind: 'catalog_published', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'partner/catalog/published', priority: 'normal', auditRequired: false, retentionHours: 24 },
  { kind: 'marketing_content_approved', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'cp/marketing/media-review', priority: 'normal', auditRequired: true, retentionHours: 48 },
  { kind: 'marketing_content_rejected', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'cp/marketing/media-review', priority: 'important', auditRequired: true, retentionHours: 48 },
  { kind: 'marketing_content_needs_fix', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'cp/marketing/media-review', priority: 'important', auditRequired: true, retentionHours: 48 },
  // Order lifecycle
  { kind: 'order_created', surfaces: ['app-client', 'control-panel'], roles: ['client', 'ops'], routeId: 'client/orders/tracking', priority: 'normal', auditRequired: false, retentionHours: 48 },
  { kind: 'payment_failed', surfaces: ['app-client', 'control-panel'], roles: ['client', 'ops'], routeId: 'client/orders/payment-retry', priority: 'urgent', auditRequired: true, retentionHours: 6 },
  { kind: 'partner_accepted', surfaces: ['app-client', 'app-partner', 'control-panel'], roles: ['client', 'partner', 'ops'], routeId: 'client/orders/tracking', priority: 'normal', auditRequired: false, retentionHours: 24 },
  { kind: 'partner_rejected_order', surfaces: ['app-partner', 'control-panel'], roles: ['partner', 'ops'], routeId: 'cp/operations/dispatch-assignment', priority: 'urgent', auditRequired: true, retentionHours: 2 },
  { kind: 'captain_assigned', surfaces: ['app-client', 'app-captain', 'control-panel'], roles: ['client', 'captain', 'ops'], routeId: 'client/orders/tracking', priority: 'normal', auditRequired: false, retentionHours: 24 },
  { kind: 'captain_declined', surfaces: ['app-captain', 'control-panel'], roles: ['captain', 'ops'], routeId: 'cp/operations/dispatch-assignment', priority: 'important', auditRequired: true, retentionHours: 2 },
  { kind: 'reassignment_required', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/operations/dispatch-assignment', priority: 'urgent', auditRequired: true, retentionHours: 1 },
  { kind: 'picked_up', surfaces: ['app-client', 'app-captain', 'control-panel'], roles: ['client', 'captain', 'ops'], routeId: 'client/orders/tracking', priority: 'normal', auditRequired: false, retentionHours: 12 },
  { kind: 'delivered', surfaces: ['app-client', 'app-captain', 'control-panel'], roles: ['client', 'captain', 'ops'], routeId: 'client/orders/receipt', priority: 'normal', auditRequired: false, retentionHours: 24 },
  { kind: 'delivery_failed', surfaces: ['app-client', 'app-captain', 'control-panel'], roles: ['client', 'captain', 'ops'], routeId: 'cp/operations/exceptions', priority: 'urgent', auditRequired: true, retentionHours: 4 },
  // Support / SLA
  { kind: 'ticket_created', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/support/ticket', priority: 'normal', auditRequired: false },
  { kind: 'ticket_escalated', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/support/escalation', priority: 'urgent', auditRequired: true },
  { kind: 'sla_breach', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/support/sla-dashboard', priority: 'urgent', auditRequired: true },
  { kind: 'manual_call_intake_requested', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/support/call-intake', priority: 'important', auditRequired: true, retentionHours: 24 },
  { kind: 'customer_360_followup', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/support/customer-360', priority: 'important', auditRequired: false, retentionHours: 24 },
  { kind: 'assisted_order_requested', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/operations/assisted-order-desk', priority: 'important', auditRequired: true, retentionHours: 12 },
  { kind: 'order_rescue_requested', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/operations/order-rescue', priority: 'urgent', auditRequired: true, retentionHours: 12 },
  { kind: 'partner_capacity_degraded', surfaces: ['control-panel', 'app-partner'], roles: ['ops', 'partner'], routeId: 'cp/partners/control', priority: 'important', auditRequired: true, retentionHours: 12 },
  { kind: 'catalog_conflict_detected', surfaces: ['control-panel', 'app-partner'], roles: ['ops', 'partner'], routeId: 'cp/catalogs/governance', priority: 'important', auditRequired: true, retentionHours: 24 },
  // WLT finance — view-only signals; DSH never initiates or mutates
  { kind: 'refund_pending_wlt', surfaces: ['app-client', 'control-panel'], roles: ['client', 'ops'], routeId: 'cp/finance/refunds', priority: 'important', auditRequired: true, retentionHours: 72 },
  { kind: 'refund_completed_wlt', surfaces: ['app-client', 'control-panel'], roles: ['client', 'ops'], routeId: 'cp/finance/refunds', priority: 'normal', auditRequired: false, retentionHours: 72 },
  { kind: 'settlement_ready_wlt', surfaces: ['control-panel'], roles: ['ops'], routeId: 'cp/finance/settlements', priority: 'important', auditRequired: true, retentionHours: 48 },
];

export function getDshSignalActorRoute(kind: DshSignalEventKind): DshSignalActorRoute | undefined {
  return DSH_SIGNAL_ACTOR_ROUTES.find((route) => route.kind === kind);
}
