// ---------------------------------------------------------------------------
// DSH Shared Flow Registry
//
// Single canonical source of truth for every DSH flow's:
//   ownerSurface · visibleSurfaces · visibility · onDemandPolicy
//   escalationOwner · financialImpact · hiddenCompat · allowedActions · forbiddenActions
//
// Rules:
//  - Pure types + data only. No React, no side-effects, no backend, no mutation.
//  - Import from '@bthwani/ui-kit' is FORBIDDEN here; this file has zero UI deps.
//  - finance-snapshot flows: financialImpact=true, onDemandPolicy='finance-snapshot-only', NO mutation.
//  - hidden-compat flows: hiddenCompat=true, visibility='hidden-compat' — must NOT be rendered primary.
//
// Cross-surface ownership contract:
//  - app-client  : sees order/support only inside its own order context, never partner internals.
//  - app-partner : owns order lifecycle, inventory, partner-ops. No client/captain internals.
//  - app-captain : owns handoff/delivery flows. No partner internal issues beyond handoff.
//  - app-field   : owns onboarding, visit, readiness. No financial policies or decisions.
//  - control-panel: escalationOwner for all policy/SLA/support flows. No duplicate mobile screens.
//  - wlt-finance : reference-only for any financial snapshot. No DSH-initiated mutation.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registry — Partner Operational Flows
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registry — Finance Snapshot Flows (WLT bridge, hidden-compat on partner)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registry — Client Flows (summary-level; full registry in Phase 2+)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registry — Captain Flows (summary-level; full registry in Phase 2+)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registry — Field Flows (summary-level; full registry in Phase 2+)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Registry — Control-Panel Flows (summary-level ownership anchors)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Master registry — combine all domains
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Utility functions — no side effects
// ---------------------------------------------------------------------------

/**
 * Translates a DshOnDemandPolicy value to a human-readable Arabic label.
 * Centralizes the label map that was previously duplicated in
 * SupportEscalationQueueScreen, SupportDashboardScreen, DshFieldReadinessEscalationScreen,
 * DshFieldStoreOnboardingScreen, and similar screens.
 */
export function resolveDshOnDemandPolicyLabel(policy?: string): string {
  if (policy === 'detail-on-open') return 'تفاصيل عند الفتح';
  if (policy === 'evidence-on-open') return 'أدلة عند الفتح';
  if (policy === 'chat-on-open') return 'محادثة عند الفتح';
  if (policy === 'finance-snapshot-only') return 'مالي للقراءة فقط';
  if (policy === 'summary-only') return 'ملخص أولًا';
  return policy ?? 'سياسة من السجل';
}
