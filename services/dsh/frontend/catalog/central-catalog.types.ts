import type { components } from "../../clients/generated/dsh-api";

type CatalogSchema<Name extends keyof components["schemas"]> = components["schemas"][Name];

// Backend catalog DTOs are aliases of the generated contract. Presentation
// code may compose these types, but it cannot create a second DTO authority.
export type CentralCatalogDomain = CatalogSchema<"DshCentralCatalogDomain">;
export type CentralCatalogNode = CatalogSchema<"DshCentralCatalogNode">;
export type MasterProduct = CatalogSchema<"DshMasterProduct">;
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
export type CatalogAsset = CatalogSchema<"DshCatalogAsset">;
export type CatalogAssetLink = CatalogSchema<"DshCatalogAssetLink">;
export type AssetUploadIntentInput = CatalogSchema<"DshCatalogAssetUploadIntentInput">;
export type AssetUploadIntent = CatalogSchema<"DshCatalogAssetUploadIntentResponse">;
export type SeedStatus = CatalogSchema<"DshCatalogSeedStatus">;

/** Upload progress state machine. */
export type AssetUploadProgress =
  | { stage: "idle" }
  | { stage: "signing" }
  | { stage: "uploading"; percent: number }
  | { stage: "verifying" }
  | { stage: "linked"; assetId: string; linkId?: string }
  | { stage: "failed"; error: string };

