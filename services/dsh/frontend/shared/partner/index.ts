// DSH-015: Partner Store Activation — shared brain public barrel.
// Surfaces import ONLY from this file, never from internal subpaths.

export type { DshPartnerActivationStatus, DshPartnerActivationStateMetadata, DshPartnerReadinessCheckItem } from "./partner-activation.model";
export {
  DSH_PARTNER_ACTIVATION_STATES,
  getDshPartnerActivationStateMetadata,
  isDshPartnerClientVisible,
  isDshPartnerActivationComplete,
  getDshPartnerActivationStatusLabel,
  getDshPartnerReadinessChecklist,
} from "./partner-activation.model";

export type {
  DshPartner, DshPartnerDocument, DshPartnerReadiness,
  DshPartnerAuditEvent, DshPartnerStore,
  DshCreatePartnerInput, DshPartnerTransitionInput,
  DshAddDocumentInput, DshReviewDocumentInput,
} from "./partner.types";

export type {
  DshPartnerListState, DshPartnerDetailState, DshPartnerMutationState,
  DshPartnerDocumentsState, DshPartnerReadinessState,
  DshPartnerAuditState, DshPartnerStoresState,
} from "./partner.states";

export type { DshPartnerListRowViewModel, DshPartnerDetailViewModel, DshPartnerReadinessViewModel } from "./partner.view-model";
export { buildPartnerListRowViewModel, buildPartnerDetailViewModel, buildPartnerReadinessViewModel } from "./partner.view-model";

export type { DshPartnerListFilters } from "./use-partner-admin-controller";
export {
  usePartnerAdminController,
  usePartnerDetailController,
  usePartnerDocumentsController,
  usePartnerReadinessController,
  usePartnerAuditController,
  usePartnerStoresController,
} from "./use-partner-admin-controller";

export { usePartnerSelfController } from "./use-partner-self-controller";

export { submitFieldPartnerIntake } from "./partner.api";
