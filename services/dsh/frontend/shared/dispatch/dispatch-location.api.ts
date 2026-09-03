import { resolveDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import { createDshHttpClient, DshRequestError } from '../_kernel/dsh-http-request';
import { bthwaniSensitiveStorage } from '@bthwani/data-runtime/sensitive-storage-adapter';
import { resolveMutationIdentityScope } from '@bthwani/data-runtime/mutation-identity-scope';
import type { DshDispatchAssignment } from './dispatch.types';

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), 'dispatch-location');
const MAX_PENDING_LOCATION_AGE_MS = 9 * 60 * 1000;
const SENSITIVE_LOCATION_OUTBOX_KEY = 'bthwani.captain.foreground-location.v2';

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

type StoredPendingLocation = PendingLocation & {
  readonly scopeKey: string;
};

type SensitiveLocationOutbox = {
  readonly schemaVersion: 2;
  readonly pending: readonly StoredPendingLocation[];
};

type LocationScope = {
  readonly actorId: string;
  readonly installationId: string;
};

// Delivery transport state only. DSH remains the sole owner of accepted
// location and lifecycle truth. Restart durability is preserved, but precise
// coordinates are persisted only through the explicitly configured sensitive
// storage provider (SecureStore in app-captain), never localStorage or plain
// AsyncStorage.
function encode(value: string): string {
  return encodeURIComponent(value.trim());
}

async function resolveLocationScope(actorId: string, assignmentId: string): Promise<LocationScope> {
  const normalizedActorId = actorId.trim();
  const normalizedAssignmentId = assignmentId.trim();
  if (!normalizedActorId || !normalizedAssignmentId) {
    throw new DshRequestError('invalid_request', { message: 'captain and assignment identity are required' });
  }
  const identity = await resolveMutationIdentityScope(normalizedActorId, {
    entityId: `location:${normalizedAssignmentId}`,
  });
  return { actorId: identity.actorId, installationId: identity.installationId };
}

function locationScopeKey(scope: LocationScope): string {
  return `${encode(scope.actorId)}:${encode(scope.installationId)}`;
}

function sameSample(left: ForegroundDispatchLocation, right: ForegroundDispatchLocation): boolean {
  return left.latitude === right.latitude
    && left.longitude === right.longitude
    && left.accuracyMeters === right.accuracyMeters
    && left.recordedAt === right.recordedAt;
}

function validateSample(assignmentId: string, sample: ForegroundDispatchLocation): void {
  if (!assignmentId.trim()) throw new DshRequestError('invalid_request', { message: 'assignmentId is required' });
  if (!Number.isFinite(sample.latitude) || sample.latitude < -90 || sample.latitude > 90) {
    throw new DshRequestError('invalid_request', { message: 'latitude is invalid' });
  }
  if (!Number.isFinite(sample.longitude) || sample.longitude < -180 || sample.longitude > 180) {
    throw new DshRequestError('invalid_request', { message: 'longitude is invalid' });
  }
  if (!Number.isFinite(sample.accuracyMeters) || sample.accuracyMeters <= 0 || sample.accuracyMeters > 100) {
    throw new DshRequestError('invalid_request', { message: 'accuracyMeters must be between 0 and 100' });
  }
  if (!sample.recordedAt || Number.isNaN(Date.parse(sample.recordedAt))) {
    throw new DshRequestError('invalid_request', { message: 'recordedAt must be an RFC3339 timestamp' });
  }
}

function parsePendingLocation(value: unknown, expectedAssignmentId: string): PendingLocation {
  if (!value || typeof value !== 'object') {
    throw new Error('sensitive foreground location outbox entry is invalid');
  }
  const parsed = value as Partial<PendingLocation>;
  if (parsed.assignmentId !== expectedAssignmentId || !parsed.sample || typeof parsed.sample !== 'object') {
    throw new Error('sensitive foreground location outbox identity is invalid');
  }
  const sample = parsed.sample as Partial<ForegroundDispatchLocation>;
  if (typeof sample.latitude !== 'number'
    || typeof sample.longitude !== 'number'
    || typeof sample.accuracyMeters !== 'number'
    || typeof sample.recordedAt !== 'string') {
    throw new Error('sensitive foreground location outbox sample is invalid');
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

function parseSensitiveOutbox(raw: string | null): SensitiveLocationOutbox {
  if (raw === null) return { schemaVersion: 2, pending: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new Error('sensitive foreground location outbox is corrupt', { cause });
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('sensitive foreground location outbox is invalid');
  }
  const value = parsed as { readonly schemaVersion?: unknown; readonly pending?: unknown };
  if (value.schemaVersion !== 2 || !Array.isArray(value.pending)) {
    throw new Error('sensitive foreground location outbox schema is invalid');
  }
  const pending = value.pending.map((entry) => {
    if (!entry || typeof entry !== 'object' || typeof (entry as { readonly scopeKey?: unknown }).scopeKey !== 'string') {
      throw new Error('sensitive foreground location outbox scope is invalid');
    }
    const candidate = entry as { readonly scopeKey: string; readonly assignmentId?: unknown };
    if (typeof candidate.assignmentId !== 'string' || !candidate.scopeKey) {
      throw new Error('sensitive foreground location outbox key is invalid');
    }
    return {
      scopeKey: candidate.scopeKey,
      ...parsePendingLocation(entry, candidate.assignmentId),
    };
  });
  return { schemaVersion: 2, pending };
}

async function readSensitiveOutbox(): Promise<SensitiveLocationOutbox> {
  return parseSensitiveOutbox(await bthwaniSensitiveStorage.getItem(SENSITIVE_LOCATION_OUTBOX_KEY));
}

async function writeSensitiveOutbox(pending: readonly StoredPendingLocation[]): Promise<void> {
  if (pending.length === 0) {
    await bthwaniSensitiveStorage.removeItem(SENSITIVE_LOCATION_OUTBOX_KEY);
    return;
  }
  await bthwaniSensitiveStorage.setItem(
    SENSITIVE_LOCATION_OUTBOX_KEY,
    JSON.stringify({ schemaVersion: 2, pending } satisfies SensitiveLocationOutbox),
  );
}

async function readPendingLocation(scope: LocationScope, assignmentId: string): Promise<PendingLocation | null> {
  const scopeKey = locationScopeKey(scope);
  const outbox = await readSensitiveOutbox();
  const stored = outbox.pending.find((entry) => entry.scopeKey === scopeKey && entry.assignmentId === assignmentId);
  return stored ? { assignmentId: stored.assignmentId, sample: stored.sample } : null;
}

async function writePendingLocation(scope: LocationScope, pending: PendingLocation): Promise<void> {
  const scopeKey = locationScopeKey(scope);
  const outbox = await readSensitiveOutbox();
  const current = outbox.pending.find((entry) => entry.scopeKey === scopeKey && entry.assignmentId === pending.assignmentId);
  if (current && Date.parse(current.sample.recordedAt) > Date.parse(pending.sample.recordedAt)) return;
  const retained = outbox.pending.filter((entry) => !(entry.scopeKey === scopeKey && entry.assignmentId === pending.assignmentId));
  await writeSensitiveOutbox([...retained, { scopeKey, ...pending }]);
}

async function clearPendingLocationIfExact(
  scope: LocationScope,
  assignmentId: string,
  sample: ForegroundDispatchLocation,
): Promise<void> {
  const scopeKey = locationScopeKey(scope);
  const outbox = await readSensitiveOutbox();
  const current = outbox.pending.find((entry) => entry.scopeKey === scopeKey && entry.assignmentId === assignmentId);
  if (!current || !sameSample(current.sample, sample)) return;
  await writeSensitiveOutbox(outbox.pending.filter((entry) => entry !== current));
}

async function listPendingLocations(scope: LocationScope): Promise<readonly PendingLocation[]> {
  const scopeKey = locationScopeKey(scope);
  const outbox = await readSensitiveOutbox();
  return outbox.pending
    .filter((entry) => entry.scopeKey === scopeKey)
    .map((entry) => ({ assignmentId: entry.assignmentId, sample: entry.sample }));
}

export async function clearCaptainForegroundLocationOutbox(): Promise<void> {
  await bthwaniSensitiveStorage.removeItem(SENSITIVE_LOCATION_OUTBOX_KEY);
}

function isRetryableLocationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { readonly kind?: unknown; readonly status?: unknown };
  if (value.kind === 'network') return true;
  return typeof value.status === 'number' && (value.status === 408 || value.status === 429 || value.status >= 500);
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
    return { kind: 'sent', assignment: data.assignment };
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
  if (!normalizedActorId) throw new DshRequestError('invalid_request', { message: 'captain identity is required' });
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
