package partner

import (
	"errors"
	"time"
)

var (
	ErrNotFound          = errors.New("partner not found")
	ErrInvalid           = errors.New("invalid partner input")
	ErrForbidden         = errors.New("partner action forbidden")
	ErrInvalidTransition = errors.New("invalid partner status transition")
	ErrConflict          = errors.New("partner conflict — duplicate legal identity")
)

// ─── Activation status (18 states) ────────────────────────────────────────

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
	StatusPartnerDeactivated    ActivationStatus = "partner_deactivated"
	StatusClientVisible         ActivationStatus = "client_visible"
	StatusClientHidden          ActivationStatus = "client_hidden"
)

// allowedTransitions defines the valid state machine for partner activation.
// Backend enforces these — no surface can bypass them.
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
	StatusPartnerActive:         {StatusClientVisible, StatusClientHidden, StatusPartnerDeactivated},
	StatusPartnerDeactivated:    {StatusOpsReview, StatusSubmitted},
	StatusClientVisible:         {StatusClientHidden, StatusPartnerDeactivated},
	StatusClientHidden:          {StatusClientVisible, StatusPartnerDeactivated},
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

// ─── Partner entity ────────────────────────────────────────────────────────

type Partner struct {
	ID                  string           `json:"id"`
	LegalNameAr         string           `json:"legalNameAr"`
	LegalNameEn         string           `json:"legalNameEn"`
	DisplayName         string           `json:"displayName"`
	LegalIdentityType   string           `json:"legalIdentityType"`
	LegalIdentityNumber string           `json:"legalIdentityNumber"`
	OwnerName           string           `json:"ownerName"`
	PrimaryPhone        string           `json:"primaryPhone"`
	SecondaryPhone      string           `json:"secondaryPhone"`
	Email               string           `json:"email"`
	Category            string           `json:"category"`
	ActivationStatus    ActivationStatus `json:"activationStatus"`
	CreatedByActorID    string           `json:"createdByActorId"`
	CreatedBySurface    string           `json:"createdBySurface"`
	Notes               string           `json:"notes"`
	Version             int              `json:"version"`
	CreatedAt           time.Time        `json:"createdAt"`
	UpdatedAt           time.Time        `json:"updatedAt"`
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

// ─── Document ──────────────────────────────────────────────────────────────

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

// ─── Document review ───────────────────────────────────────────────────────

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

// ─── Field visit (partner-centric) ────────────────────────────────────────

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

// ─── Activation event (audit) ──────────────────────────────────────────────

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

// ─── Readiness checklist ───────────────────────────────────────────────────

type ReadinessItem struct {
	ID            string `json:"id"`
	Label         string `json:"label"`
	Satisfied     bool   `json:"satisfied"`
	BlockedReason string `json:"blockedReason,omitempty"`
}

type PartnerReadiness struct {
	PartnerID     string          `json:"partnerId"`
	CanActivate   bool            `json:"canActivate"`
	BlockedReason string          `json:"blockedReason,omitempty"`
	Checklist     []ReadinessItem `json:"checklist"`
}

func ComputeReadiness(p Partner, documentCount, approvedDocCount, storeCount int) PartnerReadiness {
	docsDone := approvedDocCount > 0
	storeDone := storeCount > 0

	statusDone := p.ActivationStatus == StatusOpsApproved ||
		p.ActivationStatus == StatusPartnerActive ||
		p.ActivationStatus == StatusClientVisible ||
		p.ActivationStatus == StatusClientHidden

	canActivate := docsDone && storeDone && IsTransitionAllowed(p.ActivationStatus, StatusPartnerActive)

	blockedReason := ""
	if !docsDone {
		blockedReason = "وثائق مطلوبة غائبة أو غير معتمدة"
	} else if !storeDone {
		blockedReason = "لا يوجد فرع مربوط بالشريك"
	} else if !canActivate {
		blockedReason = "الحالة الحالية لا تسمح بالتفعيل المباشر — أكمل المراحل السابقة أولاً"
	}

	_ = statusDone

	return PartnerReadiness{
		PartnerID:     p.ID,
		CanActivate:   canActivate,
		BlockedReason: blockedReason,
		Checklist: []ReadinessItem{
			{
				ID:            "documents",
				Label:         "الوثائق معتمدة",
				Satisfied:     docsDone,
				BlockedReason: map[bool]string{false: "الوثائق غير مكتملة أو لم يتم التحقق منها"}[docsDone],
			},
			{
				ID:            "store",
				Label:         "فرع مربوط بالشريك",
				Satisfied:     storeDone,
				BlockedReason: map[bool]string{false: "لا يوجد فرع مربوط بالشريك"}[storeDone],
			},
			{
				ID:        "activation",
				Label:     "اعتماد العمليات",
				Satisfied: statusDone,
			},
		},
	}
}

// ─── Input types ───────────────────────────────────────────────────────────

type CreatePartnerInput struct {
	LegalNameAr         string `json:"legalNameAr"`
	LegalNameEn         string `json:"legalNameEn"`
	DisplayName         string `json:"displayName"`
	LegalIdentityType   string `json:"legalIdentityType"`
	LegalIdentityNumber string `json:"legalIdentityNumber"`
	OwnerName           string `json:"ownerName"`
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
	DisplayName    string `json:"displayName"`
	OwnerName      string `json:"ownerName"`
	PrimaryPhone   string `json:"primaryPhone"`
	SecondaryPhone string `json:"secondaryPhone"`
	Email          string `json:"email"`
	Notes          string `json:"notes"`
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
