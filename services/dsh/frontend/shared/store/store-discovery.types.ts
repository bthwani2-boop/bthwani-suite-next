import type { paths } from "../../../clients/generated/dsh-api";
import type { DshFulfillmentDeliveryMode } from "../delivery/delivery.contract";
import type { DshStoreOperationalContextContract } from "./store-operational-context.contract";

export type DshStoreSummaryDto =
  paths["/dsh/stores"]["get"]["responses"]["200"]["content"]["application/json"]["stores"][number];

/**
 * Store-detail response composed from the aggregate generated client and the
 * active DSH store operational-context overlay. The overlay explicitly uses a
 * MANUAL_TYPED_ADAPTER; runtime consumers validate all overlay fields and fail
 * closed before constructing this type.
 */
export type DshStoreOperationalContextDto = DshStoreOperationalContextContract;

export type DshStoreDetailDto =
  paths["/dsh/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"]["store"] &
  DshStoreOperationalContextDto;

type GeneratedStoreActionResponse =
  paths["/dsh/partner/stores/{storeId}/settings"]["patch"]["responses"]["200"]["content"]["application/json"];
type GeneratedStoreContextResponse =
  paths["/dsh/store-context"]["get"]["responses"]["200"]["content"]["application/json"];
type GeneratedOperatorStoreDetailResponse =
  paths["/dsh/operator/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"];

export type PartnerStoreSettingsRequest =
  paths["/dsh/partner/stores/{storeId}/settings"]["patch"]["requestBody"]["content"]["application/json"];
export type FieldStoreVerificationRequest =
  paths["/dsh/field/stores/{storeId}/verifications"]["post"]["requestBody"]["content"]["application/json"];
export type CaptainPickupReadinessRequest =
  paths["/dsh/captain/stores/{storeId}/pickup-readiness"]["post"]["requestBody"]["content"]["application/json"];
export type OperatorStoreGovernanceRequest =
  paths["/dsh/operator/stores/{storeId}/governance"]["post"]["requestBody"]["content"]["application/json"];
export type StoreActionResponse = Omit<GeneratedStoreActionResponse, "store"> & {
  readonly store: DshStoreDetailDto;
};
export type GetDshStoreContextResponse = Omit<GeneratedStoreContextResponse, "store"> & {
  readonly store: DshStoreDetailDto;
};
export type OperatorStoreListResponse =
  paths["/dsh/operator/stores"]["get"]["responses"]["200"]["content"]["application/json"];
export type OperatorStoreDetailResponse = Omit<GeneratedOperatorStoreDetailResponse, "store"> & {
  readonly store: DshStoreDetailDto;
};

export type StoreRoleAction =
  | {
      readonly kind: "partner";
      readonly storeId: string;
      readonly input: PartnerStoreSettingsRequest;
    }
  | {
      readonly kind: "field";
      readonly storeId: string;
      readonly input: FieldStoreVerificationRequest;
    }
  | {
      readonly kind: "captain";
      readonly storeId: string;
      readonly input: CaptainPickupReadinessRequest;
    }
  | {
      readonly kind: "operator";
      readonly storeId: string;
      readonly input: OperatorStoreGovernanceRequest;
    };

export type StoreHeroFulfillmentMode = {
  readonly id: DshFulfillmentDeliveryMode;
  readonly label: string;
  readonly icon: string;
};
