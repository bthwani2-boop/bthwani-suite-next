package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// ProviderOperationalCore contains only progressive operational facts for an
// independent field provider or captain. Identity remains in workforce_people;
// monetary truth remains in WLT.
type ProviderOperationalCore struct {
	ActorID                    string                 `json:"actorId"`
	WorkforceKind              string                 `json:"workforceKind"`
	ReferralSourceType         string                 `json:"referralSourceType"`
	ReferralSourceActorID      string                 `json:"referralSourceActorId,omitempty"`
	ReferralPartnerID          string                 `json:"referralPartnerId,omitempty"`
	ReferralChannel            string                 `json:"referralChannel,omitempty"`
	ReferralNote               string                 `json:"referralNote,omitempty"`
	GuarantorFullName          string                 `json:"guarantorFullName,omitempty"`
	GuarantorRelationship      string                 `json:"guarantorRelationship,omitempty"`
	GuarantorPhoneE164         string                 `json:"guarantorPhoneE164,omitempty"`
	GuarantorPhoneVerifiedAt   string                 `json:"guarantorPhoneVerifiedAt,omitempty"`
	NationalIDNumber           string                 `json:"nationalIdNumber,omitempty"`
	IdentityFrontMediaRef      string                 `json:"identityFrontMediaRef,omitempty"`
	IdentityBackMediaRef       string                 `json:"identityBackMediaRef,omitempty"`
	IdentityVerificationStatus string                 `json:"identityVerificationStatus"`
	IdentityRejectionReason    string                 `json:"identityRejectionReason,omitempty"`
	ContractMediaRef           string                 `json:"contractMediaRef,omitempty"`
	ContractReviewStatus       string                 `json:"contractReviewStatus"`
	ContractRejectionReason    string                 `json:"contractRejectionReason,omitempty"`
	OnboardingStage            string                 `json:"onboardingStage"`
	PartnershipsApprovedAt     string                 `json:"partnershipsApprovedAt,omitempty"`
	ReviewedByActorID          string                 `json:"reviewedByActorId,omitempty"`
	UpdatedByActorID           string                 `json:"updatedByActorId,omitempty"`
	Version                    int                    `json:"version"`
	CreatedAt                  time.Time              `json:"createdAt"`
	UpdatedAt                  time.Time              `json:"updatedAt"`
	Captain                    *CaptainActivationCore `json:"captain,omitempty"`
}

type CaptainActivationCore struct {
	Classification                string `json:"classification"`
	DeliveryBagCustodyStatus      string `json:"deliveryBagCustodyStatus"`
	DeliveryBagCustodyReference   string `json:"deliveryBagCustodyReference,omitempty"`
	MandatoryPurchasesStatus      string `json:"mandatoryPurchasesStatus"`
	MandatoryPurchasesReference   string `json:"mandatoryPurchasesReference,omitempty"`
	TrainingStatus                string `json:"trainingStatus"`
	OperationsAccreditationStatus string `json:"operationsAccreditationStatus"`
	ClassificationUpdatedAt       string `json:"classificationUpdatedAt,omitempty"`
	UpdatedByActorID              string `json:"updatedByActorId,omitempty"`
	Version                       int    `json:"version"`
}

type OperationalCorePatch struct {
	ReferralSourceType         *string                     `json:"referralSourceType"`
	ReferralSourceActorID      *string                     `json:"referralSourceActorId"`
	ReferralPartnerID          *string                     `json:"referralPartnerId"`
	ReferralChannel            *string                     `json:"referralChannel"`
	ReferralNote               *string                     `json:"referralNote"`
	GuarantorFullName          *string                     `json:"guarantorFullName"`
	GuarantorRelationship      *string                     `json:"guarantorRelationship"`
	GuarantorPhoneE164         *string                     `json:"guarantorPhoneE164"`
	GuarantorPhoneVerified     *bool                       `json:"guarantorPhoneVerified"`
	NationalIDNumber           *string                     `json:"nationalIdNumber"`
	IdentityFrontMediaRef      *string                     `json:"identityFrontMediaRef"`
	IdentityBackMediaRef       *string                     `json:"identityBackMediaRef"`
	IdentityVerificationStatus *string                     `json:"identityVerificationStatus"`
	IdentityRejectionReason    *string                     `json:"identityRejectionReason"`
	ContractMediaRef           *string                     `json:"contractMediaRef"`
	ContractReviewStatus       *string                     `json:"contractReviewStatus"`
	ContractRejectionReason    *string                     `json:"contractRejectionReason"`
	OnboardingStage            *string                     `json:"onboardingStage"`
	PartnershipsApproved       *bool                       `json:"partnershipsApproved"`
	ReviewedByActorID          *string                     `json:"reviewedByActorId"`
	Captain                    *CaptainActivationCorePatch `json:"captain"`
}

type CaptainActivationCorePatch struct {
	Classification                *string `json:"classification"`
	DeliveryBagCustodyStatus      *string `json:"deliveryBagCustodyStatus"`
	DeliveryBagCustodyReference   *string `json:"deliveryBagCustodyReference"`
	MandatoryPurchasesStatus      *string `json:"mandatoryPurchasesStatus"`
	MandatoryPurchasesReference   *string `json:"mandatoryPurchasesReference"`
	TrainingStatus                *string `json:"trainingStatus"`
	OperationsAccreditationStatus *string `json:"operationsAccreditationStatus"`
}

type ActivationReadiness struct {
	Ready   bool     `json:"ready"`
	Missing []string `json:"missing"`
}

type AvailabilityNotice struct {
	ID               string    `json:"id"`
	ActorID          string    `json:"actorId"`
	NoticeType       string    `json:"noticeType"`
	StartsAt         time.Time `json:"startsAt"`
	EndsAt           time.Time `json:"endsAt"`
	ServiceZoneID    string    `json:"serviceZoneId,omitempty"`
	ReasonCode       string    `json:"reasonCode"`
	Note             string    `json:"note,omitempty"`
	Status           string    `json:"status"`
	CreatedByActorID string    `json:"createdByActorId"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type CreateAvailabilityNoticeInput struct {
	NoticeType        string    `json:"noticeType"`
	StartsAt          time.Time `json:"startsAt"`
	EndsAt            time.Time `json:"endsAt"`
	ServiceZoneID     string    `json:"serviceZoneId"`
	ReasonCode        string    `json:"reasonCode"`
	Note              string    `json:"note"`
	OperatorContextID string    `json:"-"`
}

type ProviderIncident struct {
	ID                 string    `json:"id"`
	ActorID            string    `json:"actorId"`
	IncidentCode       string    `json:"incidentCode"`
	SourceType         string    `json:"sourceType"`
	SourceID           string    `json:"sourceId,omitempty"`
	Description        string    `json:"description"`
	EvidenceMediaRefs  []string  `json:"evidenceMediaRefs"`
	Severity           string    `json:"severity"`
	Status             string    `json:"status"`
	PolicyID           string    `json:"policyId,omitempty"`
	WltLedgerReference string    `json:"wltLedgerReference,omitempty"`
	AppealNote         string    `json:"appealNote,omitempty"`
	AppealedAt         string    `json:"appealedAt,omitempty"`
	ResolutionNote     string    `json:"resolutionNote,omitempty"`
	ReportedByActorID  string    `json:"reportedByActorId"`
	ReviewedByActorID  string    `json:"reviewedByActorId,omitempty"`
	ResolvedAt         string    `json:"resolvedAt,omitempty"`
	Version            int       `json:"version"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type CreateProviderIncidentInput struct {
	ActorID           string   `json:"actorId"`
	IncidentCode      string   `json:"incidentCode"`
	SourceType        string   `json:"sourceType"`
	SourceID          string   `json:"sourceId"`
	Description       string   `json:"description"`
	EvidenceMediaRefs []string `json:"evidenceMediaRefs"`
	Severity          string   `json:"severity"`
	PolicyID          string   `json:"policyId"`
}

func (r *Repository) requireOperationalCore(ctx context.Context, actorID string) (string, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return "", err
	}
	var kind string
	var coreExists bool
	var captainCoreExists bool
	err = r.db.QueryRowContext(ctx, `
		SELECT p.workforce_kind,
		       EXISTS(SELECT 1 FROM workforce_provider_operational_core c WHERE c.operator_context_id=p.operator_context_id AND c.actor_id=p.actor_id),
		       CASE WHEN p.workforce_kind='captain' THEN EXISTS(SELECT 1 FROM workforce_captain_activation_core c WHERE c.operator_context_id=p.operator_context_id AND c.actor_id=p.actor_id) ELSE true END
		FROM workforce_people p
		WHERE p.operator_context_id=$1 AND p.actor_id=$2`, operatorContextID, actorID).Scan(&kind, &coreExists, &captainCoreExists)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	if kind != "field" && kind != "captain" {
		return "", ErrInvalidInput
	}
	if !coreExists || !captainCoreExists {
		return "", fmt.Errorf("operational core invariant missing for actor %s", actorID)
	}
	return kind, nil
}

func (r *Repository) OperationalCoreByActorID(ctx context.Context, actorID string) (ProviderOperationalCore, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	kind, err := r.requireOperationalCore(ctx, actorID)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	var core ProviderOperationalCore
	err = r.db.QueryRowContext(ctx, `
		SELECT actor_id,$2,referral_source_type,COALESCE(referral_source_actor_id,''),COALESCE(referral_partner_id,''),
		COALESCE(referral_channel,''),referral_note,guarantor_full_name,guarantor_relationship,guarantor_phone_e164,
		COALESCE(guarantor_phone_verified_at::text,''),national_id_number,identity_front_media_ref,identity_back_media_ref,
		identity_verification_status,identity_rejection_reason,contract_media_ref,contract_review_status,
		contract_rejection_reason,onboarding_stage,COALESCE(partnerships_approved_at::text,''),COALESCE(reviewed_by_actor_id,''),
		updated_by_actor_id,version,created_at,updated_at
		FROM workforce_provider_operational_core WHERE operator_context_id=$3 AND actor_id=$1`, actorID, kind, operatorContextID).Scan(
		&core.ActorID, &core.WorkforceKind, &core.ReferralSourceType, &core.ReferralSourceActorID, &core.ReferralPartnerID,
		&core.ReferralChannel, &core.ReferralNote, &core.GuarantorFullName, &core.GuarantorRelationship, &core.GuarantorPhoneE164,
		&core.GuarantorPhoneVerifiedAt, &core.NationalIDNumber, &core.IdentityFrontMediaRef, &core.IdentityBackMediaRef,
		&core.IdentityVerificationStatus, &core.IdentityRejectionReason, &core.ContractMediaRef, &core.ContractReviewStatus,
		&core.ContractRejectionReason, &core.OnboardingStage, &core.PartnershipsApprovedAt, &core.ReviewedByActorID,
		&core.UpdatedByActorID, &core.Version, &core.CreatedAt, &core.UpdatedAt)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	if kind == "captain" {
		var captain CaptainActivationCore
		err = r.db.QueryRowContext(ctx, `
			SELECT classification,delivery_bag_custody_status,delivery_bag_custody_reference,
			mandatory_purchases_status,mandatory_purchases_reference,training_status,operations_accreditation_status,
			classification_updated_at::text,updated_by_actor_id,version
			FROM workforce_captain_activation_core WHERE operator_context_id=$2 AND actor_id=$1`, actorID, operatorContextID).Scan(
			&captain.Classification, &captain.DeliveryBagCustodyStatus,
			&captain.DeliveryBagCustodyReference, &captain.MandatoryPurchasesStatus, &captain.MandatoryPurchasesReference,
			&captain.TrainingStatus, &captain.OperationsAccreditationStatus, &captain.ClassificationUpdatedAt,
			&captain.UpdatedByActorID, &captain.Version)
		if err != nil {
			return ProviderOperationalCore{}, err
		}
		core.Captain = &captain
	}
	return core, nil
}

func (r *Repository) PatchOperationalCore(ctx context.Context, actorID, operatorID string, input OperationalCorePatch) (ProviderOperationalCore, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	kind, err := r.requireOperationalCore(ctx, actorID)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	if err := validateOperationalCorePatch(kind, input); err != nil {
		return ProviderOperationalCore{}, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `
		UPDATE workforce_provider_operational_core SET
		referral_source_type=COALESCE($2,referral_source_type),referral_source_actor_id=COALESCE($3,referral_source_actor_id),
		referral_partner_id=COALESCE($4,referral_partner_id),referral_channel=COALESCE($5,referral_channel),
		referral_note=COALESCE($6,referral_note),guarantor_full_name=COALESCE($7,guarantor_full_name),
		guarantor_relationship=COALESCE($8,guarantor_relationship),guarantor_phone_e164=COALESCE($9,guarantor_phone_e164),
		guarantor_phone_verified_at=CASE WHEN $10::boolean IS NULL THEN guarantor_phone_verified_at WHEN $10 THEN COALESCE(guarantor_phone_verified_at,now()) ELSE NULL END,
		national_id_number=COALESCE($11,national_id_number),identity_front_media_ref=COALESCE($12,identity_front_media_ref),
		identity_back_media_ref=COALESCE($13,identity_back_media_ref),identity_verification_status=COALESCE($14,identity_verification_status),
		identity_rejection_reason=COALESCE($15,identity_rejection_reason),contract_media_ref=COALESCE($16,contract_media_ref),
		contract_review_status=COALESCE($17,contract_review_status),contract_rejection_reason=COALESCE($18,contract_rejection_reason),
		onboarding_stage=COALESCE($19,onboarding_stage),
		partnerships_approved_at=CASE WHEN $20::boolean IS NULL THEN partnerships_approved_at WHEN $20 THEN COALESCE(partnerships_approved_at,now()) ELSE NULL END,
		reviewed_by_actor_id=COALESCE($21,reviewed_by_actor_id),updated_by_actor_id=$22,version=version+1,updated_at=now()
		WHERE actor_id=$1 AND operator_context_id=$23`, actorID, input.ReferralSourceType, input.ReferralSourceActorID, input.ReferralPartnerID, input.ReferralChannel,
		input.ReferralNote, input.GuarantorFullName, input.GuarantorRelationship, input.GuarantorPhoneE164, input.GuarantorPhoneVerified,
		input.NationalIDNumber, input.IdentityFrontMediaRef, input.IdentityBackMediaRef, input.IdentityVerificationStatus,
		input.IdentityRejectionReason, input.ContractMediaRef, input.ContractReviewStatus, input.ContractRejectionReason,
		input.OnboardingStage, input.PartnershipsApproved, input.ReviewedByActorID, operatorID, operatorContextID)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	if kind == "captain" && input.Captain != nil {
		c := input.Captain
		_, err = tx.ExecContext(ctx, `
			UPDATE workforce_captain_activation_core SET classification=COALESCE($2,classification),
			delivery_bag_custody_status=COALESCE($3,delivery_bag_custody_status),
			delivery_bag_custody_reference=COALESCE($4,delivery_bag_custody_reference),mandatory_purchases_status=COALESCE($5,mandatory_purchases_status),
			mandatory_purchases_reference=COALESCE($6,mandatory_purchases_reference),training_status=COALESCE($7,training_status),
			operations_accreditation_status=COALESCE($8,operations_accreditation_status),
			classification_updated_at=CASE WHEN $2::text IS NULL THEN classification_updated_at ELSE now() END,
			updated_by_actor_id=$9,version=version+1,updated_at=now() WHERE actor_id=$1 AND operator_context_id=$10`, actorID, c.Classification,
			c.DeliveryBagCustodyStatus, c.DeliveryBagCustodyReference, c.MandatoryPurchasesStatus, c.MandatoryPurchasesReference,
			c.TrainingStatus, c.OperationsAccreditationStatus, operatorID, operatorContextID)
		if err != nil {
			return ProviderOperationalCore{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return ProviderOperationalCore{}, err
	}
	return r.OperationalCoreByActorID(ctx, actorID)
}

func validateOperationalCorePatch(kind string, input OperationalCorePatch) error {
	if input.ReferralSourceType != nil && !oneOf(*input.ReferralSourceType, "employee", "captain", "field", "partner", "advertisement", "social_media", "public_referral", "direct", "other") {
		return ErrInvalidInput
	}
	if input.IdentityVerificationStatus != nil && !oneOf(*input.IdentityVerificationStatus, "pending", "under_review", "approved", "rejected", "expired", "needs_resubmission") {
		return ErrInvalidInput
	}
	if input.ContractReviewStatus != nil && !oneOf(*input.ContractReviewStatus, "pending", "under_review", "approved", "rejected", "needs_resubmission") {
		return ErrInvalidInput
	}
	if input.OnboardingStage != nil && !oneOf(*input.OnboardingStage, "basic_profile", "documents_pending", "documents_review", "training_pending", "partnerships_review", "operations_review", "activation_ready", "active") {
		return ErrInvalidInput
	}
	if input.Captain == nil {
		return nil
	}
	if kind != "captain" {
		return ErrInvalidInput
	}
	c := input.Captain
	if c.Classification != nil && !oneOf(*c.Classification, "joker", "basic") {
		return ErrInvalidInput
	}
	if c.DeliveryBagCustodyStatus != nil && !oneOf(*c.DeliveryBagCustodyStatus, "not_issued", "issued", "returned", "lost", "damaged") {
		return ErrInvalidInput
	}
	if c.MandatoryPurchasesStatus != nil && !oneOf(*c.MandatoryPurchasesStatus, "not_required", "pending_payment", "paid", "paid_and_delivered", "cancelled") {
		return ErrInvalidInput
	}
	if c.TrainingStatus != nil && !oneOf(*c.TrainingStatus, "pending", "in_progress", "passed", "failed") {
		return ErrInvalidInput
	}
	if c.OperationsAccreditationStatus != nil && !oneOf(*c.OperationsAccreditationStatus, "pending", "approved", "suspended", "expired") {
		return ErrInvalidInput
	}
	return nil
}

func oneOf(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}

func EvaluateProviderActivationReadiness(person Person, core ProviderOperationalCore) ActivationReadiness {
	missing := make([]string, 0)
	if strings.TrimSpace(person.FullNameAr) == "" {
		missing = append(missing, "fullNameAr")
	}
	if strings.TrimSpace(person.WorkforceCode) == "" {
		missing = append(missing, "workforceCode")
	}
	switch person.WorkforceKind {
	case "field":
		// Field activation is deliberately bounded to the product contract:
		// identity-owned phone (checked by the service), sovereign routing,
		// supervisor, verified identity, and an approved contract. Guarantor,
		// referral, partnerships, and onboarding stage are progressive facts;
		// none is a global Field activation prerequisite.
		if person.FieldProfile == nil {
			missing = append(missing, "fieldProfile")
		} else {
			if strings.TrimSpace(person.FieldProfile.CityCode) == "" {
				missing = append(missing, "cityCode")
			}
			if strings.TrimSpace(person.FieldProfile.ServiceZoneID) == "" {
				missing = append(missing, "serviceZoneId")
			}
			if strings.TrimSpace(person.FieldProfile.SupervisorActorID) == "" {
				missing = append(missing, "supervisorActorId")
			}
		}
		if strings.TrimSpace(core.NationalIDNumber) == "" {
			missing = append(missing, "nationalIdNumber")
		}
		if strings.TrimSpace(core.IdentityFrontMediaRef) == "" {
			missing = append(missing, "identityFrontMediaRef")
		}
		if core.IdentityVerificationStatus != "approved" {
			missing = append(missing, "identityApproved")
		}
		if strings.TrimSpace(core.ContractMediaRef) == "" {
			missing = append(missing, "contractMediaRef")
		}
		if core.ContractReviewStatus != "approved" {
			missing = append(missing, "contractApproved")
		}
	case "captain":
		// Financial eligibility is a cross-service gate, not a Workforce-owned
		// operational fact. IssueActivation verifies the DSH projection backed by
		// WLT immediately before issuing credentials.
		if strings.TrimSpace(core.GuarantorFullName) == "" {
			missing = append(missing, "guarantorFullName")
		}
		if strings.TrimSpace(core.GuarantorRelationship) == "" {
			missing = append(missing, "guarantorRelationship")
		}
		if strings.TrimSpace(core.GuarantorPhoneE164) == "" {
			missing = append(missing, "guarantorPhoneE164")
		}
		if strings.TrimSpace(core.NationalIDNumber) == "" {
			missing = append(missing, "nationalIdNumber")
		}
		if strings.TrimSpace(core.IdentityFrontMediaRef) == "" {
			missing = append(missing, "identityFrontMediaRef")
		}
		if core.IdentityVerificationStatus != "approved" {
			missing = append(missing, "identityApproved")
		}
		if strings.TrimSpace(core.ContractMediaRef) == "" {
			missing = append(missing, "contractMediaRef")
		}
		if core.ContractReviewStatus != "approved" {
			missing = append(missing, "contractApproved")
		}
		if core.OnboardingStage != "activation_ready" && core.OnboardingStage != "active" {
			missing = append(missing, "activationReady")
		}
		if person.CaptainProfile == nil || person.CaptainProfile.LicenseStatus != "valid" || !isLicenseNotExpired(person.CaptainProfile.LicenseExpiresAt) {
			missing = append(missing, "validDrivingLicense")
		}
		if core.Captain == nil {
			missing = append(missing, "captainActivationCore")
		} else {
			c := core.Captain
			if c.Classification != "joker" && c.Classification != "basic" {
				missing = append(missing, "captainClassification")
			}
			if c.DeliveryBagCustodyStatus != "issued" {
				missing = append(missing, "deliveryBagIssued")
			}
			if c.MandatoryPurchasesStatus != "paid_and_delivered" {
				missing = append(missing, "mandatoryPurchasesPaidAndDelivered")
			}
			if c.TrainingStatus != "passed" {
				missing = append(missing, "trainingPassed")
			}
			if c.OperationsAccreditationStatus != "approved" {
				missing = append(missing, "operationsAccredited")
			}
		}
	default:
		missing = append(missing, "supportedProviderKind")
	}
	return ActivationReadiness{Ready: len(missing) == 0, Missing: missing}
}

func (r *Repository) CreateAvailabilityNotice(ctx context.Context, actorID string, input CreateAvailabilityNoticeInput) (AvailabilityNotice, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil || !oneOf(input.NoticeType, "planned_unavailability", "immediate_unavailability", "short_break", "emergency", "temporary_restriction") || input.StartsAt.IsZero() || input.EndsAt.IsZero() || !input.EndsAt.After(input.StartsAt) || strings.TrimSpace(input.OperatorContextID) != operatorContextID {
		return AvailabilityNotice{}, ErrInvalidInput
	}
	if _, err := r.requireOperationalCore(ctx, actorID); err != nil {
		return AvailabilityNotice{}, err
	}
	if strings.TrimSpace(input.ReasonCode) == "" {
		input.ReasonCode = "personal"
	}
	var n AvailabilityNotice
	err = r.db.QueryRowContext(ctx, `INSERT INTO workforce_provider_availability_notices(actor_id,operator_context_id,notice_type,starts_at,ends_at,service_zone_id,reason_code,note,created_by_actor_id) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$1) RETURNING id::text,actor_id,notice_type,starts_at,ends_at,COALESCE(service_zone_id,''),reason_code,note,status,created_by_actor_id,created_at,updated_at`, actorID, operatorContextID, input.NoticeType, input.StartsAt, input.EndsAt, strings.TrimSpace(input.ServiceZoneID), strings.TrimSpace(input.ReasonCode), strings.TrimSpace(input.Note)).Scan(&n.ID, &n.ActorID, &n.NoticeType, &n.StartsAt, &n.EndsAt, &n.ServiceZoneID, &n.ReasonCode, &n.Note, &n.Status, &n.CreatedByActorID, &n.CreatedAt, &n.UpdatedAt)
	return n, err
}

func (r *Repository) ListAvailabilityNotices(ctx context.Context, actorID string, limit int) ([]AvailabilityNotice, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `SELECT id::text,actor_id,notice_type,starts_at,ends_at,COALESCE(service_zone_id,''),reason_code,note,status,created_by_actor_id,created_at,updated_at FROM workforce_provider_availability_notices WHERE operator_context_id=$1 AND actor_id=$2 ORDER BY starts_at DESC LIMIT $3`, operatorContextID, actorID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]AvailabilityNotice, 0)
	for rows.Next() {
		var n AvailabilityNotice
		if err := rows.Scan(&n.ID, &n.ActorID, &n.NoticeType, &n.StartsAt, &n.EndsAt, &n.ServiceZoneID, &n.ReasonCode, &n.Note, &n.Status, &n.CreatedByActorID, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (r *Repository) CreateProviderIncident(ctx context.Context, reporterID string, input CreateProviderIncidentInput) (ProviderIncident, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderIncident{}, err
	}
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.IncidentCode = strings.TrimSpace(input.IncidentCode)
	input.Description = strings.TrimSpace(input.Description)
	if input.ActorID == "" || input.IncidentCode == "" || input.Description == "" {
		return ProviderIncident{}, ErrInvalidInput
	}
	if _, err := r.PersonByActorID(ctx, input.ActorID); err != nil {
		return ProviderIncident{}, err
	}
	if input.SourceType == "" {
		input.SourceType = "operational"
	}
	if input.Severity == "" {
		input.Severity = "minor"
	}
	if !oneOf(input.Severity, "minor", "major", "critical") {
		return ProviderIncident{}, ErrInvalidInput
	}
	evidence, err := json.Marshal(nonNil(input.EvidenceMediaRefs))
	if err != nil {
		return ProviderIncident{}, err
	}
	var id string
	err = r.db.QueryRowContext(ctx, `INSERT INTO workforce_provider_incidents(operator_context_id,actor_id,incident_code,source_type,source_id,description,evidence_media_refs,severity,policy_id,reported_by_actor_id) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10) RETURNING id::text`, operatorContextID, input.ActorID, input.IncidentCode, input.SourceType, input.SourceID, input.Description, string(evidence), input.Severity, input.PolicyID, reporterID).Scan(&id)
	if err != nil {
		return ProviderIncident{}, err
	}
	return r.ProviderIncidentByID(ctx, id, input.ActorID)
}

func (r *Repository) ProviderIncidentByID(ctx context.Context, id, actorID string) (ProviderIncident, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderIncident{}, err
	}
	var incident ProviderIncident
	var evidence []byte
	err = r.db.QueryRowContext(ctx, `SELECT id::text,actor_id,incident_code,source_type,source_id,description,evidence_media_refs,severity,status,policy_id,wlt_ledger_reference,appeal_note,COALESCE(appealed_at::text,''),resolution_note,reported_by_actor_id,COALESCE(reviewed_by_actor_id,''),COALESCE(resolved_at::text,''),version,created_at,updated_at FROM workforce_provider_incidents WHERE id=$1::uuid AND operator_context_id=$2 AND ($3='' OR actor_id=$3)`, id, operatorContextID, actorID).Scan(&incident.ID, &incident.ActorID, &incident.IncidentCode, &incident.SourceType, &incident.SourceID, &incident.Description, &evidence, &incident.Severity, &incident.Status, &incident.PolicyID, &incident.WltLedgerReference, &incident.AppealNote, &incident.AppealedAt, &incident.ResolutionNote, &incident.ReportedByActorID, &incident.ReviewedByActorID, &incident.ResolvedAt, &incident.Version, &incident.CreatedAt, &incident.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderIncident{}, ErrNotFound
	}
	if err != nil {
		return ProviderIncident{}, err
	}
	if err := json.Unmarshal(evidence, &incident.EvidenceMediaRefs); err != nil {
		return ProviderIncident{}, err
	}
	if incident.EvidenceMediaRefs == nil {
		incident.EvidenceMediaRefs = []string{}
	}
	return incident, nil
}

func (r *Repository) ListProviderIncidents(ctx context.Context, actorID string, limit int) ([]ProviderIncident, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `SELECT id::text FROM workforce_provider_incidents WHERE operator_context_id=$1 AND actor_id=$2 ORDER BY created_at DESC LIMIT $3`, operatorContextID, actorID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := make([]ProviderIncident, 0, len(ids))
	for _, id := range ids {
		item, err := r.ProviderIncidentByID(ctx, id, actorID)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repository) SubmitProviderIncidentAppeal(ctx context.Context, actorID, incidentID, note string) (ProviderIncident, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderIncident{}, err
	}
	note = strings.TrimSpace(note)
	if len(note) < 3 {
		return ProviderIncident{}, ErrInvalidInput
	}
	result, err := r.db.ExecContext(ctx, `UPDATE workforce_provider_incidents SET appeal_note=$4,appealed_at=now(),status='under_review',version=version+1,updated_at=now() WHERE id=$1::uuid AND operator_context_id=$2 AND actor_id=$3 AND status IN ('provider_notified','appeal_window','approved')`, incidentID, operatorContextID, actorID, note)
	if err != nil {
		return ProviderIncident{}, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return ProviderIncident{}, fmt.Errorf("%w: incident is not appealable", ErrInvalidInput)
	}
	return r.ProviderIncidentByID(ctx, incidentID, actorID)
}
