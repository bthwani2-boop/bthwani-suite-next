import { resolveDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import { createDshHttpClient } from '../_kernel/dsh-http-request';
import type { DshDeliveryStatus, DshDispatchAssignment } from './dispatch.types';

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), 'dispatch-tracking');

export type DshTrackingFreshnessState = 'fresh' | 'stale' | 'lost';
export type DshTrackingRouteState =
  | 'not_applicable'
  | 'awaiting_location'
  | 'location_lost'
  | 'destination_unavailable'
  | 'provider_unavailable'
  | 'ready'
  | 'arrived';
export type DshTrackingLocationVisibility =
  | 'hidden_until_pickup'
  | 'delivery_window_rounded';

export type DshLiveTrackingLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly recordedAt: string;
  readonly freshnessState: DshTrackingFreshnessState;
  readonly ageSeconds: number;
};

export type DshLiveTrackingEta = {
  readonly providerCode: string;
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  readonly estimatedArrivalAt: string;
  readonly computedAt: string;
};

export type DshLiveTrackingProjection = {
  /** Client adapter-owned request context; the backend tracking projection does not duplicate order truth. */
  readonly orderId?: string;
  readonly locationVisibility: DshTrackingLocationVisibility;
  readonly location: DshLiveTrackingLocation | null;
  readonly eta: DshLiveTrackingEta | null;
  readonly routeState: DshTrackingRouteState;
};

export type DshClientLiveTrackingResponse = {
  readonly assignment: DshDispatchAssignment;
  readonly tracking: DshLiveTrackingProjection;
};

/**
 * JRN-017 standalone contract projection. This intentionally does not reuse
 * the older generated DshPartnerDispatchReference because the live-tracking
 * contract returns a nested read-only delivery state and never returns captain
 * coordinates or a partner mutation capability.
 */
export type DshPartnerLiveTrackingReference = {
  readonly id: string;
  readonly orderId: string;
  readonly status: DshDispatchAssignment['status'];
  readonly responseDeadlineAt?: string | null;
  readonly acceptedAt?: string | null;
  readonly completedAt?: string | null;
  readonly delivery: {
    readonly status: DshDeliveryStatus;
    readonly podReference?: string;
    readonly note?: string;
    readonly updatedAt?: string;
  };
  readonly updatedAt: string;
};

export type DshPartnerDispatchTrackingResponse = {
  readonly assignment: DshPartnerLiveTrackingReference;
  readonly tracking: DshLiveTrackingProjection;
};

export type DshDispatchTrackingAlert = {
  readonly assignmentId: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly severity: 'warning' | 'critical';
  readonly code: 'LOCATION_NOT_RECEIVED' | 'LOCATION_stale' | 'LOCATION_lost';
  readonly message: string;
  readonly ageSeconds?: number;
};

export async function fetchClientLiveTracking(orderId: string): Promise<DshClientLiveTrackingResponse> {
  const response = await request<DshClientLiveTrackingResponse>(
    `/dsh/client/orders/${encodeURIComponent(orderId)}/tracking`,
  );
  return {
    ...response,
    tracking: {
      ...response.tracking,
      orderId,
    },
  };
}

export async function fetchPartnerDispatchTrackingReference(
  orderId: string,
): Promise<DshPartnerDispatchTrackingResponse> {
  return request<DshPartnerDispatchTrackingResponse>(
    `/dsh/partner/orders/${encodeURIComponent(orderId)}/dispatch-tracking`,
  );
}

export async function fetchOperatorDispatchTrackingAlerts(): Promise<readonly DshDispatchTrackingAlert[]> {
  const data = await request<{ readonly alerts: readonly DshDispatchTrackingAlert[] }>(
    '/dsh/operator/dispatch/tracking-alerts',
  );
  return data.alerts ?? [];
}
