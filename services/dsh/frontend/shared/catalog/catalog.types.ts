export type CatalogCategory = {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly version: number;
};

export type CatalogMedia = {
  readonly id: string;
  readonly productId: string | null;
  readonly objectKey: string;
  readonly contentType: string;
  readonly state: "pending" | "complete" | "deleted";
  readonly publicUrl: string | null;
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
  readonly isActive: boolean;
  readonly version: number;
  readonly media: readonly CatalogMedia[];
};

export type PartnerCatalog = {
  readonly storeId: string;
  readonly categories: readonly CatalogCategory[];
  readonly products: readonly CatalogProduct[];
};

export type CatalogSubmission = {
  readonly id: string;
  readonly storeId: string;
  readonly revision: number;
  readonly status: "submitted" | "approved" | "rejected";
  readonly submittedBy: string;
  readonly reviewReason: string;
  readonly createdAt: string;
};

export type CatalogState =
  | { readonly kind: "loading" }
  | { readonly kind: "permission_denied" }
  | { readonly kind: "empty"; readonly storeId?: string }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly catalog: PartnerCatalog };

export type CatalogSubmissionState =
  | { readonly kind: "loading" }
  | { readonly kind: "permission_denied" }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly submissions: readonly CatalogSubmission[] };
