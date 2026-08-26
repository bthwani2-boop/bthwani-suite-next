import { bthwaniKeyValueStorage } from "@bthwani/data-runtime/storage-adapter";
import { corrId, createDshHttpClient } from "../../shared/_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "captain-cash-in", 12000);
const ACTIVE_SESSION_KEY = "@bthwani/wlt/captain-cash-in/v1/active";
const MUTATION_PREFIX = "@bthwani/wlt/captain-cash-in/v1/mutation/";

export type CaptainCashInSession = {
  readonly id: string;
  readonly clientId: string;
  readonly topupReference?: string | null;
  readonly topupActorType?: "captain" | null;
  readonly financialPurpose: "captain_topup";
  readonly paymentMethod: "official_wallet";
  readonly status: string;
  readonly providerReference?: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly capturedAt?: string | null;
};

type TopUpEnvelope = { readonly paymentSession: CaptainCashInSession };
type StoredSession = CaptainCashInSession & { readonly actorId: string };
type StoredMutationContext = {
  readonly fingerprint: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
};

export type CaptainCashInErrorState = "offline" | "unknown" | "forbidden" | "not_found" | "conflict" | "error";

export class CaptainCashInError extends Error {
  readonly state: CaptainCashInErrorState;
  readonly code: string;

  constructor(state: CaptainCashInErrorState, code: string, message: string) {
    super(message);
    this.name = "CaptainCashInError";
    this.state = state;
    this.code = code;
  }
}

function classify(error: unknown): CaptainCashInError {
  const value = error as { readonly kind?: string; readonly status?: number; readonly code?: string; readonly message?: string };
  if (value.kind === "network") {
    return new CaptainCashInError("unknown", "NETWORK_UNKNOWN", "تعذر معرفة نتيجة Cash-In. لا تعِد الدفع قبل تحديث الحالة.");
  }
  if (value.status === 401 || value.status === 403) {
    return new CaptainCashInError("forbidden", value.code ?? "FORBIDDEN", "لا تملك الجلسة الحالية صلاحية إدارة Cash-In للكابتن.");
  }
  if (value.status === 404) {
    return new CaptainCashInError("not_found", value.code ?? "NOT_FOUND", "جلسة Cash-In غير موجودة ضمن نطاق الكابتن الحالي.");
  }
  if (value.status === 409) {
    return new CaptainCashInError("conflict", value.code ?? "CONFLICT", value.message ?? "جلسة Cash-In في انتقال لا يسمح بتكراره.");
  }
  if (value.status === 502 || String(value.code ?? "").toUpperCase().includes("UNKNOWN")) {
    return new CaptainCashInError("unknown", value.code ?? "PROVIDER_RESULT_UNKNOWN", "نتيجة المزود غير محسومة. حدّث الحالة قبل أي محاولة جديدة.");
  }
  return new CaptainCashInError("error", value.code ?? "CASH_IN_FAILED", value.message ?? "تعذر تنفيذ Cash-In من WLT.");
}

function assertSession(value: TopUpEnvelope): CaptainCashInSession {
  const session = value?.paymentSession;
  if (!session?.id || session.topupActorType !== "captain" || session.financialPurpose !== "captain_topup") {
    throw new CaptainCashInError("error", "INVALID_WLT_READBACK", "استجابة WLT لا تحتوي جلسة Cash-In صالحة للكابتن.");
  }
  return session;
}

async function call<T>(path: string, options: Parameters<typeof request>[1] = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (error instanceof CaptainCashInError) throw error;
    throw classify(error);
  }
}

export function newCaptainCashInContext(): { readonly topupReference: string; readonly idempotencyKey: string; readonly correlationId: string } {
  const id = corrId("captain-cash-in");
  return { topupReference: id, idempotencyKey: id, correlationId: id };
}

function mutationStorageKey(operation: string, sessionId?: string): string {
  return `${MUTATION_PREFIX}${operation}/${sessionId ?? "create"}`;
}

export async function getOrCreateCaptainCashInMutationContext(input: {
  readonly operation: "create" | "authorize" | "capture" | "allocateCollateral";
  readonly sessionId?: string;
  readonly fingerprint: string;
}): Promise<{ readonly topupReference: string; readonly idempotencyKey: string; readonly correlationId: string }> {
  const key = mutationStorageKey(input.operation, input.sessionId);
  const raw = await bthwaniKeyValueStorage.getItem(key);
  if (raw) {
    try {
      const stored = JSON.parse(raw) as StoredMutationContext;
      if (stored.fingerprint === input.fingerprint && stored.idempotencyKey && stored.correlationId) {
        return { topupReference: stored.idempotencyKey, idempotencyKey: stored.idempotencyKey, correlationId: stored.correlationId };
      }
    } catch {
      // Corrupt local intent is discarded; WLT remains the authority.
    }
  }
  const context = newCaptainCashInContext();
  await bthwaniKeyValueStorage.setItem(key, JSON.stringify({ fingerprint: input.fingerprint, ...context } satisfies StoredMutationContext));
  return context;
}

export async function clearCaptainCashInMutationContext(operation: "create" | "authorize" | "capture" | "allocateCollateral", sessionId?: string): Promise<void> {
  await bthwaniKeyValueStorage.removeItem(mutationStorageKey(operation, sessionId));
}

export async function createCaptainCashInSession(input: {
  readonly topupReference: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
}): Promise<CaptainCashInSession> {
  const data = await call<TopUpEnvelope>("/dsh/captain/me/finance/topup-sessions", {
    method: "POST",
    body: {
      topupReference: input.topupReference,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency,
    },
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
  });
  return assertSession(data);
}

export async function readCaptainCashInSession(sessionId: string): Promise<CaptainCashInSession> {
  const data = await call<TopUpEnvelope>(`/dsh/captain/me/finance/topup-sessions/${encodeURIComponent(sessionId)}`);
  return assertSession(data);
}

export async function mutateCaptainCashInSession(input: {
  readonly sessionId: string;
  readonly operation: "authorize" | "capture";
  readonly idempotencyKey: string;
  readonly correlationId: string;
}): Promise<CaptainCashInSession> {
  const data = await call<TopUpEnvelope>(
    `/dsh/captain/me/finance/topup-sessions/${encodeURIComponent(input.sessionId)}/${input.operation}`,
    {
      method: "POST",
      body: {},
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
    },
  );
  return assertSession(data);
}

export async function loadStoredCaptainCashInSession(actorId: string): Promise<CaptainCashInSession | null> {
  const raw = await bthwaniKeyValueStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredSession;
    if (stored.actorId !== actorId) {
      await bthwaniKeyValueStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }
    return stored.id ? stored : null;
  } catch {
    return null;
  }
}

export async function storeCaptainCashInSession(actorId: string, session: CaptainCashInSession): Promise<void> {
  await bthwaniKeyValueStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ ...session, actorId } satisfies StoredSession));
}

export async function clearCaptainCashInSession(): Promise<void> {
  await bthwaniKeyValueStorage.removeItem(ACTIVE_SESSION_KEY);
}
