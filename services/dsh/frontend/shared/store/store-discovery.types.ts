import type { paths } from "../../../clients/generated/dsh-api";
import type { DshFulfillmentDeliveryMode } from "../delivery/delivery.contract";

export type PartnerStoreSettingsRequest =
  paths["/dsh/partner/stores/{storeId}/settings"]["patch"]["requestBody"]["content"]["application/json"];
export type FieldStoreVerificationRequest =
  paths["/dsh/field/stores/{storeId}/verifications"]["post"]["requestBody"]["content"]["application/json"];
export type CaptainPickupReadinessRequest =
  paths["/dsh/captain/stores/{storeId}/pickup-readiness"]["post"]["requestBody"]["content"]["application/json"];
export type OperatorStoreGovernanceRequest =
  paths["/dsh/operator/stores/{storeId}/governance"]["post"]["requestBody"]["content"]["application/json"];
export type StoreActionResponse =
  paths["/dsh/partner/stores/{storeId}/settings"]["patch"]["responses"]["200"]["content"]["application/json"];
export type GetDshStoreContextResponse =
  paths["/dsh/store-context"]["get"]["responses"]["200"]["content"]["application/json"];
export type OperatorStoreListResponse =
  paths["/dsh/operator/stores"]["get"]["responses"]["200"]["content"]["application/json"];
export type OperatorStoreDetailResponse =
  paths["/dsh/operator/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"];

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

export type DshStoreSummaryDto =
  paths["/dsh/stores"]["get"]["responses"]["200"]["content"]["application/json"]["stores"][number];

/**
 * Operational context persisted by DSH and returned by the live store-detail
 * endpoint. This intersection is temporary compatibility for the generated
 * client until the next contract generation run; consumers still fail closed
 * at runtime when any field is absent.
 */
export type DshStoreOperationalContextDto = {
  readonly addressLine: string;
  readonly coverageSummary: string;
  readonly operatingHours: string;
  readonly deliveryReadiness: string;
};

export type DshStoreDetailDto =
  paths["/dsh/stores/{storeId}"]["get"]["responses"]["200"]["content"]["application/json"]["store"] &
  DshStoreOperationalContextDto;

export type StoreHeroFulfillmentMode = {
  readonly id: DshFulfillmentDeliveryMode;
  readonly label: string;
  readonly icon: string;
};
