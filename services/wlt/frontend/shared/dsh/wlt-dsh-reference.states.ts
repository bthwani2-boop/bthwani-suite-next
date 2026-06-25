import type { WltDshReferenceContext } from "./wlt-dsh-boundary.types";

export type WltDshReferenceState =
  | { readonly kind: "not_available" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly reference: WltDshReferenceContext }
  | { readonly kind: "error"; readonly message: string };
