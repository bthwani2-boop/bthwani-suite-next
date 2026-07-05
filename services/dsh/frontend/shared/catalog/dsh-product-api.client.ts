// Typed client for DSH product identity API.
// Covers: POST /stores/{store_id}/products, PATCH /products/{id},
//         GET /stores/{store_id}/products, GET /products/{id}
// No UI. No React. Pure types + factory.
// Authority: app-partner submits product identity; control-panel owns approval.
// WLT boundary: price is a label only — no financial mutation inside DSH.

export type DshProductApprovalStatus =
  | 'field_draft'
  | 'partner_submitted'
  | 'partner_review'
  | 'partner_approved'
  | 'marketing_review'
  | 'marketing_approved'
  | 'catalog_adopted'
  | 'client_visible'
  | 'needs_fix'
  | 'rejected';

export type DshProductMediaRecord = {
  readonly id: string;
  readonly product_id: string;
  readonly media_key: string;
  readonly url: string;
  readonly created_at: string;
};

export type DshUploadProductMediaRequest = {
  readonly product_id: string;
  readonly media_key: string;
};

export type DshProductRecord = {
  readonly id: string;
  readonly store_id: string;
  readonly name: string;
  readonly sku?: string;
  readonly gtin?: string;
  readonly barcode?: string;
  readonly description?: string;
  readonly base_price_label: string;
  readonly category_id?: string;
  readonly approval_status: DshProductApprovalStatus;
  readonly media?: readonly DshProductMediaRecord[];
  readonly price_override?: string | undefined;
  readonly stock_override?: number | undefined;
  readonly available_override?: boolean;
  readonly created_at: string;
  readonly updated_at: string;
};

export type DshCreateProductRequest = {
  readonly name: string;
  readonly sku?: string;
  readonly gtin?: string;
  readonly barcode?: string;
  readonly description?: string;
  readonly base_price_label: string;
  readonly category_id?: string;
};

export type DshUpdateProductRequest = {
  readonly name?: string;
  readonly sku?: string;
  readonly gtin?: string;
  readonly barcode?: string;
  readonly description?: string;
  readonly base_price_label?: string | undefined;
  readonly category_id?: string;
};

export type DshListProductsResponse = {
  readonly products: readonly DshProductRecord[];
  readonly pagination: {
    readonly limit: number;
    readonly offset: number;
    readonly total: number;
  };
};

// ─── J-002 / DSH-JOURNEY-002B: Category Structure ─────────────────────────────

export type DshCategoryRecord = {
  readonly id: string;
  readonly store_id: string;
  readonly parent_id?: string;
  readonly name: string;
  readonly description?: string;
  readonly created_at: string;
  readonly updated_at: string;
};

export type DshCreateCategoryRequest = {
  readonly parent_id?: string | undefined;
  readonly name: string;
  readonly description?: string | undefined;
};

export type DshUpdateCategoryRequest = {
  readonly parent_id?: string | undefined;
  readonly name?: string;
  readonly description?: string | undefined;
};

export type DshListCategoriesResponse = {
  readonly categories: readonly DshCategoryRecord[];
  readonly pagination: {
    readonly limit: number;
    readonly offset: number;
    readonly total: number;
  };
};

// ─── J-002 / DSH-JOURNEY-002D: Partner Local Overrides ────────────────────────

export type DshCatalogOverrideInput = {
  readonly product_id: string;
  readonly price_override?: string | undefined;
  readonly stock_override?: number | undefined;
  readonly available_override?: boolean;
};

export type DshUpdateCatalogOverridesRequest = {
  readonly overrides: readonly DshCatalogOverrideInput[];
};

export type DshCatalogOverrideRecord = {
  readonly store_id: string;
  readonly product_id: string;
  readonly price_override?: string | undefined;
  readonly stock_override?: number | undefined;
  readonly available_override?: boolean;
  readonly updated_at: string;
};

export type DshUpdateCatalogOverridesResponse = {
  readonly store_id: string;
  readonly updated_count: number;
  readonly overrides: readonly DshCatalogOverrideRecord[];
};

// ─── J-002 / DSH-JOURNEY-002E: Approval Workflow ──────────────────────────────

export type DshUpdateCatalogApprovalRequest = {
  readonly item_id: string;
  readonly action: 'approve' | 'reject' | 'needs-fix';
  readonly note?: string;
};

export type DshCatalogApprovalRecord = {
  readonly id: string;
  readonly item_id: string;
  readonly action: string;
  readonly note?: string;
  readonly operator_id: string;
  readonly created_at: string;
};

// ─── J-002 / DSH-JOURNEY-002G: Catalog Conflict Audit ─────────────────────────

export type DshCatalogConflict = {
  readonly id: string;
  readonly store_id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly conflict_type: 'price_divergence' | 'availability_divergence';
  readonly central_value: string;
  readonly override_value: string;
  readonly status: 'pending' | 'resolved_accept_local' | 'resolved_reverted';
  readonly resolved_at?: string;
  readonly created_at: string;
};

export type DshResolveConflictRequest = {
  readonly resolution: 'accept_local' | 'revert_to_central';
};

export type DshResolveConflictResponse = {
  readonly conflict_id: string;
  readonly status: 'resolved_accept_local' | 'resolved_reverted';
};

export type DshListConflictsResponse = {
  readonly conflicts: readonly DshCatalogConflict[];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

// ─── Transport contract ────────────────────────────────────────────────────────

export type DshProductApiTransport = {
  post(path: string, body: unknown): Promise<any>;
  patch(path: string, body: unknown): Promise<any>;
  get(path: string): Promise<unknown>;
  delete(path: string): Promise<void>;
};

// ─── Client contract ──────────────────────────────────────────────────────────

export type DshProductApiClient = {
  createProduct(
    storeId: string,
    req: DshCreateProductRequest,
  ): Promise<DshProductRecord>;

  updateProduct(
    productId: string,
    req: DshUpdateProductRequest,
  ): Promise<DshProductRecord>;

  getProduct(productId: string): Promise<DshProductRecord>;

  listProducts(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DshListProductsResponse>;

  listAllProducts(options?: {
    approvalStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<DshListProductsResponse>;

  createCategory(
    storeId: string,
    req: DshCreateCategoryRequest,
  ): Promise<DshCategoryRecord>;

  updateCategory(
    categoryId: string,
    req: DshUpdateCategoryRequest,
  ): Promise<DshCategoryRecord>;

  getCategory(categoryId: string): Promise<DshCategoryRecord>;

  listCategories(
    storeId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<DshListCategoriesResponse>;

  deleteCategory(categoryId: string): Promise<void>;

  uploadProductMedia(req: DshUploadProductMediaRequest): Promise<DshProductMediaRecord>;
  deleteProductMedia(mediaId: string): Promise<void>;
  updateCatalogOverrides(
    storeId: string,
    req: DshUpdateCatalogOverridesRequest,
  ): Promise<DshUpdateCatalogOverridesResponse>;
  updateCatalogApproval(
    req: DshUpdateCatalogApprovalRequest,
  ): Promise<DshCatalogApprovalRecord>;
  listConflicts(options?: {
    storeId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<DshListConflictsResponse>;
  resolveConflict(
    conflictId: string,
    req: DshResolveConflictRequest,
  ): Promise<DshResolveConflictResponse>;
};

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createDshProductApiClient(
  transport: DshProductApiTransport,
): DshProductApiClient {
  return {
    createProduct: (storeId, req) =>
      transport.post(`/stores/${storeId}/products`, req),

    updateProduct: (productId, req) =>
      transport.patch(`/products/${productId}`, req),

    getProduct: (productId) =>
      transport.get(`/products/${productId}`) as Promise<DshProductRecord>,

    listProducts: (storeId, options = {}) => {
      const params = new URLSearchParams();
      if (options.limit !== undefined) params.set('limit', String(options.limit));
      if (options.offset !== undefined) params.set('offset', String(options.offset));
      const qs = params.toString();
      const path = qs ? `/stores/${storeId}/products?${qs}` : `/stores/${storeId}/products`;
      return transport.get(path) as Promise<DshListProductsResponse>;
    },

    listAllProducts: (options = {}) => {
      const params = new URLSearchParams();
      if (options.approvalStatus !== undefined) params.set('approval_status', options.approvalStatus);
      if (options.limit !== undefined) params.set('limit', String(options.limit));
      if (options.offset !== undefined) params.set('offset', String(options.offset));
      const qs = params.toString();
      const path = qs ? `/products?${qs}` : '/products';
      return transport.get(path) as Promise<DshListProductsResponse>;
    },

    createCategory: (storeId, req) =>
      transport.post(`/stores/${storeId}/categories`, req),

    updateCategory: (categoryId, req) =>
      transport.patch(`/categories/${categoryId}`, req),

    getCategory: (categoryId) =>
      transport.get(`/categories/${categoryId}`) as Promise<DshCategoryRecord>,

    listCategories: (storeId, options = {}) => {
      const params = new URLSearchParams();
      if (options.limit !== undefined) params.set('limit', String(options.limit));
      if (options.offset !== undefined) params.set('offset', String(options.offset));
      const qs = params.toString();
      const path = qs ? `/stores/${storeId}/categories?${qs}` : `/stores/${storeId}/categories`;
      return transport.get(path) as Promise<DshListCategoriesResponse>;
    },

    deleteCategory: (categoryId) =>
      transport.delete(`/categories/${categoryId}`),

    uploadProductMedia: (req) =>
      transport.post('/media', req),

    deleteProductMedia: (mediaId) =>
      transport.delete(`/media/${mediaId}`),

    updateCatalogOverrides: (storeId, req) =>
      transport.patch(`/stores/${storeId}/catalog-overrides`, req),

    updateCatalogApproval: (req) =>
      transport.post('/catalog-approvals', req),

    listConflicts: (options = {}) => {
      const params = new URLSearchParams();
      if (options.storeId !== undefined) params.set('store_id', options.storeId);
      if (options.status !== undefined) params.set('status', options.status);
      if (options.limit !== undefined) params.set('limit', String(options.limit));
      if (options.offset !== undefined) params.set('offset', String(options.offset));
      const qs = params.toString();
      const path = qs ? `/catalog-conflicts?${qs}` : '/catalog-conflicts';
      return transport.get(path) as Promise<DshListConflictsResponse>;
    },

    resolveConflict: (conflictId, req) =>
      transport.post(`/catalog-conflicts/${conflictId}/resolve`, req),
  };
}

// ─── Approval Status Presentation Helpers ────────────────────────────────────
// Alias used by some UI screens (ProductEditScreen scaffold)
export type DshProductIdentityApprovalStatus = DshProductApprovalStatus;

const APPROVAL_STATUS_LABELS: Record<DshProductApprovalStatus, string> = {
  field_draft: 'مسودة',
  partner_submitted: 'بانتظار المراجعة',
  partner_review: 'مراجعة الشريك',
  partner_approved: 'موافقة الشريك',
  marketing_review: 'مراجعة التسويق',
  marketing_approved: 'موافقة التسويق',
  catalog_adopted: 'معتمد من الكتالوج',
  client_visible: 'ظاهر للعملاء',
  needs_fix: 'يحتاج تصحيح',
  rejected: 'مرفوض',
};

export function getDshProductApprovalStatusLabel(
  status: DshProductApprovalStatus | string | undefined,
): string {
  if (!status) return '—';
  return APPROVAL_STATUS_LABELS[status as DshProductApprovalStatus] ?? status;
}

export function getDshProductApprovalStatusTone(
  status: DshProductApprovalStatus | string | undefined,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (!status) return 'neutral';
  if (status === 'client_visible' || status === 'catalog_adopted') return 'success';
  if (status === 'rejected' || status === 'needs_fix') return 'danger';
  if (status.includes('review')) return 'warning';
  if (status.includes('approved')) return 'info';
  return 'neutral';
}
