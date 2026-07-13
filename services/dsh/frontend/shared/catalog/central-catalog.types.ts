export interface CentralCatalogDomain {
  readonly id: string;
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
  readonly canonicalImageObjectKey: string | null;
  readonly approvalStatus: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  readonly isActive: boolean;
  readonly duplicateGroupId: string | null;
  readonly createdSource: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

import type { ProductProposalPipelineStatus } from "./central-catalog-product-pipeline";

export interface ProductProposal {
  readonly id: string;
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
  readonly isActive: boolean;
  readonly effectiveFrom: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClientVisibleCatalogEntry {
  readonly id: string;
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
  readonly imageObjectKey: string;
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
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CatalogAssetLink {
  readonly id: string;
  readonly assetId: string;
  readonly entityType: "domain" | "node" | "master_product" | "product_proposal" | "store_assortment" | "collection" | "campaign" | "store";
  readonly entityId: string;
  readonly role: "icon" | "cover" | "thumbnail" | "gallery" | "canonical_product_image" | "partner_custom_product_image" | "marketing_banner" | "document"
    | "store_logo" | "store_cover" | "storefront_photo" | "interior_photo" | "signage_photo";
  readonly sortOrder: number;
  readonly isPrimary: boolean;
  readonly status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Returned by client-facing surfaces (e.g. GET /dsh/stores/{storeId}/catalog)
// where the link alone isn't enough to render an image -- the backend joins
// in the asset's object key, a ready-to-use relative publicUrl (prefix with
// the surface's own API base URL), alt text, and mime type.
export interface CatalogAssetLinkWithAsset extends CatalogAssetLink {
  readonly objectKey: string;
  readonly publicUrl: string;
  readonly altAr: string;
  readonly altEn: string;
  readonly mimeType: string;
}
