const DEFAULT_FINANCE_LOCALE = "ar-YE";

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

export function resolveWltCurrencyFractionDigits(currency: string): number {
  const normalizedCurrency = normalizeCurrency(currency);
  if (!normalizedCurrency) return 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
    }).resolvedOptions().maximumFractionDigits ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Formats WLT minor-unit amounts using the ISO fraction digits owned by the
 * currency itself. Financial surfaces must consume this function rather than
 * assuming that every currency has two decimal places.
 */
export function formatWltMoney(
  minorUnits: number,
  currency: string,
  locale = DEFAULT_FINANCE_LOCALE,
): string {
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedMinorUnits = Number.isFinite(minorUnits) ? Math.trunc(minorUnits) : 0;

  if (!normalizedCurrency) {
    return normalizedMinorUnits.toLocaleString(locale);
  }

  const fractionDigits = resolveWltCurrencyFractionDigits(normalizedCurrency);
  const majorUnits = normalizedMinorUnits / (10 ** fractionDigits);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(majorUnits);
  } catch {
    return `${majorUnits.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })} ${normalizedCurrency}`;
  }
}
