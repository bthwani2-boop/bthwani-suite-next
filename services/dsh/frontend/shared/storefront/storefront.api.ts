import type { components } from "../../../clients/generated/dsh-api";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshPublicHttpClient } from "../_kernel/dsh-http-request";
import type { DshStoreDetailDto } from "../store/store-discovery.types";
import type { DshStoreDetailViewModel } from "../store/store-discovery.view-model";
import { toDetailViewModel } from "../store/store-discovery.view-model";
import type { CatalogCategory, CatalogProduct, ClientStoreCatalog } from "../catalog/client-catalog.types";
import type { CatalogMedia } from "../catalog/catalog.types";

type GeneratedDshStorefrontResponse = components["schemas"]["DshStorefrontResponse"];

/**
 * The generated aggregate omits the operational-context overlay. The DSH
 * storefront endpoint returns the same governed detail projection as the
 * store-detail endpoints, so keep that overlay typed at this boundary instead
 * of weakening the whole adapter with `any` casts.
 */
export type DshStorefrontResponse = Omit<GeneratedDshStorefrontResponse, "store"> & {
  readonly store: DshStoreDetailDto;
};

export type ClientStorefront = {
  readonly versionToken: string;
  readonly store: DshStoreDetailViewModel;
  readonly catalog: ClientStoreCatalog;
};

const baseUrl = resolveDshApiBaseUrl();
const { request: publicRequest } = createDshPublicHttpClient(baseUrl);

export async function fetchStorefront(storeId: string): Promise<ClientStorefront> {
  const response = await publicRequest<DshStorefrontResponse>(`/dsh/storefront/${encodeURIComponent(storeId)}`);
  return toClientStorefront(storeId, response);
}

function toClientStorefront(storeId: string, response: DshStorefrontResponse): ClientStorefront {
  const store = toDetailViewModel(response.store);
  const rawCatalog = response.catalog;
  const usedNodeIds = new Set(rawCatalog.products.flatMap((product) => (
    product.categoryNodeId ? [product.categoryNodeId] : []
  )));
  const usedDomainIds = new Set(rawCatalog.products.flatMap((product) => (
    product.categoryNodeId ? [] : [product.domainId]
  )));

  const nodeCategories: CatalogCategory[] = rawCatalog.nodes
    .filter((node) => usedNodeIds.has(node.id))
    .map((node) => ({
      id: node.id,
      storeId,
      name: node.nameAr,
      description: node.slug,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      version: node.version,
    }));

  const domainCategories: CatalogCategory[] = rawCatalog.domains
    .filter((domain) => usedDomainIds.has(domain.id))
    .map((domain) => ({
      id: domain.id,
      storeId,
      name: domain.nameAr,
      description: domain.slug,
      sortOrder: domain.sortOrder,
      isActive: domain.isActive,
      version: domain.version,
    }));

  const categories = [...nodeCategories, ...domainCategories].sort((a, b) => a.sortOrder - b.sortOrder);

  const products: CatalogProduct[] = rawCatalog.products.map((product) => {
    const media: CatalogMedia[] = product.effectiveImage
      ? [{
          state: "complete",
          publicUrl: product.effectiveImage.url.startsWith("http")
            ? product.effectiveImage.url
            : `${baseUrl}${product.effectiveImage.url}`,
        }]
      : [];

    return {
      id: product.id,
      storeId,
      categoryId: product.categoryNodeId ?? product.domainId,
      name: product.canonicalNameAr,
      description: product.brand || "",
      sku: product.sku || "",
      priceReference: String(product.unitPrice),
      currency: product.currency,
      unitLabel: product.unit,
      stockStatus: product.stockStatus,
      isActive: product.isActive,
      version: product.version,
      media,
    };
  });

  return {
    versionToken: response.versionToken || "",
    store,
    catalog: { storeId, categories, products },
  };
}
