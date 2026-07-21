import { resolveDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import { createDshHttpClient } from '../_kernel/dsh-http-request';
import type { DshDispatchAssignment } from './dispatch.types';

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), 'dispatch-location');

export type ForegroundDispatchLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly recordedAt?: string;
};

/**
 * Updates only the latest location for the authenticated captain's active
 * assignment. The backend keeps no route history and purges the sample when
 * the assignment closes. Callers must invoke this from foreground-only logic.
 */
export async function updateForegroundDispatchLocation(
  assignmentId: string,
  sample: ForegroundDispatchLocation,
): Promise<DshDispatchAssignment> {
  if (!assignmentId.trim()) throw { kind: 'invalid_request', message: 'assignmentId is required' };
  if (!Number.isFinite(sample.latitude) || sample.latitude < -90 || sample.latitude > 90) {
    throw { kind: 'invalid_request', message: 'latitude is invalid' };
  }
  if (!Number.isFinite(sample.longitude) || sample.longitude < -180 || sample.longitude > 180) {
    throw { kind: 'invalid_request', message: 'longitude is invalid' };
  }
  const data = await request<{ assignment: DshDispatchAssignment }>(
    `/dsh/captain/dispatch/assignments/${encodeURIComponent(assignmentId)}/location`,
    {
      method: 'POST',
      body: {
        latitude: sample.latitude,
        longitude: sample.longitude,
        ...(sample.recordedAt ? { recordedAt: sample.recordedAt } : {}),
      },
    },
  );
  return data.assignment;
}
