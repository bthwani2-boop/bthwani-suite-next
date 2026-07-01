// Partner Store Activation — shared brain public barrel.
// Surfaces import ONLY from this file, never from internal subpaths.

export type { DshPartnerActivationStatus, DshPartnerActivationStateMetadata, DshPartnerReadinessCheckItem } from "./partner-activation.model";
export {
  DSH_PARTNER_ACTIVATION_STATES,
  getDshPartnerActivationStateMetadata,
  isDshPartnerClientVisible,
  isDshPartnerActivationComplete,
  getDshPartnerActivationProgress,
  getDshPartnerActivationStatusLabel,
  getDshPartnerReadinessChecklist,
} from "./partner-activation.model";

export type {
  DshPartner, DshPartnerSummary, DshPartnerDocument, DshPartnerFieldVisit, DshPartnerReadiness,
  DshPartnerAuditEvent, DshPartnerStore,
  DshCreatePartnerInput, DshUpdatePartnerRequest, DshPartnerTransitionInput,
  DshAddDocumentInput, DshReviewDocumentInput, DshCreatePartnerFieldVisitRequest,
  DshPartnerListResponse,
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
export * from "./partner-registry";
export * from "./use-partners-controller";

export {
  fieldCreateDraft,
  fieldGetPartner,
  fieldUpdatePartner,
  fieldUploadDocument,
  fieldCreateVisit,
  fieldSubmitPartner,
  fetchListFieldVisits,
} from "./partner.api";
export type { DshPartnerReadinessItem, DshPartnerDocumentType } from "./partner.types";
export { REQUIRED_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "./partner.types";
