import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshCaptainFinancialEligibility } from "../platform";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "captain-financial-dispatch-eligibility",
  10000,
);

export function fetchOwnCaptainFinancialEligibility(): Promise<{ financialEligibility: DshCaptainFinancialEligibility }> {
  return request<{ financialEligibility: DshCaptainFinancialEligibility }>(
    "/dsh/captain/dispatch/financial-eligibility",
  );
}

export function refreshOwnCaptainFinancialEligibility(): Promise<{ financialEligibility: DshCaptainFinancialEligibility }> {
  return request<{ financialEligibility: DshCaptainFinancialEligibility }>(
    "/dsh/captain/dispatch/financial-eligibility/refresh",
    { method: "POST", body: {} },
  );
}
