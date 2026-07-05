import type { WltDshCodReference } from "./wlt-dsh-boundary.types";

export type WltCaptainCodState =
  | { readonly kind: "not_available" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "loaded"; readonly records: WltDshCodReference[] };
