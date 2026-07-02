import type { paths } from "../../../clients/generated/dsh-api";
import type {
  CaptainPickupReadinessRequest,
  FieldStoreVerificationRequest,
  OperatorStoreGovernanceRequest,
  PartnerStoreSettingsRequest,
} from "../../../clients/store-discovery-client";

export type { OperatorStoreGovernanceRequest };

export type StoreRoleAction =
  | { readonly kind: "partner"; readonly storeId: string; readonly input: PartnerStoreSettingsRequest }
  | { readonly kind: "field"; readonly storeId: string; readonly input: FieldStoreVerificationRequest }
  | { readonly kind: "captain"; readonly storeId: string; readonly input: CaptainPickupReadinessRequest }
  | { readonly kind: "operator"; readonly storeId: string; readonly input: OperatorStoreGovernanceRequest };

export type DshStoreSummaryDto =
  paths["/dsh/stores"]["get"]["responses"]["200"]["content"]["application/json"]["stores"][number];

export type DshStoreDetailDto =
  paths["/dsh/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"]["store"];

export type DshPaginationDto = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type StoreHeroFulfillmentMode = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
};
