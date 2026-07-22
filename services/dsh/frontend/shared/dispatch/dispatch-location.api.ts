import { resolveDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import { createDshHttpClient } from '../_kernel/dsh-http-request';
import type { DshDispatchAssignment } from './dispatch.types';

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), 'dispatch-location');
const MAX_PENDING_LOCATION_AGE_MS = 9 * 60 * 1000;

export type ForegroundDispatchLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
  readonly recordedAt: string;
};

export type DshDispatchLocationSyncResult =
  | { readonly kind: 'sent'; readonly assignment: DshDispatchAssignment }
  | { readonly kind: 'queued'; readonly sample: ForegroundDispatchLocation };

type PendingLocation = {
  readonly assignmentId: string;
  readonly sample: ForegroundDispatchLocation;
};

// Delivery transport state only. This is not operational truth: DSH remains the
// sole owner of the accepted location, timestamp, and delivery lifecycle.
const pendingLocationByAssignment = new Map<string, PendingLocation>();

function validateSample(assignmentId: string, sample: ForegroundDispatchLocation): void {
  if (!assignmentId.trim()) throw { kind: 'invalid_request', message: 'assignmentId is required' };
  if (!Number.isFinite(sample.latitude) || sample.latitude < -90 || sample.latitude > 90) {
    throw { kind: 'invalid_request', message: 'latitude is invalid' };
  }
  if (!Number.isFinite(sample.longitude) || sample.longitude < -180 || sample.longitude > 180) {
    throw { kind: 'invalid_request', message: 'longitude is invalid' };
  }
  if (!Number.isFinite(sample.accuracyMeters) || sample.accuracyMeters <= 0 || sample.accuracyMeters > 100) {
    throw { kind: 'invalid_request', message: 'accuracyMeters must be between 0 and 100' };
  }
  if (!sample.recordedAt || Number.isNaN(Date.parse(sample.recordedAt))) {
    throw { kind: 'invalid_request', message: 'recordedAt must be an RFC3339 timestamp' };
  }
}

function isRetryableLocationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { readonly kind?: unknown; readonly status?: unknown };
  if (value.kind === 'network') return true;
  return typeof value.status === 'number' && (value.status === 408 || value.status === 429 || value.status >= 500);
}

/**
 * Updates only the latest location for the authenticated captain's active
 * assignment. The backend keeps no route history and purges the sample when
 * the assignment closes. Callers must invoke this from foreground-only logic.
 */
export async function updateForegroundDispatchLocation(
  assignmentId: string,
  sample: ForegroundDispatchLocation,
): Promise<DshDispatchAssignment> {
  validateSample(assignmentId, sample);
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/location`,
    {
      method: 'POST',
      body: {
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracyMeters: sample.accuracyMeters,
        recordedAt: sample.recordedAt,
      },
    },
  );
  pendingLocationByAssignment.delete(assignmentId);
  return data.assignment;
}

export async function syncForegroundDispatchLocation(
  assignmentId: string,
  sample: ForegroundDispatchLocation,
): Promise<DshDispatchLocationSyncResult> {
  try {
    const assignment = await updateForegroundDispatchLocation(assignmentId, sample);
    return { kind: 'sent', assignment };
  } catch (error) {
    if (!isRetryableLocationError(error)) throw error;
    pendingLocationByAssignment.set(assignmentId, { assignmentId, sample });
    return { kind: 'queued', sample };
  }
}

export async function flushPendingForegroundDispatchLocations(): Promise<{
  readonly sent: number;
  readonly remaining: number;
  readonly discarded: number;
}> {
  let sent = 0;
  let discarded = 0;
  const now = Date.now();
  for (const pending of Array.from(pendingLocationByAssignment.values())) {
    if (now - Date.parse(pending.sample.recordedAt) > MAX_PENDING_LOCATION_AGE_MS) {
      pendingLocationByAssignment.delete(pending.assignmentId);
      discarded += 1;
      continue;
    }
    try {
      await updateForegroundDispatchLocation(pending.assignmentId, pending.sample);
      sent += 1;
    } catch (error) {
      if (!isRetryableLocationError(error)) {
        pendingLocationByAssignment.delete(pending.assignmentId);
        discarded += 1;
      }
    }
  }
  return { sent, remaining: pendingLocationByAssignment.size, discarded };
}

export function hasPendingForegroundDispatchLocation(assignmentId: string): boolean {
  return pendingLocationByAssignment.has(assignmentId);
}
