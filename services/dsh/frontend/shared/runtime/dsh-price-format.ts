/**
 * dsh-price-format.ts
 * Central DSH price formatting utilities.
 *
 * Authority: DSH shared — display-only, no financial logic.
 * WLT owns financial calculations; this owns the display format for DSH surfaces.
 *
 * NOTE: WLT uses formatWltYer(minorUnits) for WLT amounts (minor units ÷ 100).
 *       This module handles DSH cart/product prices in major units.
 */

/**
 * Formats a price in major units for display in DSH app surfaces.
 * Defaults to YER currency with Arabic-preferred format.
 *
 * @param majorUnits - Price in major units (e.g. 12.5 = 12.5 YER)
 * @param currency - ISO currency code, defaults to 'YER'
 */
export function formatDshPrice(majorUnits: number, currency = 'YER'): string {
  try {
    const formatted = new Intl.NumberFormat('ar-YE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(majorUnits);
    const symbol = currency === 'YER' ? 'ر.ي' : currency;
    return `${formatted} ${symbol}`;
  } catch {
    const symbol = currency === 'YER' ? 'ر.ي' : currency;
    return `${majorUnits} ${symbol}`;
  }
}

/**
 * Formats a price from minor units (e.g. WLT values) for DSH cart display.
 * Converts minor → major then formats.
 *
 * @param minorUnits - Price in minor units (e.g. 1250 = 12.50 YER)
 * @param currency - ISO currency code, defaults to 'YER'
 */
function formatDshPriceMinorUnits(minorUnits: number, currency = 'YER'): string {
  return formatDshPrice(minorUnits / 100, currency);
}
