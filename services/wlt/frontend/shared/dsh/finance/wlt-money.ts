const DEFAULT_FINANCE_LOCALE = "ar-YE";

export type WltMoneyErrorCode =
  | "INVALID_CURRENCY"
  | "INVALID_AMOUNT"
  | "FRACTION_DIGITS_EXCEEDED"
  | "UNSAFE_AMOUNT";

export class WltMoneyError extends Error {
  readonly code: WltMoneyErrorCode;

  constructor(code: WltMoneyErrorCode, message: string) {
    super(message);
    this.name = "WltMoneyError";
    this.code = code;
  }
}

export type ParseWltMajorInputResult =
  | { readonly ok: true; readonly minorUnits: number }
  | { readonly ok: false; readonly code: WltMoneyErrorCode };

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new WltMoneyError("INVALID_CURRENCY", "currency must be a three-letter ISO 4217 code");
  }
  return normalized;
}

function requireSafeMinorUnits(minorUnits: number): number {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new WltMoneyError("UNSAFE_AMOUNT", "minorUnits must be a safe integer");
  }
  return minorUnits;
}

export function resolveWltCurrencyFractionDigits(currency: string): number {
  const normalizedCurrency = normalizeCurrency(currency);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
    }).resolvedOptions().maximumFractionDigits ?? 0;
  } catch {
    throw new WltMoneyError("INVALID_CURRENCY", `unsupported ISO 4217 currency: ${normalizedCurrency}`);
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
  const normalizedMinorUnits = requireSafeMinorUnits(minorUnits);

  const fractionDigits = resolveWltCurrencyFractionDigits(normalizedCurrency);
  const majorUnits = normalizedMinorUnits / (10 ** fractionDigits);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(majorUnits);
}

export function minorUnitsToWltMajorInput(minorUnits: number, currency: string): string {
  const normalizedMinorUnits = requireSafeMinorUnits(minorUnits);
  const fractionDigits = resolveWltCurrencyFractionDigits(currency);
  const sign = normalizedMinorUnits < 0 ? "-" : "";
  const absoluteDigits = Math.abs(normalizedMinorUnits).toString().padStart(fractionDigits + 1, "0");
  if (fractionDigits === 0) return `${sign}${absoluteDigits}`;
  const splitAt = absoluteDigits.length - fractionDigits;
  return `${sign}${absoluteDigits.slice(0, splitAt)}.${absoluteDigits.slice(splitAt)}`;
}

export function parseWltMajorInputToMinorUnits(
  input: string,
  currency: string,
): ParseWltMajorInputResult {
  let fractionDigits: number;
  try {
    fractionDigits = resolveWltCurrencyFractionDigits(currency);
  } catch (error) {
    if (error instanceof WltMoneyError) return { ok: false, code: error.code };
    return { ok: false, code: "INVALID_CURRENCY" };
  }

  const normalized = input.trim();
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return { ok: false, code: "INVALID_AMOUNT" };
  const fraction = match[3] ?? "";
  if (fraction.length > fractionDigits) {
    return { ok: false, code: "FRACTION_DIGITS_EXCEEDED" };
  }

  const whole = match[2]!.replace(/^0+(?=\d)/, "");
  const paddedFraction = fraction.padEnd(fractionDigits, "0");
  const unsignedDigits = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  let minorUnitsBigInt: bigint;
  try {
    minorUnitsBigInt = BigInt(unsignedDigits || "0");
  } catch {
    return { ok: false, code: "INVALID_AMOUNT" };
  }
  if (match[1] === "-" && minorUnitsBigInt !== 0n) minorUnitsBigInt = -minorUnitsBigInt;
  if (
    minorUnitsBigInt > BigInt(Number.MAX_SAFE_INTEGER)
    || minorUnitsBigInt < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return { ok: false, code: "UNSAFE_AMOUNT" };
  }
  return { ok: true, minorUnits: Number(minorUnitsBigInt) };
}
