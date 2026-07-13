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
        version: 1,
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
        version: 1,
      }));
    const categories = [...nodeCategories, ...domainCategories].sort((a, b) => a.sortOrder - b.sortOrder);
    const products: CatalogProduct[] = response.products.map((product) => {
      // Prefer the DAM-resolved image (real, review-gated, MinIO-backed
      // asset) and only fall back to the legacy COALESCE'd object key when
      // no approved canonical_product_image link exists yet for this
      // product -- see governance/catalog centralization closure plan.
      const damLink = response.media.find(
        (link) => link.entityType === "master_product" && link.entityId === product.id && link.role === "canonical_product_image",
      );
      const media: CatalogMedia[] = damLink
        ? [{
            id: damLink.assetId,
            productId: product.id,
            objectKey: damLink.objectKey,
            contentType: damLink.mimeType || "image/webp",
            state: "complete",
            publicUrl: `${baseUrl}${damLink.publicUrl}`,
            version: 1,
          }]
        : product.imageObjectKey
          ? [{
              id: `${product.id}-media`,
              productId: product.id,
              objectKey: product.imageObjectKey,
              contentType: "image/webp",
              state: "complete",
              publicUrl: product.imageObjectKey.startsWith("http") ? product.imageObjectKey : `${baseUrl}/dsh/media?mediaRef=${encodeURIComponent(product.imageObjectKey)}`,
              version: 1,
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
        version: 1,
        media,
      };
    });
    const catalog: ClientStoreCatalog = { storeId, categories, products };
    return resolvePublishedCatalogState(catalog);
  } catch (error) {
    return resolveCatalogError(error);
  }
}
