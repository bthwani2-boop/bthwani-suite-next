package partner

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound                     = errors.New("partner not found")
	ErrInvalid                      = errors.New("invalid partner input")
	ErrForbidden                    = errors.New("partner action forbidden")
	ErrInvalidTransition            = errors.New("invalid partner status transition")
	ErrConflict                     = errors.New("partner conflict — duplicate legal identity")
	ErrVersionConflict              = errors.New("optimistic concurrency control failed — version mismatch")
	ErrStorePublicationGatesFailed = errors.New("store publication gates failed: linked store must be active, visible, serviceable, partner-ready, catalog approved, and marketing visible")
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
	// Payout destination reference — DSH holds only the WLT reference ID and
	// masked display strings. Raw bank data is never stored in DSH after Phase 5.
	PayoutDestinationID  string `json:"payoutDestinationId"`
	MaskedAccountNumber  string `json:"maskedAccountNumber"`
	MaskedIBAN           string `json:"maskedIban"`
	MaskedMobileNumber   string `json:"maskedMobileNumber"`
	// Legacy bank display fields retained for backward compatibility.
	// New writes go through WLT; these are populated from masked values only.
	BeneficiaryName               string `json:"beneficiaryName"`
	BankName                      string `json:"bankName"`
	BankBranch                    string `json:"bankBranch"`
	BankAccountNumber             string `json:"accountNumber"`
	BankIBAN                      string `json:"iban"`
	PayoutMobileNumber            string `json:"payoutMobileNumber"`
	SettlementPreference          string `json:"settlementPreference"`
	BankAccountHolderMatchesOwner bool   `json:"bankAccountHolderMatchesOwner"`
	BankNotes                     string `json:"bankNotes"`
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
	storeActive bool,
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
		storeActive &&
		storeIsVisible &&
		storeServiceable &&
		storePartnerReadinessReady &&
		storeCatalogApproved &&
		storeMarketingVisible &&
		partnerActiveDone

	partnerActivationBlockedReason := ""
	if !docsDone {
		partnerActivationBlockedReason = "وثائق مطلوبة غائبة أو غير معتمدة"
	} else if !hasStore {
		partnerActivationBlockedReason = "لا يوجد فرع مربوط بالشريك"
	} else if !canActivatePartner {
		if p.ActivationStatus != StatusPartnerActive && p.ActivationStatus != StatusClientVisible && p.ActivationStatus != StatusClientHidden {
			partnerActivationBlockedReason = "الحالة الحالية لا تسمح بالتفعيل المباشر — أكمل المراحل السابقة أولاً"
		}
	}

	storePublicationBlockedReason := ""
	if !hasStore {
		storePublicationBlockedReason = "لا يوجد فرع مربوط بالشريك"
	} else if !partnerActiveDone {
		storePublicationBlockedReason = "الشريك غير نشط حالياً"
	} else if !storeActive {
		storePublicationBlockedReason = "حالة الفرع غير نشطة"
	} else if !storeIsVisible {
		storePublicationBlockedReason = "الفرع مخفي من لوحة التحكم"
	} else if !storeServiceable {
		storePublicationBlockedReason = "الفرع خارج الخدمة أو غير متوفر حالياً"
	} else if !storePartnerReadinessReady {
		storePublicationBlockedReason = "جاهزية الشريك غير مكتملة للفرع"
	} else if !storeCatalogApproved {
		storePublicationBlockedReason = "الكتالوج الخاص بالفرع غير معتمد"
	} else if !storeMarketingVisible {
		storePublicationBlockedReason = "الظهور التسويقي للفرع غير مفعل"
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
				Label:         "الوثائق معتمدة",
				Satisfied:     docsDone,
				BlockedReason: map[bool]string{false: "الوثائق غير مكتملة أو لم يتم التحقق منها"}[docsDone],
			},
			{
				ID:            "linked_store",
				Label:         "فرع مربوط بالشريك",
				Satisfied:     hasStore,
				BlockedReason: map[bool]string{false: "لا يوجد فرع مربوط بالشريك"}[hasStore],
			},
			{
				ID:            "ops_approved",
				Label:         "اعتماد العمليات",
				Satisfied:     opsApprovedDone,
				BlockedReason: map[bool]string{false: "بانتظار اعتماد العمليات"}[opsApprovedDone],
			},
			{
				ID:            "partner_active",
				Label:         "الشريك نشط",
				Satisfied:     partnerActiveDone,
				BlockedReason: map[bool]string{false: "الشريك غير نشط"}[partnerActiveDone],
			},
			{
				ID:            "store_status_active",
				Label:         "حالة الفرع نشطة",
				Satisfied:     storeActive,
				BlockedReason: map[bool]string{false: "حالة الفرع غير نشطة"}[storeActive],
			},
			{
				ID:            "store_serviceability",
				Label:         "تغطية الخدمة للفرع",
				Satisfied:     storeServiceable,
				BlockedReason: map[bool]string{false: "الفرع غير مغطى بالخدمة حالياً"}[storeServiceable],
			},
			{
				ID:            "partner_readiness_ready",
				Label:         "جاهزية الشريك للفرع",
				Satisfied:     storePartnerReadinessReady,
				BlockedReason: map[bool]string{false: "جاهزية الشريك غير مكتملة للفرع"}[storePartnerReadinessReady],
			},
			{
				ID:            "catalog_approved",
				Label:         "كتالوج الفرع معتمد",
				Satisfied:     storeCatalogApproved,
				BlockedReason: map[bool]string{false: "كتالوج الفرع غير معتمد"}[storeCatalogApproved],
			},
			{
				ID:            "marketing_visible",
				Label:         "الظهور التسويقي للفرع",
				Satisfied:     storeMarketingVisible,
				BlockedReason: map[bool]string{false: "الظهور التسويقي للفرع غير مفعل"}[storeMarketingVisible],
			},
			{
				ID:            "is_visible",
				Label:         "الفرع مرئي",
				Satisfied:     storeIsVisible,
				BlockedReason: map[bool]string{false: "الفرع مخفي"}[storeIsVisible],
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
	PayoutDestinationID  string `json:"-"`
	MaskedAccountNumber  string `json:"-"`
	MaskedIBAN           string `json:"-"`
	MaskedMobileNumber   string `json:"-"`
	// ActorID of the caller issuing the update — used for WLT audit.
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

// ─── Store team members ─────────────────────────────────────────────────────
// Closes the DSH-050 backend gap: app-partner's team management screen
// (services/dsh/frontend/app-partner/team/PartnerTeamManagementScreen.tsx)
// already calls these operations against the OpenAPI contract; there was no
// Go implementation until this slice.

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
	InvitedByActorID string `json:"-"`
}

func (i InviteTeamMemberInput) Validate() error {
	if strings.TrimSpace(i.Identity) == "" {
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
	return nil
}

// ─── Store courier settings ─────────────────────────────────────────────────

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

// ─── Store coverage zones ───────────────────────────────────────────────────

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

// ─── Partner operational scopes ─────────────────────────────────────────────

type OperationalScope struct {
	ScopeID     string   `json:"scopeId"`
	StoreID     string   `json:"storeId"`
	PartnerID   string   `json:"partnerId"`
	DisplayName string   `json:"displayName"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

// scopePermissionsByRole is the auditable source of truth for what each
// team role can do within a store scope. Referenced by
// ListPartnerScopesForActor — not duplicated inline in query-mapping code.
var scopePermissionsByRole = map[string][]string{
	"owner":      {"team.manage", "courier.manage", "coverage.read", "catalog.manage", "orders.manage"},
	"manager":    {"team.manage", "courier.manage", "coverage.read", "orders.manage"},
	"supervisor": {"coverage.read", "orders.manage"},
	"staff":      {"orders.manage"},
	"courier":    {"orders.manage"},
}

func permissionsForRole(role string) []string {
	if perms, ok := scopePermissionsByRole[role]; ok {
		return perms
	}
	return scopePermissionsByRole["staff"]
}
