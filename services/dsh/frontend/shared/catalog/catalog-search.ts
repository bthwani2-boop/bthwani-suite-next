import type { MasterProduct } from "./central-catalog.types";

export function filterMasterProducts(
  products: readonly MasterProduct[],
  query: string,
  filters?: {
    readonly domainId?: string;
    readonly categoryNodeId?: string;
    readonly approvalStatus?: string;
  },
): readonly MasterProduct[] {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    // 1. Query match
    if (q) {
      const matchNameAr = p.canonicalNameAr.toLowerCase().includes(q);
      const matchNameEn = (p.canonicalNameEn || "").toLowerCase().includes(q);
      const matchBarcode = (p.barcode || "").toLowerCase() === q;
      const matchBrand = p.brand.toLowerCase().includes(q);
      if (!matchNameAr && !matchNameEn && !matchBarcode && !matchBrand) {
        return false;
      }
    }

    // 2. Status match
    if (filters?.approvalStatus && p.approvalStatus !== filters.approvalStatus) {
      return false;
    }

    // 3. Domain match
    if (filters?.domainId && p.domainId !== filters.domainId) {
      return false;
    }

    // 4. Node match
    if (filters?.categoryNodeId && p.categoryNodeId !== filters.categoryNodeId) {
      return false;
    }

    return true;
  });
}
