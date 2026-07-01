// Field partner progress controller — read-only lifecycle overview for a partner
// draft the field agent owns. Aggregates partner detail + readiness + documents +
// field visits from the field-scoped (ownership-checked) endpoints only.
import { useCallback, useEffect, useState } from "react";
import { fieldGetPartner, fieldGetReadiness, fieldListDocuments, fieldListFieldVisits } from "./partner.api";
import type { DshPartner, DshPartnerReadiness, DshPartnerDocument, DshPartnerFieldVisit } from "./partner.types";
import { buildPartnerReadinessViewModel } from "./partner.view-model";
import { getDshPartnerActivationStatusLabel, isDshPartnerClientVisible } from "./partner-activation.model";

export type FieldPartnerProgressState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "success";
      readonly partner: DshPartner;
      readonly readiness: DshPartnerReadiness;
      readonly documents: readonly DshPartnerDocument[];
      readonly fieldVisits: readonly DshPartnerFieldVisit[];
    }
  | { readonly kind: "forbidden" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly message: string };

export function useFieldPartnerProgressController(partnerId: string) {
  const [state, setState] = useState<FieldPartnerProgressState>({ kind: "idle" });

  const load = useCallback(async () => {
    if (!partnerId) return;
    setState({ kind: "loading" });
    try {
      const [partner, readiness, documentsRes, visitsRes] = await Promise.all([
        fieldGetPartner(partnerId),
        fieldGetReadiness(partnerId),
        fieldListDocuments(partnerId),
        fieldListFieldVisits(partnerId),
      ]);
      setState({
        kind: "success",
        partner,
        readiness,
        documents: documentsRes.documents,
        fieldVisits: visitsRes.visits,
      });
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 403) setState({ kind: "forbidden" });
      else if (e?.status === 404) setState({ kind: "not_found" });
      else setState({ kind: "error", message: "تعذر تحميل تقدم ملف الشريك" });
    }
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const readinessViewModel = state.kind === "success" ? buildPartnerReadinessViewModel(state.readiness) : null;
  const statusLabel = state.kind === "success" ? getDshPartnerActivationStatusLabel(state.partner.activationStatus) : "";
  const isClientVisible = state.kind === "success" ? isDshPartnerClientVisible(state.partner.activationStatus) : false;

  return { state, readinessViewModel, statusLabel, isClientVisible, reload: load };
}
