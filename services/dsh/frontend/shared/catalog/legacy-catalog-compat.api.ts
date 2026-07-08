// LEGACY COMPATIBILITY ONLY — not sovereign catalog truth.
// fetchPublishedCatalog/fetchPartnerCatalog reshape sovereign central-catalog data
// (via fetchPublishedCentralCatalog) into the store-local PartnerCatalog shape that
// app-client / legacy submission screens still consume. New surfaces should read the
// sovereign central-catalog API/types directly instead of adding consumers here.
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { CatalogMedia } from "./catalog.types";
import type { CatalogCategory, CatalogProduct, CatalogState, PartnerCatalog } from "./legacy-catalog-compat.types";
import { resolveCatalogError } from "./catalog.controller-core";
import { resolvePartnerCatalogState, resolvePublishedCatalogState } from "./catalog.view-model";
import { fetchPublishedCentralCatalog } from "./central-catalog.api";

const baseUrl = resolveDshApiBaseUrl();
const { request } = createDshHttpClient(baseUrl, "catalog-corr");

export async function fetchPublishedCatalog(storeId: string): Promise<CatalogState> {
  try {
    const response = await fetchPublishedCentralCatalog(storeId);
    const categories: CatalogCategory[] = response.domains.map((d) => ({
      id: d.id,
      storeId: storeId,
      name: d.nameAr,
      description: d.slug,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
      version: 1,
    }));
    const products: CatalogProduct[] = response.products.map((p) => ({
      id: p.id,
      storeId: storeId,
      categoryId: p.domainId,
      name: p.canonicalNameAr,
      description: p.brand || "",
      sku: p.sku || "",
      priceReference: String(p.unitPrice),
      isActive: p.isActive,
      version: 1,
      media: p.imageObjectKey ? [{
        id: p.id + "-media",
        productId: p.id,
        objectKey: p.imageObjectKey,
        contentType: "image/webp",
        state: "complete",
        publicUrl: p.imageObjectKey.startsWith("http") ? p.imageObjectKey : `${baseUrl}/dsh/media?key=${encodeURIComponent(p.imageObjectKey)}`,
        version: 1,
      } satisfies CatalogMedia] : [],
    }));
    const catalog: PartnerCatalog = { storeId, categories, products };
    return resolvePublishedCatalogState(catalog);
  } catch (error) {
    return classifyCatalogError(error);
  }
}

export async function fetchPartnerCatalog(): Promise<CatalogState> {
  try {
    const catalog = await request<PartnerCatalog>("/dsh/partner/catalog");
    return resolvePartnerCatalogState(catalog);
  } catch (error) {
    return classifyCatalogError(error);
  }
}

export function classifyCatalogError(error: unknown): CatalogState {
  return resolveCatalogError(error);
}
