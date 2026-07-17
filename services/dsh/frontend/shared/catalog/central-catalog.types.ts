export interface CentralCatalogDomain {
  readonly id: string;
  readonly version: number;
  readonly slug: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly icon: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly isClientVisible: boolean;
  readonly requiresProductCatalog: boolean;
  readonly isManualRequest: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CentralCatalogNode {
  readonly id: string;
  readonly version: number;
  readonly domainId: string;
  readonly parentId: string | null;
  readonly level: "BUSINESS_SUBDOMAIN" | "PRODUCT_MAIN_CLASS" | "PRODUCT_SUB_CLASS";
  readonly slug: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly icon: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly isClientVisible: boolean;
  readonly requiresBarcode: boolean;
  readonly allowsProductProposal: boolean;
  readonly allowsStoreProductCustomImage: boolean;
  readonly requiresCatalogReview: boolean;
  readonly requiresProductCatalog: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MasterProduct {
  readonly id: string;
  readonly version: number;
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly canonicalNameAr: string;
  readonly canonicalNameEn: string;
  readonly brand: string;
  readonly barcode: string | null;
  readonly gtin: string | null;
  readonly sku: string | null;
  readonly unit: string;
  readonly measurementType: string;
  /** @deprecated Use DAM asset links instead */
  readonly canonicalImageObjectKey: string | null;
  readonly approvalStatus: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  readonly isActive: boolean;
  readonly duplicateGroupId: string | null;
  readonly createdSource: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** PATCH input for sovereign master products. Store price/stock fields belong to StoreAssortment. */
export interface MasterProductPatchInput {
  readonly categoryNodeId?: string | null;
  readonly canonicalNameAr?: string;
  readonly canonicalNameEn?: string;
  readonly brand?: string;
  readonly barcode?: string | null;
  readonly gtin?: string | null;
  readonly sku?: string | null;
  readonly unit?: string;
  readonly measurementType?: string;
  readonly approvalStatus?: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  readonly isActive?: boolean;
  readonly expectedVersion?: number;
}

/** PATCH input for catalog domains - all fields optional except caller-supplied OCC when updating. */
export interface DomainPatchInput {
  readonly nameAr?: string;
  readonly nameEn?: string;
  readonly icon?: string;
  readonly sortOrder?: number;
  readonly isActive?: boolean;
  readonly isClientVisible?: boolean;
  readonly requiresProductCatalog?: boolean;
  readonly isManualRequest?: boolean;
  readonly expectedVersion?: number;
}

/** PATCH input for catalog nodes - hierarchy identity is immutable after creation. */
export interface NodePatchInput {
  readonly nameAr?: string;
  readonly nameEn?: string;
  readonly icon?: string;
  readonly sortOrder?: number;
  readonly isActive?: boolean;
  readonly isClientVisible?: boolean;
  readonly requiresBarcode?: boolean;
  readonly allowsProductProposal?: boolean;
  readonly allowsStoreProductCustomImage?: boolean;
  readonly requiresCatalogReview?: boolean;
  readonly requiresProductCatalog?: boolean;
  readonly expectedVersion?: number;
}

/** PUT/PATCH input for platform policies. */
export interface CatalogPolicyUpdateInput {
  readonly isActive?: boolean;
  readonly requiresMarketingReview?: boolean;
  readonly requiresProductImage?: boolean;
  readonly requiresCategoryImage?: boolean;
  readonly requiresDescription?: boolean;
  readonly requiresBrand?: boolean;
  readonly requiresUnit?: boolean;
  readonly productDataQualityMinimumScore?: number;
  readonly maxGalleryImages?: number;
  readonly manualRequestMode?: boolean;
  readonly allowsStoreProductCustomImage?: boolean;
}

import type { ProductProposalPipelineStatus } from "./central-catalog-product-pipeline";

export interface ProductProposal {
  readonly id: string;
  readonly version: number;
  readonly proposedNameAr: string;
  readonly proposedNameEn: string;
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly brand: string;
  readonly barcode: string | null;
  readonly imageObjectKey: string | null;
  readonly sourceSurface: "app-field" | "app-partner" | "control-panel-catalog" | "control-panel-platform";
  readonly sourceActorId: string;
  readonly sourceStoreId: string | null;
  readonly status: ProductProposalPipelineStatus;
  readonly reviewNote: string;
  readonly adoptedMasterProductId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewStage?: string;
  readonly partnerReviewedBy?: string | null;
  readonly marketingReviewedBy?: string | null;
  readonly catalogAdoptedBy?: string | null;
  readonly catalogApprovedBy?: string | null;
  readonly clientVisibleAt?: string | null;
  readonly auditRequired?: boolean;
  readonly blockedReason?: string | null;
  readonly resubmissionCount?: number;
  readonly linkedStoreId?: string | null;
}

export interface StoreAssortment {
  readonly id: string;
  readonly version: number;
  readonly storeId: string;
  readonly masterProductId: string;
  readonly unitPrice: number;
  readonly currency: string;
  readonly available: boolean;
  readonly stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  readonly localNote: string;
  readonly customImageObjectKey: string | null;
  readonly publicationStatus: "draft" | "submitted" | "approved" | "client_visible" | "rejected" | "hidden";
  readonly submittedBy: string;
  readonly approvedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CatalogPlatformPolicy {
  readonly id: string;
  readonly version: number;
  readonly domainId: string | null;
  readonly nodeId: string | null;
  readonly policyScope: string;
  readonly platformCommissionRate: number;
  readonly fieldPartnerOnboardingCommissionAmount: number;
  readonly fieldPartnerOnboardingCommissionCurrency: string;
  readonly storeOnboardingFeeAmount: number;
  readonly storeOnboardingFeeCurrency: string;
  readonly allowsStoreProductCustomImage: boolean;
  readonly allowsProductProposal: boolean;
  readonly requiresBarcode: boolean;
  readonly requiresCatalogReview: boolean;
  readonly requiresProductImage: boolean;
  readonly requiresCategoryImage: boolean;
  readonly requiresMarketingReview: boolean;
  readonly requiresDescription: boolean;
  readonly requiresBrand: boolean;
  readonly requiresUnit: boolean;
  readonly productDataQualityMinimumScore: number;
  readonly maxGalleryImages: number;
  readonly manualRequestMode: boolean;
  readonly isActive: boolean;
  readonly effectiveFrom: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** DAM-resolved effective image for a catalog product or entity. */
export interface EffectiveImage {
  readonly url: string;
  readonly altAr: string;
  readonly source: "store_custom" | "canonical";
}

export interface ClientVisibleCatalogEntry {
  readonly id: string;
  readonly version: number;
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly canonicalNameAr: string;
  readonly canonicalNameEn: string;
  readonly brand: string;
  readonly barcode: string | null;
  readonly gtin: string | null;
  readonly sku: string | null;
  readonly unit: string;
  readonly measurementType: string;
  /** @deprecated Use effectiveImage instead */
  readonly canonicalImageObjectKey: string | null;
  readonly approvalStatus: string;
  readonly isActive: boolean;
  readonly duplicateGroupId: string | null;
  readonly createdSource: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly unitPrice: number;
  readonly currency: string;
  readonly stockStatus: string;
  /** @deprecated Use effectiveImage instead */
  readonly imageObjectKey: string;
  /** DAM-resolved effective image. Null when no approved image exists. */
  readonly effectiveImage: EffectiveImage | null;
}

export interface ClientVisibleCatalogResponse {
  readonly domains: readonly CentralCatalogDomain[];
  readonly nodes: readonly CentralCatalogNode[];
  readonly products: readonly ClientVisibleCatalogEntry[];
  readonly media: readonly CatalogAssetLinkWithAsset[];
  readonly policySnapshot: readonly CatalogPlatformPolicy[];
}

export interface CatalogAsset {
  readonly id: string;
  readonly version: number;
  readonly objectKey: string;
  readonly publicUrl: string | null;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly checksumSha256: string | null;
  readonly altAr: string;
  readonly altEn: string;
  readonly dominantColor: string | null;
  readonly status: "draft" | "uploaded" | "pending_review" | "approved" | "rejected" | "archived";
  readonly sourceSurface: "control-panel-catalog" | "control-panel-platform" | "app-partner" | "app-field" | "system";
  readonly uploadedBy: string;
  readonly reviewedBy: string | null;
  readonly reviewNote: string;
  readonly intendedEntityType: string | null;
  readonly intendedEntityId: string | null;
  readonly intendedRole: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CatalogAssetStatus = CatalogAsset["status"];

export interface CatalogAssetLink {
  readonly id: string;
  readonly version: number;
  readonly assetId: string;
  readonly entityType: "domain" | "node" | "master_product" | "product_proposal" | "store_assortment" | "collection" | "campaign" | "store";
  readonly entityId: string;
  readonly role:
    | "icon"
    | "cover"
    | "thumbnail"
    | "gallery"
    | "canonical_product_image"
    | "partner_custom_product_image"
    | "marketing_banner"
    | "document"
    | "store_logo"
    | "store_cover"
    | "storefront_photo"
    | "interior_photo"
    | "signage_photo"
    | "reel_video";
  readonly sortOrder: number;
  readonly isPrimary: boolean;
  readonly status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CatalogAssetLinkWithAsset extends CatalogAssetLink {
  readonly objectKey: string;
  readonly publicUrl: string;
  readonly altAr: string;
  readonly altEn: string;
  readonly mimeType: string;
}

/** Upload intent creation input. sourceSurface is derived from actor role on the server. */
export interface AssetUploadIntentInput {
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly altAr?: string;
  readonly altEn?: string;
  readonly intendedEntityType?: string;
  readonly intendedEntityId?: string;
  readonly intendedRole?: string;
}

/** Asset PATCH input - only alt text and dominantColor may be updated. */
export interface AssetUpdateInput {
  readonly altAr?: string;
  readonly altEn?: string;
  readonly dominantColor?: string;
}

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

/** Reel entity - partner-submitted video for the home reel carousel. */
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

/** Public reel data returned by /dsh/public/reels. */
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
