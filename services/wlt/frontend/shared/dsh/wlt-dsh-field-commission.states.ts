import type { WltDshFieldCommissionReference } from "./wlt-dsh-field-commission.types";

export type WltFieldCommissionState =
  | { readonly kind: "not_available" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "loaded"; readonly reference: WltDshFieldCommissionReference };
