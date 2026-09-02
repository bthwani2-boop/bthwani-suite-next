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

