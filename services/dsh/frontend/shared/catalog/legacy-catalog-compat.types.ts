// LEGACY COMPATIBILITY ONLY — not sovereign catalog truth.
// These types model a store-local "PartnerCatalog" shape (storeId-keyed categories/products
// with a free-text priceReference) that predates the central catalog (PIM/DAM). They exist
// solely so app-client / legacy submission screens keep working while reading data that is
// actually sourced from the sovereign central catalog via an adapter (see legacy-catalog-compat.api.ts
// fetchPublishedCatalog, which reshapes a ClientVisibleCatalogResponse into this shape).
// Sovereign truth lives in central-catalog.types.ts / central-catalog.api.ts / use-central-catalog-controller.tsx.
import type { CatalogMedia } from "./catalog.types";

export type CatalogCategory = {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly version: number;
};

export type CatalogProduct = {
  readonly id: string;
  readonly storeId: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string;
  readonly sku: string;
  readonly priceReference: string;
  /** Original price before discount. If present and greater than priceReference, a discount is active. */
  readonly originalPriceReference?: string | undefined;
  /** Discount percentage label (e.g. "15%"). Derived by API or computed locally. */
  readonly discountPercent?: number | undefined;
  /** Unit label shown beside the product name (e.g. "500g", "1L", "كغ"). */
  readonly unitLabel?: string | undefined;
  /** Stock availability. Defaults to "in_stock" when absent. */
  readonly stockStatus?: "in_stock" | "low_stock" | "out_of_stock" | undefined;
  readonly isActive: boolean;
  readonly version: number;
  readonly media: readonly CatalogMedia[];
};

export type PartnerCatalog = {
  readonly storeId: string;
  readonly categories: readonly CatalogCategory[];
  readonly products: readonly CatalogProduct[];
};

export type CatalogState =
  | { readonly kind: "loading" }
  | { readonly kind: "permission_denied" }
  | { readonly kind: "empty"; readonly storeId?: string | undefined }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly catalog: PartnerCatalog };
