package partner

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound                    = errors.New("partner not found")
	ErrInvalid                     = errors.New("invalid partner input")
	ErrForbidden                   = errors.New("partner action forbidden")
	ErrInvalidTransition           = errors.New("invalid partner status transition")
	ErrConflict                    = errors.New("partner conflict â€” duplicate legal identity")
	ErrVersionConflict             = errors.New("optimistic concurrency control failed â€” version mismatch")
	ErrStorePublicationGatesFailed = errors.New("store publication gates failed: linked store must be active, visible, serviceable, partner-ready, catalog approved, and marketing visible")
)

// â”€â”€â”€ Activation status (18 states) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ActivationStatus string

const (
	StatusDraft                 ActivationStatus = "draft"
	StatusSubmitted             ActivationStatus = "submitted"
	StatusFieldVisitScheduled   ActivationStatus = "field_visit_scheduled"
	StatusFieldVisitCompleted   ActivationStatus = "field_visit_completed"
	StatusDocumentsMissing      ActivationStatus = "documents_missing"
	StatusDocumentsUploaded     ActivationStatus = "documents_uploaded"
	StatusDocumentsVerified     ActivationStatus = "documents_verified"
	StatusCatalogNotReady       ActivationStatus = "catalog_not_ready"
	StatusCatalogReady          ActivationStatus = "catalog_ready"
	StatusDeliveryModesNotReady ActivationStatus = "delivery_modes_not_ready"
	StatusDeliveryModesReady    ActivationStatus = "delivery_modes_ready"
	StatusOpsReview             ActivationStatus = "ops_review"
	StatusOpsApproved           ActivationStatus = "ops_approved"
	StatusOpsRejected           ActivationStatus = "ops_rejected"
	StatusPartnerActive         ActivationStatus = "partner_active"
	StatusPartnerDeactivated    ActivationStatus = "partner_deactivated" // Legacy, kept for backwards compatibility parsing if needed
	StatusPartnerSuspended      ActivationStatus = "partner_suspended"
	StatusPartnerTerminated     ActivationStatus = "partner_terminated"
	StatusClientVisible         ActivationStatus = "client_visible"
	StatusClientHidden          ActivationStatus = "client_hidden"
)

type OnboardingCaseStatus string

const (
	OnboardingStatusDraft              OnboardingCaseStatus = "draft"
	OnboardingStatusDuplicateSuspected OnboardingCaseStatus = "duplicate_suspected"
	OnboardingStatusValidationFailed   OnboardingCaseStatus = "validation_failed"
	OnboardingStatusEvidencePending    OnboardingCaseStatus = "evidence_pending"
	OnboardingStatusUnknownResult      OnboardingCaseStatus = "unknown_result"
	OnboardingStatusSubmitted          OnboardingCaseStatus = "submitted"
)

// allowedTransitions defines the valid state machine for partner activation.
// Backend enforces these â€” no surface can bypass them.
var allowedTransitions = map[ActivationStatus][]ActivationStatus{
	StatusDraft:                 {StatusSubmitted, StatusFieldVisitScheduled},
	StatusSubmitted:             {StatusFieldVisitScheduled, StatusDocumentsMissing, StatusDocumentsUploaded},
	StatusFieldVisitScheduled:   {StatusFieldVisitCompleted, StatusDocumentsMissing},
	StatusFieldVisitCompleted:   {StatusDocumentsMissing, StatusDocumentsUploaded},
	StatusDocumentsMissing:      {StatusDocumentsUploaded},
	StatusDocumentsUploaded:     {StatusDocumentsVerified, StatusDocumentsMissing},
	StatusDocumentsVerified:     {StatusCatalogNotReady, StatusOpsReview},
	StatusCatalogNotReady:       {StatusCatalogReady, StatusOpsReview},
	StatusCatalogReady:          {StatusDeliveryModesNotReady, StatusDeliveryModesReady},
	StatusDeliveryModesNotReady: {StatusDeliveryModesReady},
	StatusDeliveryModesReady:    {StatusOpsReview},
	StatusOpsReview:             {StatusOpsApproved, StatusOpsRejected},
	StatusOpsApproved:           {StatusPartnerActive},
	StatusOpsRejected:           {StatusSubmitted, StatusDocumentsMissing},
	StatusPartnerActive:         {StatusClientVisible, StatusClientHidden, StatusPartnerSuspended, StatusPartnerTerminated},
	StatusPartnerDeactivated:    {StatusOpsReview, StatusSubmitted}, // Legacy
	StatusPartnerSuspended:      {StatusPartnerActive, StatusPartnerTerminated},
	StatusPartnerTerminated:     {}, // Terminal state
	StatusClientVisible:         {StatusClientHidden, StatusPartnerSuspended, StatusPartnerTerminated},
	StatusClientHidden:          {StatusClientVisible, StatusPartnerSuspended, StatusPartnerTerminated},
}

// IsTransitionAllowed returns true if the status change is valid.
func IsTransitionAllowed(from, to ActivationStatus) bool {
	allowed, ok := allowedTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// IsClientVisible returns true only for client_visible status.
func IsClientVisible(status ActivationStatus) bool {
	return status == StatusClientVisible
}

// â”€â”€â”€ Partner entity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Partner struct {
	ID                   string               `json:"id"`
	LegalNameAr          string               `json:"legalNameAr"`
	LegalNameEn          string               `json:"legalNameEn"`
	DisplayName          string               `json:"displayName"`
	LegalIdentityType    string               `json:"legalIdentityType"`
	LegalIdentityNumber  string               `json:"legalIdentityNumber"`
	OwnerActorID         string               `json:"ownerActorId"`
	WorkforcePersonID    string               `json:"workforcePersonId"`
	PrimaryPhone         string               `json:"primaryPhone"`
	SecondaryPhone       string               `json:"secondaryPhone"`
	Email                string               `json:"email"`
	Category             string               `json:"category"`
	ActivationStatus     ActivationStatus     `json:"activationStatus"`
	OnboardingCaseStatus OnboardingCaseStatus `json:"onboardingCaseStatus"`
	CreatedByActorID     string               `json:"createdByActorId"`
	CreatedBySurface     string               `json:"createdBySurface"`
	Notes                string               `json:"notes"`
	// Payout destination reference â€” DSH holds only the WLT reference ID and
	// masked display strings. Raw bank data is never stored in DSH after Phase 5.
	PayoutDestinationID           string    `json:"payoutDestinationId"`
	DestinationMethod             string    `json:"destinationMethod"`
	MaskedDestinationReference    string    `json:"maskedDestinationReference"`
	DestinationVerificationStatus string    `json:"destinationVerificationStatus"`
	Version                       int       `json:"version"`
	CreatedAt                     time.Time `json:"createdAt"`
	UpdatedAt                     time.Time `json:"updatedAt"`
}

type PartnerSummary struct {
	ID               string           `json:"id"`
	DisplayName      string           `json:"displayName"`
	LegalNameAr      string           `json:"legalNameAr"`
	Category         string           `json:"category"`
	ActivationStatus ActivationStatus `json:"activationStatus"`
	PrimaryPhone     string           `json:"primaryPhone"`
	CreatedAt        time.Time        `json:"createdAt"`
	UpdatedAt        time.Time        `json:"updatedAt"`
}

// â”€â”€â”€ Document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Document struct {
	ID                string    `json:"id"`
	PartnerID         string    `json:"partnerId"`
	DocumentType      string    `json:"documentType"`
	DocumentStatus    string    `json:"documentStatus"`
	UploadedByActorID string    `json:"uploadedByActorId"`
	MediaRef          string    `json:"mediaRef"`
	Notes             string    `json:"notes"`
	RejectionReason   string    `json:"rejectionReason"`
	Version           int       `json:"version"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// â”€â”€â”€ Document review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type DocumentReview struct {
	ID                string    `json:"id"`
	DocumentID        string    `json:"documentId"`
	PartnerID         string    `json:"partnerId"`
	ReviewedByActorID string    `json:"reviewedByActorId"`
	Decision          string    `json:"decision"`
	Reason            string    `json:"reason"`
	CorrelationID     string    `json:"correlationId"`
	CreatedAt         time.Time `json:"createdAt"`
}

// â”€â”€â”€ Field visit (partner-centric) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FieldVisit struct {
	ID                string     `json:"id"`
	PartnerID         string     `json:"partnerId"`
	StoreID           string     `json:"storeId"`
	FieldActorID      string     `json:"fieldActorId"`
	VisitStatus       string     `json:"visitStatus"`
	VisitNotes        string     `json:"visitNotes"`
	LocationLatitude  *float64   `json:"locationLatitude"`
	LocationLongitude *float64   `json:"locationLongitude"`
	EvidenceMediaRefs []string   `json:"evidenceMediaRefs"`
	Version           int        `json:"version"`
	CreatedAt         time.Time  `json:"createdAt"`
	SubmittedAt       *time.Time `json:"submittedAt"`
}

// â”€â”€â”€ Activation event (audit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ActivationEvent struct {
	ID            string    `json:"id"`
	PartnerID     string    `json:"partnerId"`
	FromStatus    string    `json:"fromStatus"`
	ToStatus      string    `json:"toStatus"`
	ActorID       string    `json:"actorId"`
	ActorSurface  string    `json:"actorSurface"`
	Reason        string    `json:"reason"`
	CorrelationID string    `json:"correlationId"`
	CreatedAt     time.Time `json:"createdAt"`
}

// â”€â”€â”€ Readiness checklist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ReadinessItem struct {
	ID            string `json:"id"`
	Label         string `json:"label"`
	Satisfied     bool   `json:"satisfied"`
	BlockedReason string `json:"blockedReason,omitempty"`
}

type PartnerReadiness struct {
	PartnerID                      string          `json:"partnerId"`
	CanActivate                    bool            `json:"canActivate"`
	CanActivatePartner             bool            `json:"canActivatePartner"`
	CanPublishStoreToClient        bool            `json:"canPublishStoreToClient"`
	BlockedReason                  string          `json:"blockedReason,omitempty"`
	PartnerActivationBlockedReason string          `json:"partnerActivationBlockedReason,omitempty"`
	StorePublicationBlockedReason  string          `json:"storePublicationBlockedReason,omitempty"`
	Checklist                      []ReadinessItem `json:"checklist"`
}

func ComputeReadiness(
	p Partner,
	documentCount, approvedDocCount int,
	hasStore bool,
	storePublished bool,
	storeServiceable bool,
	storePartnerReadinessReady bool,
	storeCatalogApproved bool,
	storeMarketingVisible bool,
	storeIsVisible bool,
) PartnerReadiness {
	docsDone := approvedDocCount > 0

	opsApprovedDone := p.ActivationStatus == StatusOpsApproved ||
		p.ActivationStatus == StatusPartnerActive ||
		p.ActivationStatus == StatusClientVisible ||
		p.ActivationStatus == StatusClientHidden

	partnerActiveDone := p.ActivationStatus == StatusPartnerActive ||
		p.ActivationStatus == StatusClientVisible ||
		p.ActivationStatus == StatusClientHidden

	canActivatePartner := docsDone && hasStore && IsTransitionAllowed(p.ActivationStatus, StatusPartnerActive)

	canPublishStoreToClient := hasStore &&
		storePublished &&
		storeIsVisible &&
		storeServiceable &&
		storePartnerReadinessReady &&
		storeCatalogApproved &&
		storeMarketingVisible &&
		partnerActiveDone

	partnerActivationBlockedReason := ""
	if !docsDone {
		partnerActivationBlockedReason = "ÙˆØ«Ø§Ø¦Ù‚ Ù…Ø·Ù„ÙˆØ¨Ø© ØºØ§Ø¦Ø¨Ø© Ø£Ùˆ ØºÙŠØ± Ù…Ø¹ØªÙ…Ø¯Ø©"
	} else if !hasStore {
		partnerActivationBlockedReason = "Ù„Ø§ ÙŠÙˆØ¬Ø¯ ÙØ±Ø¹ Ù…Ø±Ø¨ÙˆØ· Ø¨Ø§Ù„Ø´Ø±ÙŠÙƒ"
	} else if !canActivatePartner {
		if p.ActivationStatus != StatusPartnerActive && p.ActivationStatus != StatusClientVisible && p.ActivationStatus != StatusClientHidden {
			partnerActivationBlockedReason = "Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ù„Ø§ ØªØ³Ù…Ø­ Ø¨Ø§Ù„ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± â€” Ø£ÙƒÙ…Ù„ Ø§Ù„Ù…Ø±Ø§Ø­Ù„ Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© Ø£ÙˆÙ„Ø§Ù‹"
		}
	}

	storePublicationBlockedReason := ""
	if !hasStore {
		storePublicationBlockedReason = "Ù„Ø§ ÙŠÙˆØ¬Ø¯ ÙØ±Ø¹ Ù…Ø±Ø¨ÙˆØ· Ø¨Ø§Ù„Ø´Ø±ÙŠÙƒ"
	} else if !partnerActiveDone {
		storePublicationBlockedReason = "Ø§Ù„Ø´Ø±ÙŠÙƒ ØºÙŠØ± Ù†Ø´Ø· Ø­Ø§Ù„ÙŠØ§Ù‹"
	} else if !storePublished {
		storePublicationBlockedReason = "حالة الفرع غير منشورة"
	} else if !storeIsVisible {
		storePublicationBlockedReason = "Ø§Ù„ÙØ±Ø¹ Ù…Ø®ÙÙŠ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…"
	} else if !storeServiceable {
		storePublicationBlockedReason = "Ø§Ù„ÙØ±Ø¹ Ø®Ø§Ø±Ø¬ Ø§Ù„Ø®Ø¯Ù…Ø© Ø£Ùˆ ØºÙŠØ± Ù…ØªÙˆÙØ± Ø­Ø§Ù„ÙŠØ§Ù‹"
	} else if !storePartnerReadinessReady {
		storePublicationBlockedReason = "Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ø´Ø±ÙŠÙƒ ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø© Ù„Ù„ÙØ±Ø¹"
	} else if !storeCatalogApproved {
		storePublicationBlockedReason = "Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬ Ø§Ù„Ø®Ø§Øµ Ø¨Ø§Ù„ÙØ±Ø¹ ØºÙŠØ± Ù…Ø¹ØªÙ…Ø¯"
	} else if !storeMarketingVisible {
		storePublicationBlockedReason = "Ø§Ù„Ø¸Ù‡ÙˆØ± Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠ Ù„Ù„ÙØ±Ø¹ ØºÙŠØ± Ù…ÙØ¹Ù„"
	}

	return PartnerReadiness{
		PartnerID:                      p.ID,
		CanActivate:                    canActivatePartner,
		CanActivatePartner:             canActivatePartner,
		CanPublishStoreToClient:        canPublishStoreToClient,
		BlockedReason:                  partnerActivationBlockedReason,
		PartnerActivationBlockedReason: partnerActivationBlockedReason,
		StorePublicationBlockedReason:  storePublicationBlockedReason,
		Checklist: []ReadinessItem{
			{
				ID:            "documents",
				Label:         "Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ù…Ø¹ØªÙ…Ø¯Ø©",
				Satisfied:     docsDone,
				BlockedReason: map[bool]string{false: "Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø© Ø£Ùˆ Ù„Ù… ÙŠØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù†Ù‡Ø§"}[docsDone],
			},
			{
				ID:            "linked_store",
				Label:         "ÙØ±Ø¹ Ù…Ø±Ø¨ÙˆØ· Ø¨Ø§Ù„Ø´Ø±ÙŠÙƒ",
				Satisfied:     hasStore,
				BlockedReason: map[bool]string{false: "Ù„Ø§ ÙŠÙˆØ¬Ø¯ ÙØ±Ø¹ Ù…Ø±Ø¨ÙˆØ· Ø¨Ø§Ù„Ø´Ø±ÙŠÙƒ"}[hasStore],
			},
			{
				ID:            "ops_approved",
				Label:         "Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª",
				Satisfied:     opsApprovedDone,
				BlockedReason: map[bool]string{false: "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª"}[opsApprovedDone],
			},
			{
				ID:            "partner_active",
				Label:         "Ø§Ù„Ø´Ø±ÙŠÙƒ Ù†Ø´Ø·",
				Satisfied:     partnerActiveDone,
				BlockedReason: map[bool]string{false: "Ø§Ù„Ø´Ø±ÙŠÙƒ ØºÙŠØ± Ù†Ø´Ø·"}[partnerActiveDone],
			},
			{
				ID:            "store_status_published",
				Label:         "حالة الفرع منشورة",
				Satisfied:     storePublished,
				BlockedReason: map[bool]string{false: "حالة الفرع غير منشورة"}[storePublished],
			},
			{
				ID:            "store_serviceability",
				Label:         "ØªØºØ·ÙŠØ© Ø§Ù„Ø®Ø¯Ù…Ø© Ù„Ù„ÙØ±Ø¹",
				Satisfied:     storeServiceable,
				BlockedReason: map[bool]string{false: "Ø§Ù„ÙØ±Ø¹ ØºÙŠØ± Ù…ØºØ·Ù‰ Ø¨Ø§Ù„Ø®Ø¯Ù…Ø© Ø­Ø§Ù„ÙŠØ§Ù‹"}[storeServiceable],
			},
			{
				ID:            "partner_readiness_ready",
				Label:         "Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ø´Ø±ÙŠÙƒ Ù„Ù„ÙØ±Ø¹",
				Satisfied:     storePartnerReadinessReady,
				BlockedReason: map[bool]string{false: "Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ø´Ø±ÙŠÙƒ ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø© Ù„Ù„ÙØ±Ø¹"}[storePartnerReadinessReady],
			},
			{
				ID:            "catalog_approved",
				Label:         "ÙƒØªØ§Ù„ÙˆØ¬ Ø§Ù„ÙØ±Ø¹ Ù…Ø¹ØªÙ…Ø¯",
				Satisfied:     storeCatalogApproved,
				BlockedReason: map[bool]string{false: "ÙƒØªØ§Ù„ÙˆØ¬ Ø§Ù„ÙØ±Ø¹ ØºÙŠØ± Ù…Ø¹ØªÙ…Ø¯"}[storeCatalogApproved],
			},
			{
				ID:            "marketing_visible",
				Label:         "Ø§Ù„Ø¸Ù‡ÙˆØ± Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠ Ù„Ù„ÙØ±Ø¹",
				Satisfied:     storeMarketingVisible,
				BlockedReason: map[bool]string{false: "Ø§Ù„Ø¸Ù‡ÙˆØ± Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠ Ù„Ù„ÙØ±Ø¹ ØºÙŠØ± Ù…ÙØ¹Ù„"}[storeMarketingVisible],
			},
			{
				ID:            "is_visible",
				Label:         "Ø§Ù„ÙØ±Ø¹ Ù…Ø±Ø¦ÙŠ",
				Satisfied:     storeIsVisible,
				BlockedReason: map[bool]string{false: "Ø§Ù„ÙØ±Ø¹ Ù…Ø®ÙÙŠ"}[storeIsVisible],
			},
		},
	}
}

// â”€â”€â”€ Input types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type CreatePartnerInput struct {
	LegalNameAr         string `json:"legalNameAr"`
	LegalNameEn         string `json:"legalNameEn"`
	DisplayName         string `json:"displayName"`
	LegalIdentityType   string `json:"legalIdentityType"`
	LegalIdentityNumber string `json:"legalIdentityNumber"`
	OwnerActorID        string `json:"ownerActorId"`
	WorkforcePersonID   string `json:"workforcePersonId"`
	PrimaryPhone        string `json:"primaryPhone"`
	SecondaryPhone      string `json:"secondaryPhone"`
	Email               string `json:"email"`
	Category            string `json:"category"`
	Notes               string `json:"notes"`
	CreatedByActorID    string `json:"-"`
	CreatedBySurface    string `json:"-"`
}

func (i CreatePartnerInput) Validate() error {
	if i.LegalNameAr == "" {
		return ErrInvalid
	}
	if i.DisplayName == "" {
		return ErrInvalid
	}
	if i.PrimaryPhone == "" {
		return ErrInvalid
	}
	if i.LegalIdentityNumber == "" {
		return ErrInvalid
	}
	return nil
}

type UpdatePartnerInput struct {
	DisplayName       string `json:"displayName"`
	OwnerActorID      string `json:"ownerActorId"`
	WorkforcePersonID string `json:"workforcePersonId"`
	PrimaryPhone      string `json:"primaryPhone"`
	SecondaryPhone    string `json:"secondaryPhone"`
	Email             string `json:"email"`
	Notes             string `json:"notes"`
	// Bank account fields forwarded to WLT; never stored raw in DSH after Phase 5.
	BeneficiaryName               string `json:"beneficiaryName"`
	BankName                      string `json:"bankName"`
	BankBranch                    string `json:"bankBranch"`
	BankAccountNumber             string `json:"accountNumber"`
	BankIBAN                      string `json:"iban"`
	PayoutMobileNumber            string `json:"payoutMobileNumber"`
	SettlementPreference          string `json:"settlementPreference"`
	BankAccountHolderMatchesOwner *bool  `json:"bankAccountHolderMatchesOwner"`
	BankNotes                     string `json:"bankNotes"`
	// WLT relay fields: populated by the repository after WLT upsert.
	PayoutDestinationID           string `json:"-"`
	DestinationMethod             string `json:"-"`
	MaskedDestinationReference    string `json:"-"`
	DestinationVerificationStatus string `json:"-"`
	// ActorID of the caller issuing the update â€” used for WLT audit.
	UpdatedByActorID string `json:"-"`
}

type TransitionInput struct {
	ToStatus       ActivationStatus `json:"toStatus"`
	Reason         string           `json:"reason"`
	ActorID        string           `json:"-"`
	ActorSurface   string           `json:"-"`
	CorrelationID  string           `json:"-"`
	IdempotencyKey string           `json:"-"`
}

type UploadDocumentInput struct {
	DocumentType      string `json:"documentType"`
	MediaRef          string `json:"mediaRef"`
	Notes             string `json:"notes"`
	UploadedByActorID string `json:"-"`
}

func (i UploadDocumentInput) Validate() error {
	if i.DocumentType == "" || i.MediaRef == "" {
		return ErrInvalid
	}
	return nil
}

type ReviewDocumentInput struct {
	Decision          string `json:"decision"`
	Reason            string `json:"reason"`
	ReviewedByActorID string `json:"-"`
	CorrelationID     string `json:"-"`
}

func (i ReviewDocumentInput) Validate() error {
	if i.Decision != "approved" && i.Decision != "rejected" && i.Decision != "needs_resubmit" {
		return ErrInvalid
	}
	if (i.Decision == "rejected" || i.Decision == "needs_resubmit") && strings.TrimSpace(i.Reason) == "" {
		return ErrInvalid
	}
	return nil
}

type CreateFieldVisitInput struct {
	PartnerID         string   `json:"partnerId"`
	StoreID           string   `json:"storeId"`
	VisitNotes        string   `json:"visitNotes"`
	LocationLatitude  *float64 `json:"locationLatitude"`
	LocationLongitude *float64 `json:"locationLongitude"`
	EvidenceMediaRefs []string `json:"evidenceMediaRefs"`
	FieldActorID      string   `json:"-"`
}

type PartnerLinkedStore struct {
	ID          string `json:"id"`
	PartnerID   string `json:"partnerId"`
	Slug        string `json:"slug"`
	DisplayName string `json:"displayName"`
	Status      string `json:"status"`
	IsVisible   bool   `json:"isVisible"`
	CityCode    string `json:"cityCode"`
	CreatedAt   string `json:"createdAt"`
}

type PartnerListQuery struct {
	ActivationStatus string
	CreatedByActorID string
	Limit            int
	Offset           int
}

// â”€â”€â”€ Store team members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Closes the partner-store backend gap: app-partner's team management screen
// (services/dsh/frontend/app-partner/team/PartnerTeamManagementScreen.tsx)
// already calls these operations against the OpenAPI contract; there was no
// Go implementation until this backend path.

type StoreTeamMember struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	Role               string `json:"role"`
	RoleLabel          string `json:"roleLabel"`
	Status             string `json:"status"`
	StatusLabel        string `json:"statusLabel"`
	BranchAssignment   string `json:"branchAssignment"`
	PermissionsSummary string `json:"permissionsSummary"`
	DeliveryAssignment string `json:"deliveryAssignment"`
	InviteLifecycle    string `json:"inviteLifecycle"`
	OperationalImpact  string `json:"operationalImpact"`
	AuditNote          string `json:"auditNote"`
	InlineAction       string `json:"inlineAction"`
	InlineActionLabel  string `json:"inlineActionLabel"`
}

type InviteTeamMemberInput struct {
	Identity         string `json:"identity"`
	Role             string `json:"role"`
	InvitedByActorID string `json:"-"`
}

func (i InviteTeamMemberInput) Validate() error {
	if strings.TrimSpace(i.Identity) == "" {
		return ErrInvalid
	}
	if i.Role != "manager" && i.Role != "supervisor" && i.Role != "staff" && i.Role != "owner" {
		return ErrInvalid
	}
	return nil
}

type TeamMemberActionInput struct {
	Action  string `json:"action"`
	ActorID string `json:"-"`
}

func (i TeamMemberActionInput) Validate() error {
	switch i.Action {
	case "pause", "activate", "block", "resend-invite", "cancel-invite":
		return nil
	default:
		return ErrInvalid
	}
}

// â”€â”€â”€ Store courier settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type StoreCourierSettings struct {
	CourierName       string   `json:"courierName"`
	CourierPhone      string   `json:"courierPhone"`
	IsActive          bool     `json:"isActive"`
	Policy            string   `json:"policy"`
	PricingSource     string   `json:"pricingSource"`
	Compensation      string   `json:"compensation"`
	SelectedBranchIDs []string `json:"selectedBranchIds"`
	Version           int64    `json:"version"`
}

func (i StoreCourierSettings) Validate() error {
	if strings.TrimSpace(i.CourierName) == "" || strings.TrimSpace(i.CourierPhone) == "" {
		return ErrInvalid
	}

	// Validate combinations
	if i.Policy == "free_delivery" && i.PricingSource != "bthwani_pricing" {
		return ErrInvalid
	}
	if i.Policy == "store_paid" && i.Compensation != "store_wallet" {
		return ErrInvalid
	}

	return nil
}

// â”€â”€â”€ Store coverage zones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type StoreCoverageZone struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	Status              string `json:"status"`
	StatusLabel         string `json:"statusLabel"`
	BranchRelation      string `json:"branchRelation"`
	ServiceModeRelation string `json:"serviceModeRelation"`
	PolicySummary       string `json:"policySummary"`
	PolicyReason        string `json:"policyReason"`
	OperationalImpact   string `json:"operationalImpact"`
	PricingReference    string `json:"pricingReference"`
	CommissionReference string `json:"commissionReference"`
	PayoutReference     string `json:"payoutReference"`
	ReviewActionLabel   string `json:"reviewActionLabel"`
	AuditNote           string `json:"auditNote"`
}

// â”€â”€â”€ Partner operational scopes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type OperationalScope struct {
	ScopeID     string   `json:"scopeId"`
	StoreID     string   `json:"storeId"`
	PartnerID   string   `json:"partnerId"`
	DisplayName string   `json:"displayName"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}
