const PARTNER_CATEGORY_LABELS: Record<string, string> = {
  grocery: "بقالة",
  restaurant: "مطعم",
  pharmacy: "صيدلية",
  bakery: "مخبز",
  cafe: "مقهى",
  supermarket: "سوبرماركت",
};

export function formatFieldPartnerCategory(category: string | null | undefined): string {
  const normalized = category?.trim().toLowerCase();
  return (normalized && PARTNER_CATEGORY_LABELS[normalized]) || "متجر";
}
