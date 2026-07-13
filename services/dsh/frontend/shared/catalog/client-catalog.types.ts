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
  readonly originalPriceReference?: string | undefined;
  readonly discountPercent?: number | undefined;
  readonly unitLabel?: string | undefined;
  readonly stockStatus?: "in_stock" | "low_stock" | "out_of_stock" | undefined;
  readonly isActive: boolean;
  readonly version: number;
  readonly media: readonly CatalogMedia[];
};

export type ClientStoreCatalog = {
  readonly storeId: string;
  readonly categories: readonly CatalogCategory[];
  readonly products: readonly CatalogProduct[];
};

export type CatalogState =
  | { readonly kind: "loading" }
  | { readonly kind: "permission_denied" }
  | { readonly kind: "empty"; readonly storeId?: string | undefined }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly catalog: ClientStoreCatalog };
