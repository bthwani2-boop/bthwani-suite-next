import { createDshHttpClient } from "../shared/_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../shared/_kernel/dsh-api-base-url";

export type FieldOperationalReadiness = {
  readonly ready: boolean;
  readonly missing: readonly string[];
};

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "field-operational-readiness", 10000);

/**
 * Canonical DSH field start-work boundary. The server composes Workforce
 * activation and preserves dependency failures as transport errors; callers
 * must not turn an unavailable dependency into a business denial.
 */
export function fetchFieldOperationalReadiness(): Promise<FieldOperationalReadiness> {
  return request<FieldOperationalReadiness>("/dsh/field/me/readiness");
}
