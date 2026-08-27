import type { components } from "../../../clients/generated/dsh-api";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshPublicHttpClient } from "../_kernel/dsh-http-request";
import type { DshStoreDetailViewModel } from "../store/store-discovery.view-model";
import { toDetailViewModel } from "../store/store-discovery.view-model";
import type { CatalogCategory, CatalogProduct, ClientStoreCatalog } from "../catalog/client-catalog.types";
import type { CatalogMedia } from "../catalog/catalog.types";

export type DshStorefrontResponse = components["schemas"]["DshStorefrontResponse"];

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
  const storeRaw = response.store as any;
  const store = toDetailViewModel(storeRaw);

  const rawCatalog = response.catalog as any;
  const usedNodeIds = new Set(rawCatalog.products.flatMap((p: any) => p.categoryNodeId ? [p.categoryNodeId] : []));
  const usedDomainIds = new Set(rawCatalog.products.flatMap((p: any) => p.categoryNodeId ? [] : [p.domainId]));

  const nodeCategories: CatalogCategory[] = rawCatalog.nodes
    ?.filter((node: any) => usedNodeIds.has(node.id))
    .map((node: any) => ({
      id: node.id,
      storeId,
      name: node.nameAr,
      description: node.slug,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      version: node.version,
    })) || [];

  const domainCategories: CatalogCategory[] = rawCatalog.domains
    ?.filter((domain: any) => usedDomainIds.has(domain.id))
    .map((domain: any) => ({
      id: domain.id,
      storeId,
      name: domain.nameAr,
      description: domain.slug,
      sortOrder: domain.sortOrder,
      isActive: domain.isActive,
      version: domain.version,
    })) || [];

  const categories = [...nodeCategories, ...domainCategories].sort((a, b) => a.sortOrder - b.sortOrder);

  const products: CatalogProduct[] = rawCatalog.products?.map((product: any) => {
    const effectiveMediaLink = product.effectiveImage
      ? rawCatalog.media?.find((link: any) => link.publicUrl === product.effectiveImage?.url)
      : undefined;
    const media: CatalogMedia[] = product.effectiveImage
      ? [{
          id: effectiveMediaLink?.id ?? `${product.id}-effective`,
          productId: product.id,
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
  }) || [];

  return {
    versionToken: response.versionToken || "",
    store,
    catalog: { storeId, categories, products },
  };
}
