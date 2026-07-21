package partner

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrReadinessGate          = errors.New("partner readiness gate failed")
	ErrExpectedVersionRequired = errors.New("positive partner version is required")
	ErrIdempotencyConflict    = errors.New("idempotency key reused with different partner transition")
	ErrStoreOwnershipConflict = errors.New("store already belongs to another partner")
)

const governedPartnerColumns = `id, legal_name_ar, legal_name_en, display_name,
	legal_identity_type, legal_identity_number,
	owner_name, primary_phone, secondary_phone, email,
	category, activation_status, created_by_actor_id, created_by_surface,
	notes,
	COALESCE(payout_destination_id,''), COALESCE(masked_account_number,''),
	COALESCE(masked_iban,''), COALESCE(masked_mobile_number,''),
	beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban,
	payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes,
	version, created_at, updated_at`

type partnerScanner interface {
	Scan(dest ...any) error
}

func scanGovernedPartner(row partnerScanner) (Partner, error) {
	var p Partner
	err := row.Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerName, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email,
		&p.Category, &p.ActivationStatus, &p.CreatedByActorID, &p.CreatedBySurface,
		&p.Notes,
		&p.PayoutDestinationID, &p.MaskedAccountNumber, &p.MaskedIBAN, &p.MaskedMobileNumber,
		&p.BeneficiaryName, &p.BankName, &p.BankBranch, &p.BankAccountNumber, &p.BankIBAN,
		&p.PayoutMobileNumber, &p.SettlementPreference, &p.BankAccountHolderMatchesOwner, &p.BankNotes,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

// SanitizePartnerForSurface guarantees that no raw payout identifier can leave
// DSH. Legacy JSON fields carry masked compatibility values until all surfaces
// consume the explicit masked fields.
func SanitizePartnerForSurface(p Partner) Partner {
	p.BankAccountNumber = p.MaskedAccountNumber
	p.BankIBAN = p.MaskedIBAN
	p.PayoutMobileNumber = p.MaskedMobileNumber
	return p
}

func GetPartnerSanitized(db *sql.DB, partnerID string) (Partner, error) {
	p, err := GetPartner(db, partnerID)
	if err != nil {
		return Partner{}, err
	}
	return SanitizePartnerForSurface(p), nil
}

// UpdatePartnerGoverned persists operational partner edits and only accepts
// financial cache fields returned by WLT. Raw account/IBAN/mobile values are
// explicitly cleared whenever a WLT payout reference is bound.
func UpdatePartnerGoverned(db *sql.DB, partnerID string, input UpdatePartnerInput, expectedVersion int) (Partner, error) {
	if expectedVersion < 1 {
		return Partner{}, ErrExpectedVersionRequired
	}

	var row *sql.Row
	if strings.TrimSpace(input.PayoutDestinationID) != "" {
		var holderMatchesOwner sql.NullBool
		if input.BankAccountHolderMatchesOwner != nil {
			holderMatchesOwner = sql.NullBool{Bool: *input.BankAccountHolderMatchesOwner, Valid: true}
		}
		row = db.QueryRow(`
			UPDATE dsh_partners SET
				display_name = COALESCE(NULLIF($2,''), display_name),
				owner_name = COALESCE(NULLIF($3,''), owner_name),
				primary_phone = COALESCE(NULLIF($4,''), primary_phone),
				secondary_phone = COALESCE(NULLIF($5,''), secondary_phone),
				email = COALESCE(NULLIF($6,''), email),
				notes = COALESCE(NULLIF($7,''), notes),
				beneficiary_name = $9,
				bank_name = $10,
				bank_branch = $11,
				bank_account_number = '',
				bank_iban = '',
				payout_mobile_number = '',
				settlement_preference = $12,
				bank_account_holder_matches_owner = COALESCE($13, bank_account_holder_matches_owner),
				bank_notes = $14,
				payout_destination_id = $15,
				masked_account_number = $16,
				masked_iban = $17,
				masked_mobile_number = $18,
				version = version + 1,
				updated_at = NOW()
			WHERE id = $1 AND version = $8
			RETURNING `+governedPartnerColumns,
			partnerID, input.DisplayName, input.OwnerName, input.PrimaryPhone,
			input.SecondaryPhone, input.Email, input.Notes, expectedVersion,
			input.BeneficiaryName, input.BankName, input.BankBranch,
			input.SettlementPreference, holderMatchesOwner, input.BankNotes,
			input.PayoutDestinationID, input.MaskedAccountNumber,
			input.MaskedIBAN, input.MaskedMobileNumber,
		)
	} else {
		row = db.QueryRow(`
			UPDATE dsh_partners SET
				display_name = COALESCE(NULLIF($2,''), display_name),
				owner_name = COALESCE(NULLIF($3,''), owner_name),
				primary_phone = COALESCE(NULLIF($4,''), primary_phone),
				secondary_phone = COALESCE(NULLIF($5,''), secondary_phone),
				email = COALESCE(NULLIF($6,''), email),
				notes = COALESCE(NULLIF($7,''), notes),
				version = version + 1,
				updated_at = NOW()
			WHERE id = $1 AND version = $8
			RETURNING `+governedPartnerColumns,
			partnerID, input.DisplayName, input.OwnerName, input.PrimaryPhone,
			input.SecondaryPhone, input.Email, input.Notes, expectedVersion,
		)
	}

	p, err := scanGovernedPartner(row)
	if errors.Is(err, sql.ErrNoRows) {
		var exists bool
		if existsErr := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM dsh_partners WHERE id = $1)`, partnerID).Scan(&exists); existsErr != nil {
			return Partner{}, existsErr
		}
		if exists {
			return Partner{}, ErrVersionConflict
		}
		return Partner{}, ErrNotFound
	}
	if err != nil {
		return Partner{}, err
	}
	return SanitizePartnerForSurface(p), nil
}

// TransitionStatusGoverned is the canonical partner state transition. It
// performs idempotent replay, optimistic concurrency, readiness checks, the
// partner update, store-readiness propagation, and audit writes in one DB tx.
func TransitionStatusGoverned(ctx context.Context, db *sql.DB, partnerID string, input TransitionInput, expectedVersion int) (Partner, ActivationEvent, error) {
	if expectedVersion < 1 {
		return Partner{}, ActivationEvent{}, ErrExpectedVersionRequired
	}
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		input.IdempotencyKey = governedMutationKey("partner-transition", partnerID, fmt.Sprint(expectedVersion), string(input.ToStatus), input.Reason)
	}
	if strings.TrimSpace(input.CorrelationID) == "" {
		input.CorrelationID = governedMutationKey("partner-transition-correlation", partnerID, input.IdempotencyKey)
	}
	requestHash := transitionRequestHash(partnerID, input, expectedVersion)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.ExecContext(ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		partnerID+"\x00"+input.IdempotencyKey,
	); err != nil {
		return Partner{}, ActivationEvent{}, err
	}

	var replay ActivationEvent
	var replayHash string
	err = tx.QueryRowContext(ctx, `
		SELECT id, partner_id, from_status, to_status, actor_id, actor_surface,
		       reason, correlation_id, created_at, request_hash
		FROM dsh_partner_activation_events
		WHERE partner_id = $1 AND idempotency_key = $2`,
		partnerID, input.IdempotencyKey,
	).Scan(
		&replay.ID, &replay.PartnerID, &replay.FromStatus, &replay.ToStatus,
		&replay.ActorID, &replay.ActorSurface, &replay.Reason,
		&replay.CorrelationID, &replay.CreatedAt, &replayHash,
	)
	if err == nil {
		if replayHash != requestHash {
			return Partner{}, ActivationEvent{}, ErrIdempotencyConflict
		}
		p, loadErr := loadPartnerTx(ctx, tx, partnerID, false)
		if loadErr != nil {
			return Partner{}, ActivationEvent{}, loadErr
		}
		if err := tx.Commit(); err != nil {
			return Partner{}, ActivationEvent{}, err
		}
		return SanitizePartnerForSurface(p), replay, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ActivationEvent{}, err
	}

	current, err := loadPartnerTx(ctx, tx, partnerID, true)
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}
	if current.Version != expectedVersion {
		return Partner{}, ActivationEvent{}, ErrVersionConflict
	}
	if !IsTransitionAllowed(current.ActivationStatus, input.ToStatus) {
		return Partner{}, ActivationEvent{}, ErrInvalidTransition
	}
	if (input.ToStatus == StatusOpsRejected || input.ToStatus == StatusPartnerDeactivated) && strings.TrimSpace(input.Reason) == "" {
		return Partner{}, ActivationEvent{}, ErrInvalid
	}
	if err := validateTransitionReadinessTx(ctx, tx, current, input.ToStatus); err != nil {
		return Partner{}, ActivationEvent{}, err
	}

	updated, err := scanGovernedPartner(tx.QueryRowContext(ctx, `
		UPDATE dsh_partners SET
			activation_status = $2,
			version = version + 1,
			updated_at = NOW()
		WHERE id = $1 AND version = $3
		RETURNING `+governedPartnerColumns,
		partnerID, input.ToStatus, expectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ActivationEvent{}, ErrVersionConflict
	}
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}

	var event ActivationEvent
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_partner_activation_events
			(partner_id, from_status, to_status, actor_id, actor_surface, reason,
			 correlation_id, idempotency_key, request_hash)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, partner_id, from_status, to_status, actor_id, actor_surface,
		          reason, correlation_id, created_at`,
		partnerID, string(current.ActivationStatus), string(input.ToStatus),
		input.ActorID, input.ActorSurface, input.Reason, input.CorrelationID,
		input.IdempotencyKey, requestHash,
	).Scan(
		&event.ID, &event.PartnerID, &event.FromStatus, &event.ToStatus,
		&event.ActorID, &event.ActorSurface, &event.Reason,
		&event.CorrelationID, &event.CreatedAt,
	)
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}

	if readiness, ok := partnerReadinessForActivationStatus(input.ToStatus); ok {
		if _, err = tx.ExecContext(ctx, `
			UPDATE dsh_stores
			SET partner_readiness = $2, version = version + 1, updated_at = NOW()
			WHERE partner_id = $1`, partnerID, readiness); err != nil {
			return Partner{}, ActivationEvent{}, err
		}
		var storeID string
		_ = tx.QueryRowContext(ctx, `SELECT id FROM dsh_stores WHERE partner_id = $1 ORDER BY created_at ASC LIMIT 1`, partnerID).Scan(&storeID)
		if storeID != "" {
			role := "operator"
			if input.ActorSurface == "app-field" {
				role = "field"
			}
			_, err = tx.ExecContext(ctx, `
				INSERT INTO dsh_store_action_audit
					(id, actor_id, actor_role, store_id, action, from_state, to_state,
					 reason, correlation_id, created_at)
				VALUES ($1,$2,$3,$4,'store_partner_readiness_updated','{}'::jsonb,'{}'::jsonb,$5,$6,NOW())`,
				"evt-"+event.ID, input.ActorID, role, storeID,
				"partner transition to "+string(input.ToStatus), input.CorrelationID,
			)
			if err != nil {
				return Partner{}, ActivationEvent{}, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return Partner{}, ActivationEvent{}, err
	}
	return SanitizePartnerForSurface(updated), event, nil
}

func LinkPartnerStoreGoverned(ctx context.Context, db *sql.DB, partnerID, storeID, actorID string) ([]PartnerLinkedStore, error) {
	partnerID = strings.TrimSpace(partnerID)
	storeID = strings.TrimSpace(storeID)
	actorID = strings.TrimSpace(actorID)
	if partnerID == "" || storeID == "" || actorID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var partnerExists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_partners WHERE id = $1)`, partnerID).Scan(&partnerExists); err != nil {
		return nil, err
	}
	if !partnerExists {
		return nil, ErrNotFound
	}

	var currentPartnerID sql.NullString
	if err := tx.QueryRowContext(ctx, `SELECT partner_id FROM dsh_stores WHERE id = $1 FOR UPDATE`, storeID).Scan(&currentPartnerID); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if currentPartnerID.Valid && currentPartnerID.String != "" && currentPartnerID.String != partnerID {
		return nil, ErrStoreOwnershipConflict
	}
	if !currentPartnerID.Valid || currentPartnerID.String == "" {
		if _, err := tx.ExecContext(ctx, `
			UPDATE dsh_stores
			SET partner_id = $1, partner_readiness = 'pending',
			    version = version + 1, updated_at = NOW()
			WHERE id = $2`, partnerID, storeID); err != nil {
			return nil, err
		}
		if err := recordActivationEvent(tx, partnerID, "store_linked:"+storeID, actorID, "control-panel", ""); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return ListPartnerStores(db, partnerID)
}

func CreateFieldVisitGoverned(db *sql.DB, input CreateFieldVisitInput) (FieldVisit, error) {
	if strings.TrimSpace(input.PartnerID) == "" || strings.TrimSpace(input.FieldActorID) == "" {
		return FieldVisit{}, ErrInvalid
	}
	if strings.TrimSpace(input.VisitNotes) == "" && input.LocationLatitude == nil && len(input.EvidenceMediaRefs) == 0 {
		return FieldVisit{}, fmt.Errorf("%w: field visit requires notes, location, or evidence", ErrInvalid)
	}
	if strings.TrimSpace(input.StoreID) == "" {
		if err := db.QueryRow(`
			SELECT id FROM dsh_stores
			WHERE partner_id = $1
			ORDER BY created_at ASC
			LIMIT 1`, input.PartnerID).Scan(&input.StoreID); errors.Is(err, sql.ErrNoRows) {
			return FieldVisit{}, fmt.Errorf("%w: partner has no linked store", ErrReadinessGate)
		} else if err != nil {
			return FieldVisit{}, err
		}
	}
	return CreateFieldVisit(db, input)
}

func FindLatestTransitionEvent(db *sql.DB, partnerID string, status ActivationStatus) (ActivationEvent, error) {
	var event ActivationEvent
	err := db.QueryRow(`
		SELECT id, partner_id, from_status, to_status, actor_id, actor_surface,
		       reason, correlation_id, created_at
		FROM dsh_partner_activation_events
		WHERE partner_id = $1 AND to_status = $2
		ORDER BY created_at DESC
		LIMIT 1`, partnerID, status,
	).Scan(
		&event.ID, &event.PartnerID, &event.FromStatus, &event.ToStatus,
		&event.ActorID, &event.ActorSurface, &event.Reason,
		&event.CorrelationID, &event.CreatedAt,
	)
	return event, err
}

func loadPartnerTx(ctx context.Context, tx *sql.Tx, partnerID string, forUpdate bool) (Partner, error) {
	query := `SELECT ` + governedPartnerColumns + ` FROM dsh_partners WHERE id = $1`
	if forUpdate {
		query += ` FOR UPDATE`
	}
	p, err := scanGovernedPartner(tx.QueryRowContext(ctx, query, partnerID))
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ErrNotFound
	}
	return p, err
}

type onboardingStoreGate struct {
	ID                  string
	DisplayName         string
	CityCode            string
	ServiceAreaCode     string
	AddressLine         string
	OperatingHours      string
	DeliveryReadiness   string
	Status              string
	IsVisible           bool
	Serviceability      string
	PartnerReadiness    string
	CatalogApproval     string
	MarketingVisibility string
}

func loadOnboardingStoreGateTx(ctx context.Context, tx *sql.Tx, partnerID string) (onboardingStoreGate, error) {
	var gate onboardingStoreGate
	err := tx.QueryRowContext(ctx, `
		SELECT id, display_name, city_code, service_area_code, address_line,
		       operating_hours, delivery_readiness, status, is_visible,
		       serviceability_status, partner_readiness, catalog_approval_status,
		       marketing_visibility
		FROM dsh_stores
		WHERE partner_id = $1
		ORDER BY created_at ASC
		LIMIT 1`, partnerID,
	).Scan(
		&gate.ID, &gate.DisplayName, &gate.CityCode, &gate.ServiceAreaCode,
		&gate.AddressLine, &gate.OperatingHours, &gate.DeliveryReadiness,
		&gate.Status, &gate.IsVisible, &gate.Serviceability,
		&gate.PartnerReadiness, &gate.CatalogApproval, &gate.MarketingVisibility,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return onboardingStoreGate{}, fmt.Errorf("%w: no store is linked to the partner", ErrReadinessGate)
	}
	return gate, err
}

func validateTransitionReadinessTx(ctx context.Context, tx *sql.Tx, p Partner, target ActivationStatus) error {
	requiresProfile := target == StatusSubmitted || target == StatusOpsReview || target == StatusPartnerActive
	requiresDocuments := target == StatusDocumentsVerified || target == StatusOpsReview || target == StatusPartnerActive
	requiresVisit := target == StatusPartnerActive
	requiresPublication := target == StatusClientVisible

	var gate onboardingStoreGate
	var err error
	if requiresProfile || requiresVisit || requiresPublication {
		gate, err = loadOnboardingStoreGateTx(ctx, tx, p.ID)
		if err != nil {
			return err
		}
	}

	if requiresProfile {
		if strings.TrimSpace(p.LegalNameAr) == "" ||
			strings.TrimSpace(p.LegalIdentityNumber) == "" ||
			strings.TrimSpace(p.OwnerName) == "" ||
			strings.TrimSpace(p.PrimaryPhone) == "" {
			return fmt.Errorf("%w: legal identity, owner, and primary phone must be complete", ErrReadinessGate)
		}
		if strings.TrimSpace(gate.DisplayName) == "" ||
			strings.TrimSpace(gate.CityCode) == "" ||
			strings.TrimSpace(gate.ServiceAreaCode) == "" ||
			strings.TrimSpace(gate.AddressLine) == "" ||
			strings.TrimSpace(gate.OperatingHours) == "" ||
			strings.TrimSpace(gate.DeliveryReadiness) == "" {
			return fmt.Errorf("%w: store location and operating profile must be complete", ErrReadinessGate)
		}
		if strings.TrimSpace(p.PayoutDestinationID) == "" {
			return fmt.Errorf("%w: an active WLT payout destination is required", ErrReadinessGate)
		}
	}

	if requiresDocuments {
		var total, approved int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*), COUNT(*) FILTER (WHERE document_status = 'approved')
			FROM dsh_partner_documents
			WHERE partner_id = $1`, p.ID).Scan(&total, &approved); err != nil {
			return err
		}
		if total == 0 || approved != total {
			return fmt.Errorf("%w: every uploaded partner document must be approved", ErrReadinessGate)
		}
	}

	if requiresVisit {
		var evidenceVisits int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM dsh_partner_field_visits
			WHERE partner_id = $1
			  AND visit_status = 'submitted'
			  AND store_id IS NOT NULL
			  AND (
			    btrim(visit_notes) <> '' OR
			    location_latitude IS NOT NULL OR
			    cardinality(evidence_media_refs) > 0
			  )`, p.ID).Scan(&evidenceVisits); err != nil {
			return err
		}
		if evidenceVisits == 0 {
			return fmt.Errorf("%w: a submitted evidence-bearing field visit is required", ErrReadinessGate)
		}
	}

	if requiresPublication {
		if gate.Status != "active" ||
			!gate.IsVisible ||
			(gate.Serviceability != "serviceable" && gate.Serviceability != "limited") ||
			gate.PartnerReadiness != "ready" ||
			gate.CatalogApproval != "approved" ||
			gate.MarketingVisibility != "visible" {
			return ErrStorePublicationGatesFailed
		}
	}
	return nil
}

func transitionRequestHash(partnerID string, input TransitionInput, expectedVersion int) string {
	canonical := struct {
		PartnerID       string           `json:"partnerId"`
		ExpectedVersion int              `json:"expectedVersion"`
		ToStatus        ActivationStatus `json:"toStatus"`
		Reason          string           `json:"reason"`
		ActorID         string           `json:"actorId"`
		ActorSurface    string           `json:"actorSurface"`
	}{
		PartnerID: partnerID, ExpectedVersion: expectedVersion,
		ToStatus: input.ToStatus, Reason: strings.TrimSpace(input.Reason),
		ActorID: input.ActorID, ActorSurface: input.ActorSurface,
	}
	encoded, _ := json.Marshal(canonical)
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func governedMutationKey(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(sum[:])
}

// Keep time imported in this owner file because event/audit timestamps are
// part of the same transition ownership boundary and used by compatibility
// callers compiled with older repository helpers.
var _ = time.Time{}
