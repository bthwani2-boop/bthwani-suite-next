export const CATALOG_ERRORS_MAP: Record<string, string> = {
  NOT_FOUND: "العنصر المطلوب غير موجود بالكتالوج المركزي",
  INVALID_REQUEST: "المدخلات غير صالحة، يرجى التحقق من الحقول الإجبارية",
  FORBIDDEN: "الإجراء مرفوض بناءً على سياسة المنصة والكتالوج",
  CONFLICT: "حدث تعارض في البيانات؛ قد يكون العنصر موجوداً بالفعل",
  BARCODE_REQUIRED_FOR_CATEGORY: "الباركود مطلوب إجبارياً لهذه الفئة",
  PRODUCT_PROPOSAL_NOT_ALLOWED_FOR_CATEGORY: "غير مسموح باقتراح منتجات جديدة لهذه الفئة حالياً",
  CUSTOM_IMAGE_NOT_ALLOWED_FOR_CATEGORY: "سياسة هذه الفئة لا تسمح برفع صور مخصصة من الشركاء",
  PRODUCT_IMAGE_REQUIRED: "صورة المنتج مطلوبة للموافقة على النشر للعملاء",
  BRAND_REQUIRED_FOR_CATEGORY: "العلامة التجارية مطلوبة إجبارياً لهذه الفئة",
  INTERNAL_ERROR: "فشلت العملية، يرجى المحاولة لاحقاً",
};

export function getLocalizedCatalogError(errorKey: string | undefined): string {
  if (!errorKey) return "حدث خطأ غير معروف";
  return CATALOG_ERRORS_MAP[errorKey] ?? `خطأ: ${errorKey}`;
}
