export type DshSessionRequestResult<T> = {
  readonly ok: boolean;
  readonly status: number;
  readonly body: T | null;
};

export function createDshSessionHttpClient() {
  async function request<T>(path: string, init?: RequestInit): Promise<DshSessionRequestResult<T>> {
    const response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  }

  return { request };
}
