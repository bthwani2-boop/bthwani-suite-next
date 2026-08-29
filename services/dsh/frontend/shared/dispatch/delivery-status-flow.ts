import type { DshDeliveryStatus } from './dispatch.types';

export function nextDeliveryStatus(current: DshDeliveryStatus): DshDeliveryStatus | null {
  if (current === 'driver_assigned') return 'driver_arrived_store';
  if (current === 'driver_arrived_store') return 'picked_up';
  if (current === 'picked_up') return 'arrived_customer';
  return null;
}
