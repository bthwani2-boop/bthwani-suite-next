import type { MasterProduct } from "./central-catalog.types";

export interface QualityReport {
  readonly score: number; // 0 to 100
  readonly warnings: readonly string[];
}

export function auditProductQuality(p: MasterProduct): QualityReport {
  const warnings: string[] = [];
  let score = 100;

  if (!p.barcode) {
    score -= 20;
    warnings.push("الباركود مفقود");
  }
  if (!p.canonicalImageObjectKey) {
    score -= 30;
    warnings.push("الصورة المركزية مفقودة");
  }
  if (!p.brand) {
    score -= 15;
    warnings.push("العلامة التجارية مفقودة");
  }
  if (!p.canonicalNameEn) {
    score -= 10;
    warnings.push("الاسم بالإنجليزية مفقود");
  }
  if (!p.categoryNodeId) {
    score -= 25;
    warnings.push("المنتج غير مصنف تحت تصنيف فرعي");
  }

  return {
    score: Math.max(0, score),
    warnings,
  };
}
