import { ASSIGNMENT_STATUS_LABELS, DELIVERY_STATUS_LABELS } from '../dispatch/dispatch.types';
import type { DshDispatchAssignment } from '../dispatch/dispatch.types';

export type CaptainInboxServiceType = 'standard' | 'awnak' | 'shein-final-mile';

export type CaptainInboxBellItem = {
  readonly id: string;
  readonly orderId: string;
  readonly kind: 'incoming-offer' | 'active';
  readonly serviceType: CaptainInboxServiceType;
  readonly fulfillmentMode: 'bthwani_delivery';
  readonly title: string;
  readonly subtitle: string;
  readonly meta: string;
};

const ACTIVE_ASSIGNMENT_STATUSES = new Set(['offered', 'accepted']);
const ACTIVE_DELIVERY_STATUSES = new Set([
  'assigned',
  'driver_assigned',
  'driver_arrived_store',
  'picked_up',
  'arrived_customer',
]);

export function resolveServiceType(assignment: DshDispatchAssignment): CaptainInboxServiceType {
  if (!assignment.specialRequestId) return 'standard';
  if (assignment.requestType === 'AWNAK_ERRAND') return 'awnak';
  if (assignment.requestType === 'SHEIN_ASSISTED_PURCHASE') return 'shein-final-mile';
  return 'standard';
}

function resolveBellTitle(assignment: DshDispatchAssignment, serviceType: CaptainInboxServiceType): string {
  if (serviceType === 'awnak') return `عونك #${assignment.specialRequestId}`;
  if (serviceType === 'shein-final-mile') return `SHEIN #${assignment.specialRequestId}`;
  return `طلب #${assignment.orderId}`;
}

export function isCaptainAssignmentActionable(assignment: DshDispatchAssignment): boolean {
  return ACTIVE_ASSIGNMENT_STATUSES.has(assignment.status)
    && ACTIVE_DELIVERY_STATUSES.has(assignment.delivery.status);
}

export function toBellItem(assignment: DshDispatchAssignment): CaptainInboxBellItem {
  const serviceType = resolveServiceType(assignment);
  return {
    id: assignment.id,
    orderId: assignment.orderId,
    kind: assignment.status === 'offered' ? 'incoming-offer' : 'active',
    serviceType,
    fulfillmentMode: 'bthwani_delivery',
    title: resolveBellTitle(assignment, serviceType),
    subtitle: DELIVERY_STATUS_LABELS[assignment.delivery.status] ?? assignment.delivery.status,
    meta: ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status,
  };
}
