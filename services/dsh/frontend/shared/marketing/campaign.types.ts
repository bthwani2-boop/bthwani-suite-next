import type { DshCampaign } from "./marketing.types";

export type GovernedDshCampaign = DshCampaign & {
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
  readonly audience?: string | undefined;
  readonly placement?: string | undefined;
  readonly expectedVersion: number;
};
