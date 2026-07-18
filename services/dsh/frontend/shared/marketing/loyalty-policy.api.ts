import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

const client = createDshHttpClient(resolveDshApiBaseUrl(), "loyalty-policy");

export type LoyaltyPolicyStatus = "draft" | "active" | "paused" | "archived";

export type LoyaltyEarningPolicy = {
  readonly id: string;
  readonly nameAr: string;
  readonly pointsNumerator: number;
  readonly eligibleMinorUnitsDenominator: number;
  readonly minimumPoints: number;
  readonly maximumPointsPerOrder: number;
  readonly status: LoyaltyPolicyStatus;
  readonly createdByActorId: string;
  readonly approvedByActorId?: string;
  readonly approvedAt?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type LoyaltyPolicyCreateInput = {
  readonly nameAr: string;
  readonly pointsNumerator: number;
  readonly eligibleMinorUnitsDenominator: number;
  readonly minimumPoints: number;
  readonly maximumPointsPerOrder: number;
};

export type LoyaltyPolicyUpdateInput = Partial<LoyaltyPolicyCreateInput> & {
  readonly status?: LoyaltyPolicyStatus;
  readonly expectedVersion: number;
};

export function listLoyaltyEarningPolicies(): Promise<{ policies: LoyaltyEarningPolicy[] }> {
  return client.request("/dsh/operator/marketing/loyalty-earning-policies");
}

export function createLoyaltyEarningPolicy(
  input: LoyaltyPolicyCreateInput,
): Promise<{ policy: LoyaltyEarningPolicy }> {
  return client.request("/dsh/operator/marketing/loyalty-earning-policies", {
    method: "POST",
    body: input,
  });
}

export function updateLoyaltyEarningPolicy(
  policyId: string,
  input: LoyaltyPolicyUpdateInput,
): Promise<{ policy: LoyaltyEarningPolicy }> {
  return client.request(`/dsh/operator/marketing/loyalty-earning-policies/${policyId}`, {
    method: "PATCH",
    body: input,
  });
}
