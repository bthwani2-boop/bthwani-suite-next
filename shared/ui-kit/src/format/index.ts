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
