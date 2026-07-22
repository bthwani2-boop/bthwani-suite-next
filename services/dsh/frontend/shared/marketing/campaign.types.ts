import type { DshCampaign } from "./marketing.types";

export type GovernedDshCampaign = DshCampaign & {
  readonly targetCityCode?: string | undefined;
  readonly targetServiceAreaCode?: string | undefined;
  readonly version: number;
};

export type GovernedCampaignWritePayload = {
  readonly status?: string | undefined;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
  readonly targetType?: string | undefined;
  readonly targetId?: string | undefined;
  readonly targetCityCode?: string | undefined;
  readonly targetServiceAreaCode?: string | undefined;
  readonly audience?: string | undefined;
  readonly placement?: string | undefined;
  /**
   * Required by the governed controller and enforced by the backend. Optional at
   * the transport type boundary only so retired callers still compile and fail
   * closed with VERSION_CONFLICT rather than bypassing optimistic concurrency.
   */
  readonly expectedVersion?: number | undefined;
};
