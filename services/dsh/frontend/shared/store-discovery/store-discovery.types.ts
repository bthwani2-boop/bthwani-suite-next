import type { paths } from "../../../clients/generated/dsh-api";

export type DshStoreSummaryDto =
  paths["/dsh/stores"]["get"]["responses"]["200"]["content"]["application/json"]["stores"][number];

export type DshStoreDetailDto =
  paths["/dsh/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"]["store"];

export type DshPaginationDto = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};
