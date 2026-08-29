import { secureRandomId } from "../_kernel/secure-random.ts";

export const FIELD_INTENT_SCHEMA_VERSION = 1 as const;

export type FieldMutationOperation =
  | "create_visit"
  | "complete_visit"
  | "upsert_readiness_check"
  | "create_escalation"
  | "update_escalation";

export type FieldMutationIdentityContext = {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly intentFingerprint: string;
};

type CanonicalScalar = string | number | boolean | null;
type CanonicalValue = CanonicalScalar | CanonicalValue[] | { readonly [key: string]: CanonicalValue };
type Sha256State = [number, number, number, number, number, number, number, number];

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/** Portable SHA-256 keeps the deterministic identity available in Expo and web runtimes. */
function sha256Hex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const bitLength = bytes.length * 8;
  const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const highLength = Math.floor(bitLength / 0x1_0000_0000);
  const lowLength = bitLength >>> 0;
  const lengthOffset = padded.length - 8;
  padded[lengthOffset] = (highLength >>> 24) & 0xff;
  padded[lengthOffset + 1] = (highLength >>> 16) & 0xff;
  padded[lengthOffset + 2] = (highLength >>> 8) & 0xff;
  padded[lengthOffset + 3] = highLength & 0xff;
  padded[lengthOffset + 4] = (lowLength >>> 24) & 0xff;
  padded[lengthOffset + 5] = (lowLength >>> 16) & 0xff;
  padded[lengthOffset + 6] = (lowLength >>> 8) & 0xff;
  padded[lengthOffset + 7] = lowLength & 0xff;

  const hash: Sha256State = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const position = offset + index * 4;
      words[index] = ((padded[position]! << 24)
        | (padded[position + 1]! << 16)
        | (padded[position + 2]! << 8)
        | padded[position + 3]!) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const prior = words[index - 15]!;
      const previous = words[index - 2]!;
      const sigma0 = rotateRight(prior, 7) ^ rotateRight(prior, 18) ^ (prior >>> 3);
      const sigma1 = rotateRight(previous, 17) ^ rotateRight(previous, 19) ^ (previous >>> 10);
      words[index] = (words[index - 16]! + sigma0 + words[index - 7]! + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + sigma1 + choose + SHA256_K[index]! + words[index]!) >>> 0;
      const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0]! + a) >>> 0;
    hash[1] = (hash[1]! + b) >>> 0;
    hash[2] = (hash[2]! + c) >>> 0;
    hash[3] = (hash[3]! + d) >>> 0;
    hash[4] = (hash[4]! + e) >>> 0;
    hash[5] = (hash[5]! + f) >>> 0;
    hash[6] = (hash[6]! + g) >>> 0;
    hash[7] = (hash[7]! + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

const OPERATION_ALIASES: Readonly<Record<string, FieldMutationOperation>> = {
  "create-visit": "create_visit",
  create_visit: "create_visit",
  "complete-visit": "complete_visit",
  complete_visit: "complete_visit",
  "upsert-check": "upsert_readiness_check",
  upsert_readiness_check: "upsert_readiness_check",
  "create-escalation": "create_escalation",
  create_escalation: "create_escalation",
  "update-escalation": "update_escalation",
  update_escalation: "update_escalation",
};

function requiredObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required for deterministic field intent identity`);
  }
  return value.trim();
}

function normalizeForIdentity(value: unknown, path: string): CanonicalValue {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} contains a non-finite number`);
    return value;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((item, index) => normalizeForIdentity(item, `${path}[${index}]`));
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, normalizeForIdentity(object[key], `${path}.${key}`)]),
    );
  }
  throw new Error(`${path} contains an unsupported value`);
}

export function normalizeFieldMutationOperation(operation: string): FieldMutationOperation {
  const normalized = operation.trim().toLowerCase();
  const canonical = OPERATION_ALIASES[normalized];
  if (!canonical) throw new Error(`unsupported field mutation operation: ${operation}`);
  return canonical;
}

/**
 * Normalize the full transport payload, not a lossy list of selected fields.
 * The same object is therefore identified identically when it is submitted
 * online, persisted offline, migrated, replayed, or reconciled after restart.
 */
export function normalizeFieldMutationPayload(
  operation: string,
  payload: unknown,
): CanonicalValue {
  const operationType = normalizeFieldMutationOperation(operation);
  const input = requiredObject(payload, `field ${operationType} mutation payload`);

  switch (operationType) {
    case "create_visit":
      requiredString(input.storeId, "storeId");
      requiredObject(input.input, "input");
      break;
    case "complete_visit":
      requiredString(input.visitId, "visitId");
      requiredObject(input.input, "input");
      break;
    case "upsert_readiness_check":
      requiredString(input.visitId, "visitId");
      if (!requiredObject(input.input, "input").checkType) {
        throw new Error("checkType is required for deterministic field intent identity");
      }
      break;
    case "create_escalation":
      requiredString(input.storeId, "storeId");
      if (!requiredString(requiredObject(input.input, "input").description, "description")) {
        throw new Error("description is required for deterministic field intent identity");
      }
      break;
    case "update_escalation":
      requiredString(input.escalationId, "escalationId");
      requiredObject(input.input, "input");
      break;
  }

  return normalizeForIdentity({
    operationType,
    payloadVersion: 1,
    payload: input,
  }, "field mutation");
}

export function buildFieldIntentFingerprint(operation: string, payload: unknown): string {
  const normalized = normalizeFieldMutationPayload(operation, payload);
  const operationType = normalizeFieldMutationOperation(operation);
  const envelope = normalized as { readonly payload: Record<string, CanonicalValue> };
  const entityKey = operationType === "create_visit" || operationType === "create_escalation"
    ? envelope.payload.storeId
    : operationType === "update_escalation"
      ? envelope.payload.escalationId
      : envelope.payload.visitId;
  // The digest is a transport-sized index, not the sole authority: the full
  // versioned normalized envelope and original payload remain in this module
  // and in the durable queue for validation/reconstruction.
  return `field-intent:v${FIELD_INTENT_SCHEMA_VERSION}:${operationType}:${encodeURIComponent(String(entityKey))}:${sha256Hex(JSON.stringify(normalized))}`;
}

export function createFieldMutationIdentity(
  operation: string,
  payload: unknown,
): FieldMutationIdentityContext {
  const operationType = normalizeFieldMutationOperation(operation);
  const intentFingerprint = buildFieldIntentFingerprint(operationType, payload);
  const operationId = `field-op:v5:${operationType}:${secureRandomId()}`;
  return {
    operationId,
    // This key is minted once with the operation and remains stable for every
    // online attempt, offline replay, restart, and receipt lookup.
    idempotencyKey: `field-intent:v${FIELD_INTENT_SCHEMA_VERSION}:${operationId}`,
    correlationId: `field:${operationType}:corr:${secureRandomId()}`,
    intentFingerprint,
  };
}

export function validateFieldMutationIdentity(
  operation: string,
  payload: unknown,
  supplied: Partial<FieldMutationIdentityContext>,
): FieldMutationIdentityContext {
  const operationType = normalizeFieldMutationOperation(operation);
  const intentFingerprint = buildFieldIntentFingerprint(operationType, payload);
  const operationId = supplied.operationId?.trim() || `field-op:v5:${operationType}:${secureRandomId()}`;
  const idempotencyKey = supplied.idempotencyKey?.trim() ?? "";
  const correlationId = supplied.correlationId?.trim() ?? "";

  if (!idempotencyKey || !correlationId) {
    throw new Error("field mutation correlation and idempotency must be supplied together");
  }
  if (idempotencyKey === correlationId) {
    throw new Error("field mutation correlation id must be distinct from the idempotency key");
  }
  if (supplied.intentFingerprint && supplied.intentFingerprint.trim() !== intentFingerprint) {
    throw new Error("field mutation context does not match the current business intent");
  }

  return { operationId, idempotencyKey, correlationId, intentFingerprint };
}
