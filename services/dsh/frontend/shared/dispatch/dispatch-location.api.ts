import { resolveDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import { createDshHttpClient } from '../_kernel/dsh-http-request';
import { bthwaniDurableStorage } from '@bthwani/data-runtime/storage-adapter';
import { resolveMutationIdentityScope } from '@bthwani/data-runtime/mutation-identity-scope';
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

type LocationScope = {
  readonly actorId: string;
  readonly installationId: string;
};

const PENDING_LOCATION_PREFIX = '@bthwani/captain-foreground-location:v1';

// Delivery transport state only. This is not operational truth: DSH remains the
// sole owner of the accepted location, timestamp, and delivery lifecycle. The
// outbox is durable so a process restart cannot silently lose the latest sample.
function encode(value: string): string {
  return encodeURIComponent(value.trim());
}

async function resolveLocationScope(actorId: string, assignmentId: string): Promise<LocationScope> {
  const normalizedActorId = actorId.trim();
  const normalizedAssignmentId = assignmentId.trim();
  if (!normalizedActorId || !normalizedAssignmentId) {
    throw { kind: 'invalid_request', message: 'captain and assignment identity are required' };
  }
  const identity = await resolveMutationIdentityScope(normalizedActorId, {
    entityId: `location:${normalizedAssignmentId}`,
  });
  return { actorId: identity.actorId, installationId: identity.installationId };
}

function pendingLocationPrefix(scope: LocationScope): string {
  return `${PENDING_LOCATION_PREFIX}/${encode(scope.actorId)}/${encode(scope.installationId)}/`;
}

function pendingLocationKey(scope: LocationScope, assignmentId: string): string {
  return `${pendingLocationPrefix(scope)}${encode(assignmentId)}`;
}

function sameSample(left: ForegroundDispatchLocation, right: ForegroundDispatchLocation): boolean {
  return left.latitude === right.latitude
    && left.longitude === right.longitude
    && left.accuracyMeters === right.accuracyMeters
    && left.recordedAt === right.recordedAt;
}

function parsePendingLocation(value: unknown, expectedAssignmentId: string): PendingLocation {
  if (!value || typeof value !== 'object') {
    throw new Error('durable foreground location outbox entry is invalid');
  }
  const parsed = value as Partial<PendingLocation>;
  if (parsed.assignmentId !== expectedAssignmentId || !parsed.sample || typeof parsed.sample !== 'object') {
    throw new Error('durable foreground location outbox identity is invalid');
  }
  const sample = parsed.sample as Partial<ForegroundDispatchLocation>;
  if (typeof sample.latitude !== 'number'
    || typeof sample.longitude !== 'number'
    || typeof sample.accuracyMeters !== 'number'
    || typeof sample.recordedAt !== 'string') {
    throw new Error('durable foreground location outbox sample is invalid');
  }
  const normalized = {
    latitude: sample.latitude,
    longitude: sample.longitude,
    accuracyMeters: sample.accuracyMeters,
    recordedAt: sample.recordedAt,
  };
  validateSample(expectedAssignmentId, normalized);
  return { assignmentId: expectedAssignmentId, sample: normalized };
}

async function readPendingLocation(scope: LocationScope, assignmentId: string): Promise<PendingLocation | null> {
  const raw = await bthwaniDurableStorage.getItem(pendingLocationKey(scope, assignmentId));
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new Error('durable foreground location outbox entry is corrupt', { cause });
  }
  return parsePendingLocation(parsed, assignmentId);
}

async function writePendingLocation(scope: LocationScope, pending: PendingLocation): Promise<void> {
  const current = await readPendingLocation(scope, pending.assignmentId);
  if (current && Date.parse(current.sample.recordedAt) > Date.parse(pending.sample.recordedAt)) return;
  await bthwaniDurableStorage.setItem(
    pendingLocationKey(scope, pending.assignmentId),
    JSON.stringify(pending),
  );
}

async function clearPendingLocationIfExact(
  scope: LocationScope,
  assignmentId: string,
  sample: ForegroundDispatchLocation,
): Promise<void> {
  const current = await readPendingLocation(scope, assignmentId);
  if (current && sameSample(current.sample, sample)) {
    await bthwaniDurableStorage.removeItem(pendingLocationKey(scope, assignmentId));
  }
}

async function listPendingLocations(scope: LocationScope): Promise<readonly PendingLocation[]> {
  const prefix = pendingLocationPrefix(scope);
  const keys = (await bthwaniDurableStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  const pending: PendingLocation[] = [];
  for (const key of keys) {
    const assignmentId = decodeURIComponent(key.slice(prefix.length));
    const item = await readPendingLocation(scope, assignmentId);
    if (item) pending.push(item);
  }
  return pending;
}

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
  actorId: string,
  assignmentId: string,
  sample: ForegroundDispatchLocation,
): Promise<DshDispatchAssignment> {
  validateSample(assignmentId, sample);
  const scope = await resolveLocationScope(actorId, assignmentId);
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
  await clearPendingLocationIfExact(scope, assignmentId, sample);
  return data.assignment;
}

export async function syncForegroundDispatchLocation(
  actorId: string,
  assignmentId: string,
  sample: ForegroundDispatchLocation,
): Promise<DshDispatchLocationSyncResult> {
  validateSample(assignmentId, sample);
  const scope = await resolveLocationScope(actorId, assignmentId);
  try {
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
    await clearPendingLocationIfExact(scope, assignmentId, sample);
    const assignment = data.assignment;
    return { kind: 'sent', assignment };
  } catch (error) {
    if (!isRetryableLocationError(error)) throw error;
    await writePendingLocation(scope, { assignmentId, sample });
    return { kind: 'queued', sample };
  }
}

export async function flushPendingForegroundDispatchLocations(actorId: string): Promise<{
  readonly sent: number;
  readonly remaining: number;
  readonly discarded: number;
}>;
export async function flushPendingForegroundDispatchLocations(actorId = ''): Promise<{
  readonly sent: number;
  readonly remaining: number;
  readonly discarded: number;
}> {
  const normalizedActorId = actorId.trim();
  if (!normalizedActorId) throw { kind: 'invalid_request', message: 'captain identity is required' };
  const scope = await resolveLocationScope(normalizedActorId, 'outbox');
  const pendingLocations = await listPendingLocations(scope);
  let sent = 0;
  let discarded = 0;
  const now = Date.now();
  for (const pending of pendingLocations) {
    if (now - Date.parse(pending.sample.recordedAt) > MAX_PENDING_LOCATION_AGE_MS) {
      await clearPendingLocationIfExact(scope, pending.assignmentId, pending.sample);
      discarded += 1;
      continue;
    }
    try {
      const data = await request<{ assignment: DshDispatchAssignment }>(
        `/dsh/captain/dispatch/assignments/${encodeURIComponent(pending.assignmentId)}/location`,
        {
          method: 'POST',
          body: {
            latitude: pending.sample.latitude,
            longitude: pending.sample.longitude,
            accuracyMeters: pending.sample.accuracyMeters,
            recordedAt: pending.sample.recordedAt,
          },
        },
      );
      await clearPendingLocationIfExact(scope, pending.assignmentId, pending.sample);
      void data;
      sent += 1;
    } catch (error) {
      if (!isRetryableLocationError(error)) {
        await clearPendingLocationIfExact(scope, pending.assignmentId, pending.sample);
        discarded += 1;
      }
    }
  }
  return {
    sent,
    remaining: (await listPendingLocations(scope)).length,
    discarded,
  };
}

export async function hasPendingForegroundDispatchLocation(
  actorId: string,
  assignmentId: string,
): Promise<boolean> {
  const scope = await resolveLocationScope(actorId, assignmentId);
  return (await readPendingLocation(scope, assignmentId)) !== null;
}
