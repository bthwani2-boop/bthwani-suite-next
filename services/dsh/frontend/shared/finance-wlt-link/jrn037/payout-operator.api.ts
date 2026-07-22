import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";

export type PayoutOperatorActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

type ErrorShape = {
  readonly kind?: string;
  readonly status?: number;
  readonly code?: string;
  readonly message?: string;
};

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "jrn037-payout-operator",
);

function classify(error: ErrorShape): string {
  if (error.kind === "network") return "WLT_UNAVAILABLE";
  if (error.status === 401) return "AUTH_MISSING";
  if (error.status === 403) return error.code ?? "FINANCE_PERMISSION_DENIED";
  return error.code ?? `HTTP_${error.status ?? "ERROR"}`;
}

export async function reconcilePayoutRequest(payoutId: string): Promise<PayoutOperatorActionResult> {
  try {
    await request<unknown>(
      `/dsh/control-panel/finance/payout-requests/${encodeURIComponent(payoutId)}/reconcile`,
      {
        method: "POST",
        body: {},
        idempotencyKey: `payout-reconcile:${payoutId}`,
      },
    );
    return { ok: true };
  } catch (error) {
    const err = error as ErrorShape;
    return {
      ok: false,
      code: classify(err),
      message: err.message ?? "تعذر الاستعلام عن نتيجة الصرف ومطابقتها.",
    };
  }
}

export type PayoutAuditEvent = {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly action: string;
  readonly actorId: string;
  readonly actorType: string;
  readonly reason: string;
  readonly correlationId: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

export async function fetchPayoutAudit(payoutId: string): Promise<readonly PayoutAuditEvent[]> {
  const response = await request<{ readonly auditEvents: PayoutAuditEvent[] }>(
    `/dsh/control-panel/finance/payout-requests/${encodeURIComponent(payoutId)}/audit`,
  );
  return response.auditEvents ?? [];
}
