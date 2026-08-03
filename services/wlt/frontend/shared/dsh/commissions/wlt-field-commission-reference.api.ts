import type { WltDshFieldCommissionReference } from "./wlt-field-commission.types";
import { createDshHttpClient } from "../dsh-link/dsh-http-request";

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly kind: "http" | "network" | "invalid_response";
      readonly status?: number;
      readonly message: string;
    };

function isCommissionReferenceEnvelope(
  body: unknown,
): body is { readonly reference: WltDshFieldCommissionReference } {
  return typeof body === "object" && body !== null && "reference" in body;
}

function referenceError(error: unknown): DshReferenceApiResult<never> {
  const value = error as {
    readonly kind?: string;
    readonly status?: number;
    readonly message?: string;
  };
  if (value.kind === "network") {
    return {
      ok: false,
      kind: "network",
      message: value.message ?? "network error",
    };
  }
  return {
    ok: false,
    kind: "http",
    ...(value.status !== undefined ? { status: value.status } : {}),
    message: value.message ?? "request failed",
  };
}

export async function fetchWltFieldCommissionRef(
  baseUrl: string,
  partnerId: string,
): Promise<DshReferenceApiResult<WltDshFieldCommissionReference>> {
  const { request } = createDshHttpClient(
    baseUrl,
    "field-commission-reference",
  );
  try {
    const body = await request<unknown>(
      `/dsh/control-panel/finance/references/field-commission?partnerId=${encodeURIComponent(partnerId)}`,
    );
    if (!isCommissionReferenceEnvelope(body)) {
      return {
        ok: false,
        kind: "invalid_response",
        message: "field commission reference envelope is invalid",
      };
    }
    return { ok: true, data: body.reference };
  } catch (error) {
    return referenceError(error);
  }
}
