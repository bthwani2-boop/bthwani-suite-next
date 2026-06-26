// DSH → WLT Payment Session Client — J-003C (LIVE)
// DSH uses this client to create a payment session in WLT when a client confirms checkout.
// WLT owns the payment ledger; DSH stores only wlt_payment_ref_id as a read-only reference.
//
// WLT endpoints used:
//   POST /payment/sessions          — create session (returns PaymentSession with id)
//   GET  /payment/sessions/{id}     — poll status (fallback only; prefer WLT callback)
//
// Rules:
//   - DSH NEVER mutates WLT wallet, ledger, or balance.
//   - DSH sends checkout_intent_id + amount snapshot (non-authoritative); WLT decides final amount.
//   - On success WLT calls DSH POST /checkout/payment-callback with wlt_payment_ref_id.
//   - DSH records wlt_payment_ref_id on the checkout intent record only.

export type WltPaymentSessionFetchFn = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type WltPaymentSessionAuth = {
  readonly bearerToken?: string;
  readonly clientId?: string;
  readonly actorType?: string;
};

// ─── request/response shapes (mirror wlt/domain/wallet.go) ──────────────────

export type DshToWltCreatePaymentSessionRequest = {
  readonly checkout_intent_id: string;
  readonly client_id: string;
  /** Non-authoritative amount snapshot in platform currency units (float). */
  readonly amount: number;
  readonly currency: string;
  readonly payment_method: string;
  /** DSH base URL so WLT can deliver POST /checkout/payment-callback back. */
  readonly dsh_base_url: string;
  /** Idempotency key scoped to this checkout attempt — prevents double-charge on retry. */
  readonly idempotency_key: string;
};

export type WltPaymentSessionResponse = {
  readonly id: string;
  readonly checkout_intent_id: string;
  readonly client_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  readonly payment_method: string;
  readonly provider_ref?: string;
  readonly dsh_base_url: string;
  readonly idempotency_key: string;
  readonly failure_reason?: string;
  readonly created_at: string;
  readonly expires_at: string;
  readonly confirmed_at?: string;
  readonly failed_at?: string;
};

// ─── error shapes ─────────────────────────────────────────────────────────────

export type WltPaymentSessionOfflineError = { readonly kind: 'offline' };
export type WltPaymentSessionHttpError = {
  readonly kind: 'http';
  readonly status: number;
  readonly body: string;
};
export type WltPaymentSessionError =
  | WltPaymentSessionOfflineError
  | WltPaymentSessionHttpError;

// ─── client interface ─────────────────────────────────────────────────────────

export interface WltPaymentSessionClient {
  /**
   * Create a WLT payment session for the given checkout intent.
   * Called by DSH when the client selects a payment method and confirms checkout.
   * DSH stores the returned session id as wlt_payment_ref_id (read-only reference).
   */
  createPaymentSession(
    req: DshToWltCreatePaymentSessionRequest,
  ): Promise<WltPaymentSessionResponse>;

  /**
   * Poll payment session status. Used as fallback only — primary flow uses WLT → DSH callback.
   */
  getPaymentSession(
    sessionId: string,
  ): Promise<WltPaymentSessionResponse>;
}

// ─── HTTP transport ───────────────────────────────────────────────────────────

function wltAuthHeaders(auth: WltPaymentSessionAuth): Record<string, string> {
  const bearerToken = auth.bearerToken?.trim();
  if (bearerToken) {
    return {
      Authorization: `Bearer ${bearerToken}`,
      ...(auth.actorType ? { 'X-Actor-Type': auth.actorType } : {}),
    };
  }
  const clientId = auth.clientId?.trim();
  return {
    ...(clientId ? { 'X-Client-Id': clientId } : {}),
    ...(auth.actorType ? { 'X-Actor-Type': auth.actorType } : {}),
  };
}

async function wltFetch<T>(
  baseUrl: string,
  fetchFn: WltPaymentSessionFetchFn,
  method: string,
  path: string,
  auth: WltPaymentSessionAuth,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  let response: Response;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...wltAuthHeaders(auth),
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  try {
    response = await fetchFn(url, init);
  } catch {
    const err: WltPaymentSessionOfflineError = { kind: 'offline' };
    throw err;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err: WltPaymentSessionHttpError = { kind: 'http', status: response.status, body: text };
    throw err;
  }

  return response.json() as Promise<T>;
}

/**
 * Create the HTTP client for DSH → WLT payment session operations.
 *
 * @param wltBaseUrl  Base URL of the WLT service
 * @param fetchFn     Fetch implementation (default: globalThis.fetch)
 * @param auth        Auth context: bearer token (preferred) or clientId + actorType
 */
export function createWltPaymentSessionClient(
  wltBaseUrl: string,
  fetchFn: WltPaymentSessionFetchFn = globalThis.fetch,
  auth: WltPaymentSessionAuth = {},
): WltPaymentSessionClient {
  return {
    createPaymentSession: (req) =>
      wltFetch<WltPaymentSessionResponse>(
        wltBaseUrl,
        fetchFn,
        'POST',
        '/payment/sessions',
        auth,
        req,
      ),

    getPaymentSession: (sessionId) =>
      wltFetch<WltPaymentSessionResponse>(
        wltBaseUrl,
        fetchFn,
        'GET',
        `/payment/sessions/${encodeURIComponent(sessionId)}`,
        auth,
      ),
  };
}
