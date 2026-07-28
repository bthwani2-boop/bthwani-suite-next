export type IdentityServerResponse<T> =
  | {
      readonly ok: true;
      readonly status: number;
      readonly body: T;
    }
  | {
      readonly ok: false;
      readonly status: number;
      readonly body: unknown;
      readonly error?: "network";
    };

export async function postIdentityServerJson<T>(input: {
  readonly baseUrl: string;
  readonly path: string;
  readonly body: unknown;
  readonly timeoutMs?: number;
}): Promise<IdentityServerResponse<T>> {
  let response: Response;
  try {
    response = await fetch(new URL(input.path, input.baseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.body),
      cache: "no-store",
      signal: AbortSignal.timeout(input.timeoutMs ?? 8000),
    });
  } catch {
    return { ok: false, status: 503, body: null, error: "network" };
  }

  const body = await response.json().catch(() => null);
  return response.ok
    ? { ok: true, status: response.status, body: body as T }
    : { ok: false, status: response.status, body };
}
