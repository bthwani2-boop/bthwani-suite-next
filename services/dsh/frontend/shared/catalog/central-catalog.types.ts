import type { components } from "../../../clients/generated/dsh-api";

type CatalogSchema<Name extends keyof components["schemas"]> = components["schemas"][Name];

// Backend catalog DTOs are aliases of the generated contract. Presentation
// code may compose these types, but it cannot create a second DTO authority.
export type CentralCatalogDomain = CatalogSchema<"DshCentralCatalogDomain">;
export type CentralCatalogNode = CatalogSchema<"DshCentralCatalogNode">;
export type MasterProduct = CatalogSchema<"DshMasterProduct">;
export type MasterProductPatchInput = CatalogSchema<"DshMasterProductUpdateInput">;
export type DomainPatchInput = CatalogSchema<"DshDomainUpdateInput">;
export type NodePatchInput = CatalogSchema<"DshNodeUpdateInput">;
export type CatalogPolicyUpdateInput = CatalogSchema<"DshCatalogPlatformPolicyUpdateInput">;
export type ProductProposal = CatalogSchema<"DshProductProposal">;
/** Store assortment identity and metadata; commercial truth has separate resources. */
export type StoreAssortment = CatalogSchema<"DshStoreAssortment">;
export type StoreAssortmentMetadataUpdateInput = CatalogSchema<"DshStoreAssortmentMetadataUpdateInput">;
export type StoreAssortmentCreateInput = Omit<StoreAssortmentMetadataUpdateInput, "expectedVersion">;
export type StoreAssortmentMetadataInput = StoreAssortmentCreateInput & {
  readonly expectedVersion?: number | undefined;
};
export type StoreAssortmentInventoryInput = CatalogSchema<"DshStoreAssortmentInventoryInput">;
export type StoreAssortmentInventory = CatalogSchema<"DshStoreAssortmentInventory">;
export type StoreAssortmentPriceInput = CatalogSchema<"DshStoreAssortmentPriceInput">;
export type StoreAssortmentPrice = CatalogSchema<"DshStoreAssortmentPrice">;
export type StoreAssortmentCommercialReadback = {
  readonly inventory: StoreAssortmentInventory;
  readonly prices: readonly StoreAssortmentPrice[];
};
export type StoreAssortmentStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getCurrentStoreAssortmentPrice(
  readback: StoreAssortmentCommercialReadback | undefined,
): StoreAssortmentPrice | undefined {
  if (!readback) return undefined;
  const now = Date.now();
  return readback.prices.find((price) => {
    const starts = Date.parse(price.effectiveFrom);
    const ends = price.effectiveUntil ? Date.parse(price.effectiveUntil) : Number.POSITIVE_INFINITY;
    return Number.isFinite(starts) && starts <= now && now < ends;
  });
}

/** Derives presentation state exclusively from the normalized inventory resource. */
export function isStoreAssortmentAvailable(inventory: StoreAssortmentInventory): boolean {
  if (inventory.minOrderQuantity < 1
    || inventory.maxOrderQuantity < inventory.minOrderQuantity
    || inventory.stepQuantity < 1) {
    return false;
  }
  if (inventory.policyType === "infinite") return true;
  if (inventory.policyType === "signal") return inventory.quantity > 0;
  return inventory.quantity - inventory.reservedQuantity >= inventory.minOrderQuantity;
}

/** Derives presentation state exclusively from the normalized inventory resource. */
export function getStoreAssortmentStockStatus(
  inventory: StoreAssortmentInventory,
): StoreAssortmentStockStatus {
  if (!isStoreAssortmentAvailable(inventory)) return "out_of_stock";
  if (inventory.policyType === "infinite") return "in_stock";
  const availableQuantity = inventory.policyType === "quantity"
    ? inventory.quantity - inventory.reservedQuantity
    : inventory.quantity;
  return availableQuantity <= 5 ? "low_stock" : "in_stock";
}
export type CatalogPlatformPolicy = CatalogSchema<"DshCatalogPlatformPolicy">;
export type EffectiveImage = NonNullable<CatalogSchema<"DshClientCatalogProduct">["effectiveImage"]>;
export type ClientVisibleCatalogEntry = CatalogSchema<"DshClientCatalogProduct">;
export type ClientVisibleCatalogResponse = CatalogSchema<"DshCatalogResponse">;
export type CatalogAsset = CatalogSchema<"DshCatalogAsset">;
export type CatalogAssetStatus = CatalogAsset["status"];
export type CatalogAssetLink = CatalogSchema<"DshCatalogAssetLink">;
export type CatalogAssetLinkWithAsset = CatalogSchema<"DshCatalogAssetLinkWithAsset">;
export type AssetUploadIntentInput = CatalogSchema<"DshCatalogAssetUploadIntentInput">;
export type AssetUploadIntent = CatalogSchema<"DshCatalogAssetUploadIntentResponse">;
export type AssetUpdateInput = CatalogSchema<"DshCatalogAssetUpdateInput">;
export type SeedStatus = CatalogSchema<"DshCatalogSeedStatus">;

export interface CatalogConflictResponse {
  readonly code: "CONFLICT";
  readonly message: string;
  readonly entityId: string;
  readonly expectedVersion: number | null;
  readonly currentVersion: number;
}

/** Upload progress state machine. */
export type AssetUploadProgress =
  | { stage: "idle" }
  | { stage: "signing" }
  | { stage: "uploading"; percent: number }
  | { stage: "verifying" }
  | { stage: "linked"; assetId: string; linkId?: string }
  | { stage: "failed"; error: string };

/** Legacy reel DTOs remain presentation-only; governed reel APIs own their contract. */
export interface Reel {
  readonly id: string;
  readonly assetId: string;
  readonly titleAr: string;
  readonly titleEn: string;
  readonly targetType: "master_product" | "store" | "offer";
  readonly targetId: string;
  readonly status: "pending_review" | "approved" | "rejected" | "archived";
  readonly sortOrder: number;
  readonly submittedBy: string;
  readonly submittedByRole: string;
  readonly sourceStoreId: string | null;
  readonly reviewedBy: string | null;
  readonly reviewNote: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PublicReel {
  readonly id: string;
  readonly titleAr: string;
  readonly titleEn: string;
  readonly videoUrl: string;
  readonly targetType: "master_product" | "store" | "offer";
  readonly targetId: string;
  readonly sortOrder: number;
}

export interface CreateReelSubmissionInput {
  readonly assetId: string;
  readonly titleAr?: string;
  readonly titleEn?: string;
  readonly targetType: "master_product" | "store" | "offer";
  readonly targetId: string;
  readonly sortOrder?: number;
  readonly sourceStoreId?: string;
}

export interface ReviewReelInput {
  readonly decision: "approved" | "rejected" | "archived";
  readonly reviewNote?: string;
  readonly targetType?: "master_product" | "store" | "offer";
  readonly targetId?: string;
  readonly sortOrder?: number;
}
