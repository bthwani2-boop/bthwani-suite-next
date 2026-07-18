// AUTO-GENERATED CONTRACT SURFACE.
// Source: services/dsh/contracts/dsh.catalog.openapi.yaml
// Do not hand-edit domain rules here; regenerate from the sovereign contract.

export interface paths {
  "/dsh/operator/catalog/domains": {
    get: operations["listCatalogDomains"];
    post: operations["createCatalogDomain"];
  };
  "/dsh/operator/catalog/domains/{domainId}": {
    patch: operations["updateCatalogDomain"];
  };
  "/dsh/operator/catalog/nodes": {
    get: operations["listCatalogNodes"];
    post: operations["createCatalogNode"];
  };
  "/dsh/operator/catalog/nodes/{nodeId}": {
    patch: operations["updateCatalogNode"];
  };
  "/dsh/operator/catalog/master-products": {
    get: operations["listMasterProductsOperator"];
    post: operations["createMasterProduct"];
  };
  "/dsh/operator/catalog/master-products/{productId}": {
    patch: operations["updateMasterProduct"];
  };
  "/dsh/operator/catalog/product-proposals": {
    get: operations["listProductProposals"];
  };
  "/dsh/operator/catalog/product-proposals/{proposalId}/decision": {
    post: operations["decideProductProposal"];
  };
  "/dsh/operator/catalog/product-proposals/{proposalId}/transition": {
    post: operations["transitionProductProposal"];
  };
  "/dsh/operator/catalog/platform-policies": {
    get: operations["listCatalogPlatformPolicies"];
  };
  "/dsh/operator/catalog/platform-policies/{policyId}": {
    put: operations["updateCatalogPlatformPolicy"];
    patch: operations["patchCatalogPlatformPolicy"];
  };
  "/dsh/operator/stores/{storeId}/assortment": {
    get: operations["getOperatorStoreAssortment"];
  };
  "/dsh/operator/stores/{storeId}/assortment/{masterProductId}": {
    put: operations["upsertOperatorStoreAssortment"];
  };
  "/dsh/partner/catalog/taxonomy": {
    get: operations["getPartnerCatalogTaxonomy"];
  };
  "/dsh/partner/catalog/master-products": {
    get: operations["listPartnerMasterProducts"];
  };
  "/dsh/partner/catalog/product-proposals": {
    post: operations["createPartnerProductProposal"];
  };
  "/dsh/partner/catalog/product-proposals/{proposalId}": {
    patch: operations["updatePartnerProductProposal"];
  };
  "/dsh/partner/stores/{storeId}/assortment": {
    get: operations["getPartnerStoreAssortment"];
  };
  "/dsh/partner/stores/{storeId}/assortment/{masterProductId}": {
    put: operations["upsertPartnerStoreAssortment"];
  };
  "/dsh/field/catalog/taxonomy": {
    get: operations["getFieldCatalogTaxonomy"];
  };
  "/dsh/field/catalog/master-products": {
    get: operations["listFieldMasterProducts"];
  };
  "/dsh/field/partners/{partnerId}/catalog/product-proposals": {
    post: operations["createFieldProductProposal"];
  };
  "/dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}": {
    patch: operations["updateFieldProductProposal"];
  };
  "/dsh/field/partners/{partnerId}/assortment": {
    get: operations["fieldGetStoreAssortment"];
  };
  "/dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}": {
    put: operations["fieldUpsertStoreAssortment"];
  };
  "/dsh/operator/catalog/assets": {
    get: operations["listCatalogAssets"];
  };
  "/dsh/operator/catalog/assets/{assetId}": {
    patch: operations["updateCatalogAsset"];
  };
  "/dsh/operator/catalog/assets/{assetId}/review": {
    post: operations["reviewCatalogAsset"];
  };
}

export interface components {
  schemas: {
    PositiveVersion: number;
    ErrorResponse: { code: string; message: string };
    ConflictResponse: {
      code: "CONFLICT";
      message: string;
      entityId: string;
      expectedVersion?: number | null;
      currentVersion: number;
    };
    Domain: VersionedEntity & {
      slug: string;
      nameAr: string;
      nameEn: string;
      icon: string;
      sortOrder: number;
      isActive: boolean;
      isClientVisible: boolean;
      requiresProductCatalog: boolean;
      isManualRequest: boolean;
    };
    CreateDomainRequest: Omit<components["schemas"]["Domain"], "id" | "version">;
    UpdateDomainRequest: Partial<Omit<components["schemas"]["CreateDomainRequest"], "slug">> & ExpectedVersion;
    Node: VersionedEntity & {
      domainId: string;
      parentId?: string | null;
      level: string;
      slug: string;
      nameAr: string;
      nameEn: string;
      icon: string;
      sortOrder: number;
      isActive: boolean;
      isClientVisible: boolean;
      requiresBarcode: boolean;
      allowsProductProposal: boolean;
      allowsStoreProductCustomImage: boolean;
      requiresCatalogReview: boolean;
      requiresProductCatalog: boolean;
    };
    CreateNodeRequest: Omit<components["schemas"]["Node"], "id" | "version">;
    UpdateNodeRequest: Partial<Omit<components["schemas"]["CreateNodeRequest"], "domainId" | "parentId" | "level" | "slug">> & ExpectedVersion;
    MasterProduct: VersionedEntity & {
      domainId: string;
      categoryNodeId?: string | null;
      canonicalNameAr: string;
      canonicalNameEn: string;
      brand: string;
      barcode?: string | null;
      gtin?: string | null;
      sku?: string | null;
      unit: string;
      measurementType: string;
      canonicalImageObjectKey?: string | null;
      approvalStatus: "draft" | "pending_review" | "approved" | "rejected" | "archived";
      isActive: boolean;
    };
    CreateMasterProductRequest: Omit<components["schemas"]["MasterProduct"], "id" | "version">;
    UpdateMasterProductRequest: Partial<Omit<components["schemas"]["CreateMasterProductRequest"], "domainId" | "canonicalImageObjectKey">> & ExpectedVersion;
    Proposal: VersionedEntity & {
      proposedNameAr: string;
      proposedNameEn: string;
      domainId: string;
      categoryNodeId?: string | null;
      brand: string;
      barcode?: string | null;
      imageObjectKey?: string | null;
      sourceSurface: string;
      sourceActorId: string;
      sourceStoreId?: string | null;
      status: string;
      reviewNote: string;
    };
    CreateProposalRequest: {
      proposedNameAr: string;
      proposedNameEn?: string;
      domainId: string;
      categoryNodeId?: string | null;
      brand?: string;
      barcode?: string | null;
      imageObjectKey?: string | null;
      sourceSurface?: string;
    };
    UpdateProposalRequest: Partial<Omit<components["schemas"]["CreateProposalRequest"], "domainId" | "categoryNodeId" | "sourceSurface">> & ExpectedVersion;
    ProposalDecisionRequest: ExpectedVersion & {
      decision: "under_review" | "adopted" | "rejected" | "needs_fix";
      reviewNote: string;
      adoptedMasterProductId?: string | null;
    };
    ProposalTransitionRequest: ExpectedVersion & {
      nextStatus: string;
      note: string;
      adoptedMasterProductId?: string | null;
      createMasterProduct?: boolean;
    };
    Policy: VersionedEntity & Record<string, unknown>;
    UpdatePolicyRequest: ExpectedVersion & {
      platformCommissionRate?: number;
      fieldPartnerOnboardingCommissionAmount?: number;
      fieldPartnerOnboardingCommissionCurrency?: string;
      storeOnboardingFeeAmount?: number;
      storeOnboardingFeeCurrency?: string;
      allowsStoreProductCustomImage?: boolean;
      allowsProductProposal?: boolean;
      requiresBarcode?: boolean;
      requiresCatalogReview?: boolean;
      requiresMarketingReview?: boolean;
      requiresProductImage?: boolean;
      requiresCategoryImage?: boolean;
      requiresDescription?: boolean;
      requiresBrand?: boolean;
      requiresUnit?: boolean;
      productDataQualityMinimumScore?: number;
      maxGalleryImages?: number;
      manualRequestMode?: boolean;
      isActive?: boolean;
      effectiveFrom?: string;
      notes?: string;
    };
    Assortment: VersionedEntity & {
      storeId: string;
      masterProductId: string;
      unitPrice: number;
      currency: string;
      available: boolean;
      stockStatus: "in_stock" | "low_stock" | "out_of_stock";
      localNote: string;
      customImageObjectKey?: string | null;
      publicationStatus: string;
    };
    UpsertAssortmentRequest: {
      expectedVersion?: number;
      unitPrice: number;
      currency: string;
      available: boolean;
      stockStatus: "in_stock" | "low_stock" | "out_of_stock";
      localNote: string;
      customImageObjectKey: string | null;
      publicationStatus: string;
    };
    Asset: VersionedEntity & Record<string, unknown>;
    UpdateAssetRequest: ExpectedVersion & {
      altAr?: string;
      altEn?: string;
      dominantColor?: string | null;
    };
    ReviewAssetRequest: ExpectedVersion & {
      decision: "approved" | "rejected";
      reviewNote?: string;
    };
  };
}

interface VersionedEntity {
  id: string;
  version: number;
}
interface ExpectedVersion {
  expectedVersion: number;
}

type JsonResponse<T, Status extends number = 200> = {
  content: { "application/json": T };
  headers: Record<string, unknown>;
  status: Status;
};
type ErrorResponses = {
  400?: JsonResponse<components["schemas"]["ErrorResponse"], 400>;
  401?: JsonResponse<components["schemas"]["ErrorResponse"], 401>;
  403?: JsonResponse<components["schemas"]["ErrorResponse"], 403>;
  404?: JsonResponse<components["schemas"]["ErrorResponse"], 404>;
  409?: JsonResponse<components["schemas"]["ConflictResponse"], 409>;
  422?: JsonResponse<components["schemas"]["ErrorResponse"], 422>;
};

type MutationOperation<Body, Result, Params = Record<string, never>> = {
  parameters: { path: Params; query?: never; header?: never; cookie?: never };
  requestBody: { content: { "application/json": Body } };
  responses: { 200: JsonResponse<Result> } & ErrorResponses;
};

export interface operations {
  listCatalogDomains: { responses: { 200: JsonResponse<{ domains: components["schemas"]["Domain"][] }> } & ErrorResponses };
  createCatalogDomain: MutationOperation<components["schemas"]["CreateDomainRequest"], { domain: components["schemas"]["Domain"] }>;
  updateCatalogDomain: MutationOperation<components["schemas"]["UpdateDomainRequest"], { domain: components["schemas"]["Domain"] }, { domainId: string }>;
  listCatalogNodes: { parameters: { query?: { domainId?: string; parentId?: string } }; responses: { 200: JsonResponse<{ nodes: components["schemas"]["Node"][] }> } & ErrorResponses };
  createCatalogNode: MutationOperation<components["schemas"]["CreateNodeRequest"], { node: components["schemas"]["Node"] }>;
  updateCatalogNode: MutationOperation<components["schemas"]["UpdateNodeRequest"], { node: components["schemas"]["Node"] }, { nodeId: string }>;
  listMasterProductsOperator: { responses: { 200: JsonResponse<{ masterProducts: components["schemas"]["MasterProduct"][]; total: number; limit: number; offset: number }> } & ErrorResponses };
  createMasterProduct: MutationOperation<components["schemas"]["CreateMasterProductRequest"], { masterProduct: components["schemas"]["MasterProduct"] }>;
  updateMasterProduct: MutationOperation<components["schemas"]["UpdateMasterProductRequest"], { masterProduct: components["schemas"]["MasterProduct"] }, { productId: string }>;
  listProductProposals: { responses: { 200: JsonResponse<{ proposals: components["schemas"]["Proposal"][]; total: number; limit: number; offset: number }> } & ErrorResponses };
  decideProductProposal: MutationOperation<components["schemas"]["ProposalDecisionRequest"], { proposal: components["schemas"]["Proposal"] }, { proposalId: string }>;
  transitionProductProposal: MutationOperation<components["schemas"]["ProposalTransitionRequest"], { proposal: components["schemas"]["Proposal"] }, { proposalId: string }>;
  listCatalogPlatformPolicies: { responses: { 200: JsonResponse<{ policies: components["schemas"]["Policy"][] }> } & ErrorResponses };
  updateCatalogPlatformPolicy: MutationOperation<components["schemas"]["UpdatePolicyRequest"], { policy: components["schemas"]["Policy"] }, { policyId: string }>;
  patchCatalogPlatformPolicy: operations["updateCatalogPlatformPolicy"];
  getOperatorStoreAssortment: { responses: { 200: JsonResponse<{ assortment: components["schemas"]["Assortment"][] }> } & ErrorResponses };
  upsertOperatorStoreAssortment: MutationOperation<components["schemas"]["UpsertAssortmentRequest"], { assortment: components["schemas"]["Assortment"] }, { storeId: string; masterProductId: string }>;
  getPartnerCatalogTaxonomy: { responses: { 200: JsonResponse<{ domains: components["schemas"]["Domain"][]; nodes: components["schemas"]["Node"][] }> } & ErrorResponses };
  listPartnerMasterProducts: { responses: { 200: JsonResponse<{ masterProducts: components["schemas"]["MasterProduct"][] }> } & ErrorResponses };
  createPartnerProductProposal: MutationOperation<components["schemas"]["CreateProposalRequest"], { proposal: components["schemas"]["Proposal"] }>;
  updatePartnerProductProposal: MutationOperation<components["schemas"]["UpdateProposalRequest"], { proposal: components["schemas"]["Proposal"] }, { proposalId: string }>;
  getPartnerStoreAssortment: { responses: { 200: JsonResponse<{ assortment: components["schemas"]["Assortment"][] }> } & ErrorResponses };
  upsertPartnerStoreAssortment: operations["upsertOperatorStoreAssortment"];
  getFieldCatalogTaxonomy: operations["getPartnerCatalogTaxonomy"];
  listFieldMasterProducts: operations["listPartnerMasterProducts"];
  createFieldProductProposal: MutationOperation<components["schemas"]["CreateProposalRequest"], { proposal: components["schemas"]["Proposal"] }, { partnerId: string }>;
  updateFieldProductProposal: MutationOperation<components["schemas"]["UpdateProposalRequest"], { proposal: components["schemas"]["Proposal"] }, { partnerId: string; proposalId: string }>;
  fieldGetStoreAssortment: { responses: { 200: JsonResponse<{ storeId: string; assortment: components["schemas"]["Assortment"][] }> } & ErrorResponses };
  fieldUpsertStoreAssortment: MutationOperation<components["schemas"]["UpsertAssortmentRequest"], { assortment: components["schemas"]["Assortment"] }, { partnerId: string; storeId: string; masterProductId: string }>;
  listCatalogAssets: { responses: { 200: JsonResponse<{ assets: components["schemas"]["Asset"][]; total: number; limit: number; offset: number }> } & ErrorResponses };
  updateCatalogAsset: MutationOperation<components["schemas"]["UpdateAssetRequest"], { asset: components["schemas"]["Asset"] }, { assetId: string }>;
  reviewCatalogAsset: MutationOperation<components["schemas"]["ReviewAssetRequest"], { asset: components["schemas"]["Asset"] }, { assetId: string }>;
}
