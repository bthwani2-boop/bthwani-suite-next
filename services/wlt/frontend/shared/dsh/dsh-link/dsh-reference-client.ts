import { createDshHttpClient } from "./dsh-http-request";

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly kind: "http" | "network";
      readonly status?: number;
      readonly message: string;
    };

function classifyReferenceError(error: unknown): Exclude<DshReferenceApiResult<never>, { ok: true }> {
  const typed = error as { readonly kind?: unknown; readonly status?: unknown; readonly message?: unknown };
  if (typed?.kind === "network") {
    return {
      ok: false,
      kind: "network",
      message: typeof typed.message === "string" ? typed.message : "DSH network request failed",
    };
  }
  return {
    ok: false,
    kind: "http",
    ...(typeof typed?.status === "number" ? { status: typed.status } : {}),
    message: typeof typed?.message === "string" ? typed.message : "DSH reference request failed",
  };
}

export async function requestDshReference<TResponse, TReference>(
  baseUrl: string,
  path: string,
  select: (response: TResponse) => TReference,
): Promise<DshReferenceApiResult<TReference>> {
  try {
    const client = createDshHttpClient(baseUrl, "wlt-dsh-reference");
    const response = await client.request<TResponse>(path);
    return { ok: true, data: select(response) };
  } catch (error) {
    return classifyReferenceError(error);
  }
}
