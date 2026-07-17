import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { CatalogMedia } from "./catalog.types";
import type { CatalogCategory, CatalogProduct, CatalogState, ClientStoreCatalog } from "./client-catalog.types";
import { resolveCatalogError } from "./catalog.controller-core";
import { resolvePublishedCatalogState } from "./catalog.view-model";
import { fetchPublishedCentralCatalog } from "./central-catalog.api";

const baseUrl = resolveDshApiBaseUrl();

export async function fetchPublishedCatalog(storeId: string): Promise<CatalogState> {
  try {
    const response = await fetchPublishedCentralCatalog(storeId);
    const usedNodeIds = new Set(response.products.flatMap((product) => product.categoryNodeId ? [product.categoryNodeId] : []));
    const usedDomainIds = new Set(response.products.flatMap((product) => product.categoryNodeId ? [] : [product.domainId]));
    const nodeCategories: CatalogCategory[] = response.nodes
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
    const domainCategories: CatalogCategory[] = response.domains
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
    const products: CatalogProduct[] = response.products.map((product) => {
      // Use server-resolved effectiveImage (DAM-gated, review-approved).
      // Priority: store-assortment partner_custom > master-product canonical > null.
      // Never reconstruct URLs from objectKey; never use /dsh/media?mediaRef= fallback.
      const effectiveMediaLink = product.effectiveImage
        ? response.media.find((link) => link.publicUrl === product.effectiveImage?.url)
        : undefined;
      const media: CatalogMedia[] = product.effectiveImage
        ? [{
            id: effectiveMediaLink?.id ?? `${product.id}-effective`,
            productId: product.id,
            objectKey: effectiveMediaLink?.objectKey ?? "",
            contentType: effectiveMediaLink?.mimeType ?? "image/webp",
            state: "complete",
            publicUrl: product.effectiveImage.url.startsWith("http")
              ? product.effectiveImage.url
              : `${baseUrl}${product.effectiveImage.url}`,
            version: effectiveMediaLink?.version ?? product.version,
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
        unitLabel: product.unit,
        stockStatus: product.stockStatus as CatalogProduct["stockStatus"],
        isActive: product.isActive,
        version: product.version,
        media,
      };
    });
    const catalog: ClientStoreCatalog = { storeId, categories, products };
    return resolvePublishedCatalogState(catalog);
  } catch (error) {
    return resolveCatalogError(error);
  }
}
