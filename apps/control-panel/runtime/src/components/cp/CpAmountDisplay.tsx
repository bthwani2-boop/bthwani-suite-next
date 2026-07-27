import { amountToArabicText, useI18n } from "@bthwani/ui-kit";
import { useCpTokens } from "./cpTokens";

/**
 * CpAmountDisplay — renders a monetary amount using the shared ui-kit
 * `amountToArabicText` formatter. Ensures consistent amount display
 * across the control-panel, driven by the shared design system.
 */
export function CpAmountDisplay({
  amountMinorUnits,
  currencyCode = "SAR",
  locale = "ar",
}: {
  readonly amountMinorUnits: number;
  readonly currencyCode?: string;
  readonly locale?: "ar" | "en";
}) {
  const { t } = useI18n();
  const { styles } = useCpTokens();
  const formatted = amountToArabicText(amountMinorUnits, t);
  return (
    <span
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={styles.amountDisplay}
      aria-label={`${amountMinorUnits / 100} ${currencyCode}`}
    >
      {formatted}
    </span>
  );
}
