// Store-catalog submission workflow types (media intents, audit submissions).
// Client-facing product/category view models live in client-catalog.types.ts.

export type MediaUploadIntent = {
  readonly mediaId: string;
  readonly uploadUrl: string;
  readonly objectKey: string;
  readonly expiresAt: string;
};

export type CatalogMedia = {
  readonly id: string;
  readonly state: "pending" | "complete" | "deleted";
  readonly publicUrl: string | null;
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

export type CatalogSubmissionState =
  | { readonly kind: "loading" }
  | { readonly kind: "permission_denied" }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly submissions: readonly CatalogSubmission[] };
