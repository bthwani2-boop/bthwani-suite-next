// Partner Onboarding & Store Publication — shared brain public barrel.
// Surfaces import ONLY from this file, never from internal subpaths.

export type { DshPartnerActivationStatus, DshPartnerActivationStateMetadata, DshPartnerReadinessCheckItem, DshPartnerDecisionCommand, DshPartnerDecisionCommandId } from "./partner-activation.model";
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
  DshPartnerAuditEvent, DshPartnerLinkedStore, DshFieldPartnerStoreDraft, DshFieldPartnerStoreDraftInput,
  DshCreatePartnerInput, DshUpdatePartnerRequest, DshPartnerTransitionInput,
  DshAddDocumentInput, DshReviewDocumentInput, DshCreatePartnerFieldVisitRequest,
  DshPartnerListResponse, DshFieldPartnerProduct, DshFieldPartnerProductInput,
} from "./partner.types";

export type {
  DshPartnerListState, DshPartnerDetailState, DshPartnerMutationState,
  DshPartnerDocumentsState, DshPartnerReadinessState,
  DshPartnerAuditState, DshPartnerStoresState, DshPartnerVisitsState,
} from "./partner.states";

export type { DshPartnerListRowViewModel, DshPartnerDetailViewModel, DshPartnerReadinessViewModel, DshPartnerBankAccountViewModel } from "./partner.view-model";
export { buildPartnerListRowViewModel, buildPartnerDetailViewModel, buildPartnerReadinessViewModel } from "./partner.view-model";

export type { DshPartnerListFilters } from "./use-partner-admin-controller";
export {
  usePartnerAdminController,
  usePartnerDetailController,
  usePartnerDocumentsController,
  usePartnerReadinessController,
  usePartnerAuditController,
  usePartnerStoresController,
  usePartnerVisitsController,
} from "./use-partner-admin-controller";

export { usePartnerSelfController } from "./use-partner-self-controller";
export { useFieldPartnerProgressController } from "./use-field-partner-progress-controller";
export type { FieldPartnerProgressState } from "./use-field-partner-progress-controller";
export { useFieldPartnerProductsController } from "./use-field-partner-products-controller";
export type { FieldPartnerProductsState } from "./use-field-partner-products-controller";
export * from "./partner-registry";
export * from "./use-partners-controller";

export {
  fieldListDrafts,
  fieldCreateDraft,
  fieldGetPartner,
  fieldUpdatePartner,
  fieldUploadDocument,
  fieldCreateVisit,
  fieldSubmitPartner,
  fieldGetReadiness,
  fieldListDocuments,
  fieldListFieldVisits,
  fieldGetPartnerStore,
  fieldUpdatePartnerStore,
  fieldListPartnerProducts,
  fieldCreatePartnerProduct,
  fieldUpdatePartnerProduct,
} from "./partner.api";
export type { DshPartnerReadinessItem, DshPartnerDocumentType } from "./partner.types";
export { REQUIRED_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "./partner.types";
export * from "./partner.workflow";
export * from "./catalog-approval.api";
