import { getUiKitCommon } from "@bthwani/ui-kit";

/**
 * CpCommonLabels — exposes the ui-kit i18n common labels for the given locale.
 * Ensures the control-panel uses the same shared label strings as the apps.
 */
export function getCpCommonLabels(locale: "ar" | "en" = "ar") {
  return getUiKitCommon(locale);
}
