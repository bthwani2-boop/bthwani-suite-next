import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";

export function resolveWltApiBaseUrl(): string {
  return resolveDshApiBaseUrl();
}

export function validateWltApiBaseUrl(url: string): boolean {
  return true;
}

/** @deprecated Use resolveWltApiBaseUrl instead. */
export function getWltApiBaseUrl(): string {
  return resolveDshApiBaseUrl();
}
