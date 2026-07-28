import type { ActorIdentity } from "@bthwani/core-identity";
import { postIdentityServerJson } from "./identity-server-http.adapter";

export type IdentityTokenResponse = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly identity: ActorIdentity;
};

export type EmployeeAccessCodeActivationResult =
  | {
      readonly ok: true;
      readonly tokens: IdentityTokenResponse;
    }
  | {
      readonly ok: false;
      readonly status: number;
      readonly code: string;
    };

function isTokenResponse(value: unknown): value is IdentityTokenResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<IdentityTokenResponse>;
  return (
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.trim().length > 0 &&
    typeof candidate.refreshToken === "string" &&
    candidate.refreshToken.trim().length > 0 &&
    typeof candidate.identity === "object" &&
    candidate.identity !== null
  );
}

export async function activateEmployeeAccessCode(input: {
  readonly baseUrl: string;
  readonly phone: string;
  readonly code: string;
}): Promise<EmployeeAccessCodeActivationResult> {
  const response = await postIdentityServerJson<unknown>({
    baseUrl: input.baseUrl,
    path: "/auth/activate",
    body: {
      actorType: "employee",
      phone: input.phone.trim(),
      code: input.code.trim(),
      deviceFingerprint: "control-panel-access-code",
    },
    timeoutMs: 8000,
  });

  if (!response.ok) {
    const errorBody = response.body as { code?: unknown } | null;
    return {
      ok: false,
      status: response.status >= 400 ? response.status : 503,
      code: response.error === "network"
        ? "IDENTITY_UNAVAILABLE"
        : typeof errorBody?.code === "string" && errorBody.code.trim()
          ? errorBody.code
          : "ACCESS_CODE_FAILED",
    };
  }

  if (!isTokenResponse(response.body)) {
    return { ok: false, status: 502, code: "IDENTITY_INVALID_RESPONSE" };
  }
  return { ok: true, tokens: response.body };
}
