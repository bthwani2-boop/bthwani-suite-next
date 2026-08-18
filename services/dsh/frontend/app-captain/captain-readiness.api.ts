import { createDshHttpClient } from "../shared/_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../shared/_kernel/dsh-api-base-url";

export type CaptainOperationalReadiness = {
  readonly ready: boolean;
  readonly missing: readonly string[];
};

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "captain-operational-readiness",
  10000,
);

/**
 * Canonical captain start-work decision owned by the DSH operational journey.
 * The backend composes Workforce activation, DSH dispatch state and WLT
 * financial eligibility. Dependency outages reject the request and must be
 * presented as unavailable; callers must never synthesize a blocked decision.
 */
export function fetchCaptainOperationalReadiness(): Promise<CaptainOperationalReadiness> {
  return request<CaptainOperationalReadiness>("/dsh/captain/me/readiness");
}
