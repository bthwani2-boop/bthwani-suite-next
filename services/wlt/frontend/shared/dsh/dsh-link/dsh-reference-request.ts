import { resolveDshApiBaseUrl } from "./dsh-api-base-url";
import { createDshRawHttpClient } from "./dsh-http-request";

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly kind: "http" | "network";
      readonly status?: number;
      readonly message: string;
    };

function resolveCanonicalRequestTarget(requestUrl: string): {
  readonly baseUrl: string;
  readonly path: string;
} {
  const canonicalBaseUrl = resolveDshApiBaseUrl().replace(/\/$/, "");
  if (requestUrl.startsWith(canonicalBaseUrl)) {
    return {
      baseUrl: canonicalBaseUrl,
      path: requestUrl.slice(canonicalBaseUrl.length) || "/",
    };
  }

  if (/^https?:\/\//i.test(requestUrl)) {
    const parsed = new URL(requestUrl);
    return {
      baseUrl: parsed.origin,
      path: `${parsed.pathname}${parsed.search}`,
    };
  }

  return { baseUrl: canonicalBaseUrl, path: requestUrl };
}

function mapDshReferenceError<T>(error: unknown): DshReferenceApiResult<T> {
  if (typeof error === "object" && error !== null && "kind" in error) {
    const candidate = error as {
      readonly kind?: unknown;
      readonly status?: unknown;
      readonly message?: unknown;
      readonly body?: unknown;
    };
    if (candidate.kind === "http") {
      return {
        ok: false,
        kind: "http",
        ...(typeof candidate.status === "number" ? { status: candidate.status } : {}),
        message:
          typeof candidate.message === "string" && candidate.message.trim()
            ? candidate.message
            : typeof candidate.body === "string" && candidate.body.trim()
              ? candidate.body
              : "DSH request failed",
      };
    }
  }
  return {
    ok: false,
    kind: "network",
    message: error instanceof Error ? error.message : "DSH network request failed",
  };
}

async function requestDshReferenceJson<T>(
  method: "GET" | "POST",
  requestUrl: string,
  body: unknown,
  select: (responseBody: unknown) => T,
): Promise<DshReferenceApiResult<T>> {
  const target = resolveCanonicalRequestTarget(requestUrl);
  const client = createDshRawHttpClient(target.baseUrl, "wlt-dsh-reference");
  try {
    const responseBody = await client.req<unknown>(target.path, {
      method,
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
    return { ok: true, data: select(responseBody) };
  } catch (error) {
    return mapDshReferenceError(error);
  }
}

export function dshFetchJson<T>(
  requestUrl: string,
  select: (responseBody: unknown) => T,
): Promise<DshReferenceApiResult<T>> {
  return requestDshReferenceJson("GET", requestUrl, undefined, select);
}

export function dshPostJson<T>(
  requestUrl: string,
  body: unknown,
  select: (responseBody: unknown) => T,
): Promise<DshReferenceApiResult<T>> {
  return requestDshReferenceJson("POST", requestUrl, body, select);
}
