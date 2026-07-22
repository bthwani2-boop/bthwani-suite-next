import type {
  DshPartnerOperationalFlowId,
  DshPartnerSupportCommandFilterId,
  DshPartnerSupportIssueCategoryId,
  DshPartnerSupportRouteId,
} from '../partner/partner.types';

export function resolveSupportFilterFromOperationalFlow(
  flowId: DshPartnerOperationalFlowId,
): DshPartnerSupportCommandFilterId {
  if (flowId === 'order-alerts' || flowId === 'order-sla-risk') return 'active-orders';
  if (
    flowId === 'order-chat-read-ack' ||
    flowId === 'order-chat-send' ||
    flowId === 'order-quick-reply-config' ||
    flowId === 'order-quick-reply-settings' ||
    flowId === 'order-quick-reply-setup'
  ) {
    return 'conversations';
  }
  if (
    flowId === 'inventory-adjust' ||
    flowId === 'inventory-update' ||
    flowId === 'items-upsert'
  ) {
    return 'inventory-branch';
  }
  if (
    flowId === 'partner-finance-bridge' ||
    flowId === 'partner-settlement-summary' ||
    flowId === 'partner-commission-summary'
  ) {
    return 'escalation';
  }
  if (flowId === 'order-issue-queue' || flowId === 'order-issue-required' || flowId === 'order-reject') {
    return 'order-issues';
  }
  return 'active-orders';
}

export function resolveSupportFilterFromRoute(
  routeId: DshPartnerSupportRouteId,
): DshPartnerSupportCommandFilterId {
  if (
    routeId === 'chat-read-ack' ||
    routeId === 'chat-send' ||
    routeId === 'quick-reply-config' ||
    routeId === 'quick-reply-settings' ||
    routeId === 'quick-reply-setup'
  ) {
    return 'conversations';
  }
  if (
    routeId === 'inventory-adjust' ||
    routeId === 'inventory-update' ||
    routeId === 'items-upsert'
  ) {
    return 'inventory-branch';
  }
  if (routeId === 'order-issue-queue' || routeId === 'order-reject') return 'order-issues';
  return 'active-orders';
}

export function resolveIssueCategoryFromOperationalFlow(
  flowId: DshPartnerOperationalFlowId,
): DshPartnerSupportIssueCategoryId | null {
  if (flowId === 'order-sla-risk') return 'delayed-preparation';
  if (flowId === 'order-reject') return 'partner-reject-request';
  if (flowId === 'order-handoff') return 'handoff-mismatch';
  if (flowId === 'order-chat-read-ack' || flowId === 'order-chat-send') return 'customer-not-responding';
  if (flowId === 'inventory-adjust' || flowId === 'inventory-update' || flowId === 'items-upsert') return 'item-unavailable';
  if (
    flowId === 'partner-finance-bridge' ||
    flowId === 'partner-settlement-summary' ||
    flowId === 'partner-commission-summary'
  ) {
    return 'payment-refund-review';
  }
  return null;
}

export function resolveIssueCategoryFromRoute(
  routeId: DshPartnerSupportRouteId,
): DshPartnerSupportIssueCategoryId | null {
  if (routeId === 'order-reject') return 'partner-reject-request';
  if (routeId === 'order-handoff') return 'handoff-mismatch';
  if (
    routeId === 'chat-read-ack' ||
    routeId === 'chat-send' ||
    routeId === 'quick-reply-config' ||
    routeId === 'quick-reply-settings' ||
    routeId === 'quick-reply-setup'
  ) {
    return 'customer-not-responding';
  }
  if (routeId === 'inventory-adjust' || routeId === 'inventory-update' || routeId === 'items-upsert') {
    return 'item-unavailable';
  }
  return null;
}

export function isCommandCenterInlineManagedRoute(routeId: DshPartnerSupportRouteId): boolean {
  return routeId === 'order-issue-queue' || routeId === 'order-reject';
}
