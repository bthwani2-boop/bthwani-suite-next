const LOCALE = "ar-YE";

export function formatDate(value: string | number | Date, style: "short" | "long" = "short"): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(LOCALE, style === "long" ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short" });
}

export function formatDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const datePart = date.toLocaleDateString(LOCALE, { day: "numeric", month: "long" });
  const timePart = date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
  return `${datePart} — ${timePart}`;
}

const CURRENCY_LABEL: Record<string, string> = {
  YER: "ر.ي",
  SAR: "ر.س",
  USD: "$",
};

/**
 * Formats a minor-unit integer amount (e.g. fils/halalas) as a grouped,
 * locale-formatted currency string. Replaces every screen's hand-rolled
 * `(amount / 100).toFixed(2)` string concatenation.
 */
export function formatCurrency(minorUnits: number, currency: string): string {
  const major = minorUnits / 100;
  const grouped = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(major);
  const label = CURRENCY_LABEL[currency] ?? currency;
  return `${grouped} ${label}`;
}
