package partner

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"

	"dsh-api/internal/store"
)

// ─── Partner CRUD ──────────────────────────────────────────────────────────

func CreatePartner(db *sql.DB, input CreatePartnerInput) (Partner, error) {
	if err := input.Validate(); err != nil {
		return Partner{}, err
	}

	category := input.Category
	if category == "" {
		category = "default"
	}
	surface := input.CreatedBySurface
	if surface == "" {
		surface = "app-field"
	}

	tx, err := db.Begin()
	if err != nil {
		return Partner{}, err
	}
	defer tx.Rollback()

	var p Partner
	err = tx.QueryRow(`
		INSERT INTO dsh_partners (
			legal_name_ar, legal_name_en, display_name,
			legal_identity_type, legal_identity_number,
			owner_name, primary_phone, secondary_phone, email,
			category, notes, created_by_actor_id, created_by_surface
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, legal_name_ar, legal_name_en, display_name,
		          legal_identity_type, legal_identity_number,
		          owner_name, primary_phone, secondary_phone, email,
		          category, activation_status, created_by_actor_id, created_by_surface,
		          notes,
		          COALESCE(payout_destination_id,''), COALESCE(masked_account_number,''),
		          COALESCE(masked_iban,''), COALESCE(masked_mobile_number,''),
		          beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban,
		          payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes,
		          version, created_at, updated_at`,
		input.LegalNameAr, input.LegalNameEn, input.DisplayName,
		input.LegalIdentityType, input.LegalIdentityNumber,
		input.OwnerName, input.PrimaryPhone, input.SecondaryPhone, input.Email,
		category, input.Notes, input.CreatedByActorID, surface,
	).Scan(
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
	if err != nil {
		if isPgUniqueViolation(err) {
			return Partner{}, ErrConflict
		}
		return Partner{}, err
	}

	// Every partner owns exactly one store from creation onward (app-field
	// collects the first store's data as part of the onboarding file). The
	// store starts fully unpublished — is_visible=false, status=inactive —
	// and stays invisible to app-client until control-panel approves it.
	sRow, err := store.CreateDraftStore(tx, store.CreateDraftStoreInput{
		PartnerID:   p.ID,
		DisplayName: p.DisplayName,
		Category:    p.Category,
	})
	if err != nil {
		return Partner{}, err
	}

	if input.CreatedByActorID != "" {
		_, err = tx.Exec(`
			INSERT INTO dsh_store_actor_scopes (actor_id, actor_role, store_id, scope_type, active)
			VALUES ($1, 'field', $2, 'assigned', true)
			ON CONFLICT (actor_id, actor_role, store_id) DO NOTHING`,
			input.CreatedByActorID, sRow.ID)
		if err != nil {
			return Partner{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Partner{}, err
	}

	return p, nil
}

func GetPartner(db *sql.DB, partnerID string) (Partner, error) {
	var p Partner
	err := db.QueryRow(`
		SELECT id, legal_name_ar, legal_name_en, display_name,
		       legal_identity_type, legal_identity_number,
		       owner_name, primary_phone, secondary_phone, email,
		       category, activation_status, created_by_actor_id, created_by_surface,
		       notes,
		       COALESCE(payout_destination_id,''), COALESCE(masked_account_number,''),
		       COALESCE(masked_iban,''), COALESCE(masked_mobile_number,''),
		       beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban,
		       payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes,
		       version, created_at, updated_at
		FROM dsh_partners WHERE id = $1`, partnerID,
	).Scan(
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
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ErrNotFound
	}
	return p, err
}

func ListPartners(db *sql.DB, q PartnerListQuery) ([]PartnerSummary, int, error) {
	if q.Limit <= 0 {
		q.Limit = 20
	}
	if q.Limit > 100 {
		q.Limit = 100
	}

	args := []any{}
	conds := []string{}
	i := 1
	if q.ActivationStatus != "" {
		conds = append(conds, "activation_status = $"+itoa(i))
		args = append(args, q.ActivationStatus)
		i++
	}
	if q.CreatedByActorID != "" {
		conds = append(conds, "created_by_actor_id = $"+itoa(i))
		args = append(args, q.CreatedByActorID)
		i++
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partners`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, q.Limit, q.Offset)
	rows, err := db.Query(`
		SELECT id, display_name, legal_name_ar, category, activation_status, primary_phone, created_at, updated_at
		FROM dsh_partners`+where+`
		ORDER BY created_at DESC
		LIMIT $`+itoa(i)+` OFFSET $`+itoa(i+1),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []PartnerSummary
	for rows.Next() {
		var s PartnerSummary
		if err := rows.Scan(&s.ID, &s.DisplayName, &s.LegalNameAr, &s.Category,
			&s.ActivationStatus, &s.PrimaryPhone, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, s)
	}
	if list == nil {
		list = []PartnerSummary{}
	}
	return list, total, rows.Err()
}

func UpdatePartner(db *sql.DB, partnerID string, input UpdatePartnerInput, expectedVersion int) (Partner, error) {
	var p Partner
	var holderMatchesOwner sql.NullBool
	if input.BankAccountHolderMatchesOwner != nil {
		holderMatchesOwner = sql.NullBool{Bool: *input.BankAccountHolderMatchesOwner, Valid: true}
	}
	err := db.QueryRow(`
		UPDATE dsh_partners SET
			display_name         = COALESCE(NULLIF($2,''), display_name),
			owner_name           = COALESCE(NULLIF($3,''), owner_name),
			primary_phone        = COALESCE(NULLIF($4,''), primary_phone),
			secondary_phone      = COALESCE(NULLIF($5,''), secondary_phone),
			email                = COALESCE(NULLIF($6,''), email),
			notes                = COALESCE(NULLIF($7,''), notes),
			beneficiary_name     = COALESCE(NULLIF($9,''), beneficiary_name),
			bank_name            = COALESCE(NULLIF($10,''), bank_name),
			bank_branch          = COALESCE(NULLIF($11,''), bank_branch),
			bank_account_number  = COALESCE(NULLIF($12,''), bank_account_number),
			bank_iban            = COALESCE(NULLIF($13,''), bank_iban),
			payout_mobile_number = COALESCE(NULLIF($14,''), payout_mobile_number),
			settlement_preference = COALESCE(NULLIF($15,''), settlement_preference),
			bank_account_holder_matches_owner = COALESCE($16, bank_account_holder_matches_owner),
			bank_notes           = COALESCE(NULLIF($17,''), bank_notes),
			payout_destination_id  = COALESCE(NULLIF($18,''), payout_destination_id),
			masked_account_number  = COALESCE(NULLIF($19,''), masked_account_number),
			masked_iban            = COALESCE(NULLIF($20,''), masked_iban),
			masked_mobile_number   = COALESCE(NULLIF($21,''), masked_mobile_number),
			version          = version + 1,
			updated_at       = NOW()
		WHERE id = $1 AND version = $8
		RETURNING id, legal_name_ar, legal_name_en, display_name,
		          legal_identity_type, legal_identity_number,
		          owner_name, primary_phone, secondary_phone, email,
		          category, activation_status, created_by_actor_id, created_by_surface,
		          notes,
		          COALESCE(payout_destination_id,''), COALESCE(masked_account_number,''),
		          COALESCE(masked_iban,''), COALESCE(masked_mobile_number,''),
		          beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban,
		          payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes,
		          version, created_at, updated_at`,
		partnerID, input.DisplayName, input.OwnerName,
		input.PrimaryPhone, input.SecondaryPhone, input.Email,
		input.Notes, expectedVersion,
		input.BeneficiaryName, input.BankName, input.BankBranch, input.BankAccountNumber, input.BankIBAN,
		input.PayoutMobileNumber, input.SettlementPreference, holderMatchesOwner, input.BankNotes,
		input.PayoutDestinationID, input.MaskedAccountNumber, input.MaskedIBAN, input.MaskedMobileNumber,
	).Scan(
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
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ErrNotFound
	}
	return p, err
}

// ─── Activation transition ─────────────────────────────────────────────────

func TransitionStatus(db *sql.DB, partnerID string, input TransitionInput, expectedVersion int) (Partner, ActivationEvent, error) {
	tx, err := db.Begin()
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var current Partner
	err = tx.QueryRow(`
		SELECT id, activation_status, version
		FROM dsh_partners WHERE id = $1 FOR UPDATE`, partnerID,
	).Scan(&current.ID, &current.ActivationStatus, &current.Version)
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ActivationEvent{}, ErrNotFound
	}
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}

	if expectedVersion > 0 && current.Version != expectedVersion {
		return Partner{}, ActivationEvent{}, ErrConflict
	}

	if !IsTransitionAllowed(current.ActivationStatus, input.ToStatus) {
		return Partner{}, ActivationEvent{}, ErrInvalidTransition
	}

	if (input.ToStatus == StatusOpsRejected || input.ToStatus == StatusPartnerDeactivated) && strings.TrimSpace(input.Reason) == "" {
		return Partner{}, ActivationEvent{}, ErrInvalid
	}

	if input.ToStatus == StatusClientVisible {
		var storeID string
		var storeStatus string
		var storeIsVisible bool
		var storeServiceability string
		var storePartnerReadiness string
		var storeCatalogApproval string
		var storeMarketingVisibility string

		err = tx.QueryRow(`
			SELECT id, status, is_visible, serviceability_status, partner_readiness, catalog_approval_status, marketing_visibility
			FROM dsh_stores WHERE partner_id = $1 ORDER BY created_at ASC LIMIT 1`, partnerID,
		).Scan(&storeID, &storeStatus, &storeIsVisible, &storeServiceability, &storePartnerReadiness, &storeCatalogApproval, &storeMarketingVisibility)
		if errors.Is(err, sql.ErrNoRows) {
			return Partner{}, ActivationEvent{}, errors.New("store publication gates failed: no linked store found")
		}
		if err != nil {
			return Partner{}, ActivationEvent{}, err
		}

		if storeStatus != "active" ||
			!storeIsVisible ||
			(storeServiceability != "serviceable" && storeServiceability != "limited") ||
			storePartnerReadiness != "ready" ||
			storeCatalogApproval != "approved" ||
			storeMarketingVisibility != "visible" {
			return Partner{}, ActivationEvent{}, ErrStorePublicationGatesFailed
		}
	}

	var updated Partner
	err = tx.QueryRow(`
		UPDATE dsh_partners SET
			activation_status = $2,
			version           = version + 1,
			updated_at        = NOW()
		WHERE id = $1
		RETURNING id, legal_name_ar, legal_name_en, display_name,
		          legal_identity_type, legal_identity_number,
		          owner_name, primary_phone, secondary_phone, email,
		          category, activation_status, created_by_actor_id, created_by_surface,
		          notes,
		          beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban,
		          payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes,
		          version, created_at, updated_at`,
		partnerID, input.ToStatus,
	).Scan(
		&updated.ID, &updated.LegalNameAr, &updated.LegalNameEn, &updated.DisplayName,
		&updated.LegalIdentityType, &updated.LegalIdentityNumber,
		&updated.OwnerName, &updated.PrimaryPhone, &updated.SecondaryPhone, &updated.Email,
		&updated.Category, &updated.ActivationStatus, &updated.CreatedByActorID, &updated.CreatedBySurface,
		&updated.Notes,
		&updated.BeneficiaryName, &updated.BankName, &updated.BankBranch, &updated.BankAccountNumber, &updated.BankIBAN,
		&updated.PayoutMobileNumber, &updated.SettlementPreference, &updated.BankAccountHolderMatchesOwner, &updated.BankNotes,
		&updated.Version, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}

	var evt ActivationEvent
	err = tx.QueryRow(`
		INSERT INTO dsh_partner_activation_events
			(partner_id, from_status, to_status, actor_id, actor_surface, reason, correlation_id, idempotency_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, partner_id, from_status, to_status, actor_id, actor_surface, reason, correlation_id, created_at`,
		partnerID, string(current.ActivationStatus), string(input.ToStatus),
		input.ActorID, input.ActorSurface, input.Reason, input.CorrelationID, input.IdempotencyKey,
	).Scan(&evt.ID, &evt.PartnerID, &evt.FromStatus, &evt.ToStatus,
		&evt.ActorID, &evt.ActorSurface, &evt.Reason, &evt.CorrelationID, &evt.CreatedAt)
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}

	// Propagate partner_readiness to linked stores inside the same transaction.
	// client_visible → stores become discoverable; client_hidden/deactivated → stores hidden.
	if readiness, ok := partnerReadinessForActivationStatus(input.ToStatus); ok {
		if _, err = tx.Exec(
			`UPDATE dsh_stores SET partner_readiness = $2, version = version + 1, updated_at = NOW() WHERE partner_id = $1`,
			partnerID, readiness,
		); err != nil {
			return Partner{}, ActivationEvent{}, err
		}

		// Write to dsh_store_action_audit
		var storeID string
		_ = tx.QueryRow(`SELECT id FROM dsh_stores WHERE partner_id = $1 ORDER BY created_at ASC LIMIT 1`, partnerID).Scan(&storeID)
		if storeID != "" {
			auditID := "evt-" + itoa(int(time.Now().UnixNano()))
			action := "store_partner_readiness_updated"
			reason := "partner transition to " + string(input.ToStatus)
			role := "operator"
			if input.ActorSurface == "app-field" {
				role = "field"
			}
			_, _ = tx.Exec(`
				INSERT INTO dsh_store_action_audit
				  (id, actor_id, actor_role, store_id, action, from_state, to_state, reason, correlation_id, created_at)
				VALUES ($1,$2,$3,$4,$5,'{}'::jsonb,'{}'::jsonb,$6,$7,NOW())`,
				auditID, input.ActorID, role, storeID, action, reason, input.CorrelationID,
			)
		}
	}

	if err := tx.Commit(); err != nil {
		return Partner{}, ActivationEvent{}, err
	}
	return updated, evt, nil
}

func partnerReadinessForActivationStatus(status ActivationStatus) (string, bool) {
	switch status {
	case StatusClientVisible:
		return "ready", true
	case StatusClientHidden, StatusPartnerDeactivated:
		return "blocked", true
	default:
		return "", false
	}
}

// ─── Documents ─────────────────────────────────────────────────────────────

func UploadDocument(db *sql.DB, partnerID string, input UploadDocumentInput) (Document, error) {
	if err := input.Validate(); err != nil {
		return Document{}, err
	}
	// verify partner exists
	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM dsh_partners WHERE id=$1)`, partnerID).Scan(&exists); err != nil {
		return Document{}, err
	}
	if !exists {
		return Document{}, ErrNotFound
	}

	tx, err := db.Begin()
	if err != nil {
		return Document{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var d Document
	err = tx.QueryRow(`
		INSERT INTO dsh_partner_documents
			(partner_id, document_type, media_ref, notes, uploaded_by_actor_id)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id, partner_id, document_type, document_status, uploaded_by_actor_id,
		          media_ref, notes, rejection_reason, version, created_at, updated_at`,
		partnerID, input.DocumentType, input.MediaRef, input.Notes, input.UploadedByActorID,
	).Scan(&d.ID, &d.PartnerID, &d.DocumentType, &d.DocumentStatus, &d.UploadedByActorID,
		&d.MediaRef, &d.Notes, &d.RejectionReason, &d.Version, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return Document{}, err
	}
	if err := recordActivationEvent(tx, partnerID, "document_uploaded:"+d.DocumentType, input.UploadedByActorID, "app-field", input.Notes); err != nil {
		return Document{}, err
	}
	if err := tx.Commit(); err != nil {
		return Document{}, err
	}
	return d, nil
}

func ListDocuments(db *sql.DB, partnerID string) ([]Document, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, document_type, document_status, uploaded_by_actor_id,
		       media_ref, notes, rejection_reason, version, created_at, updated_at
		FROM dsh_partner_documents WHERE partner_id = $1 ORDER BY created_at ASC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Document
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.PartnerID, &d.DocumentType, &d.DocumentStatus,
			&d.UploadedByActorID, &d.MediaRef, &d.Notes, &d.RejectionReason,
			&d.Version, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	if list == nil {
		list = []Document{}
	}
	return list, rows.Err()
}

func ReviewDocument(db *sql.DB, partnerID, documentID string, input ReviewDocumentInput) (Document, DocumentReview, error) {
	if err := input.Validate(); err != nil {
		return Document{}, DocumentReview{}, err
	}

	tx, err := db.Begin()
	if err != nil {
		return Document{}, DocumentReview{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	// Map decision to document_status
	newDocStatus := "under_review"
	switch input.Decision {
	case "approved":
		newDocStatus = "approved"
	case "rejected", "needs_resubmit":
		newDocStatus = "rejected"
	}

	var d Document
	err = tx.QueryRow(`
		UPDATE dsh_partner_documents SET
			document_status  = $3,
			rejection_reason = CASE WHEN $4='' THEN rejection_reason ELSE $4 END,
			version          = version + 1,
			updated_at       = NOW()
		WHERE id = $1 AND partner_id = $2
		RETURNING id, partner_id, document_type, document_status, uploaded_by_actor_id,
		          media_ref, notes, rejection_reason, version, created_at, updated_at`,
		documentID, partnerID, newDocStatus, input.Reason,
	).Scan(&d.ID, &d.PartnerID, &d.DocumentType, &d.DocumentStatus, &d.UploadedByActorID,
		&d.MediaRef, &d.Notes, &d.RejectionReason, &d.Version, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Document{}, DocumentReview{}, ErrNotFound
	}
	if err != nil {
		return Document{}, DocumentReview{}, err
	}

	var rev DocumentReview
	err = tx.QueryRow(`
		INSERT INTO dsh_partner_document_reviews
			(document_id, partner_id, reviewed_by_actor_id, decision, reason, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, document_id, partner_id, reviewed_by_actor_id, decision, reason, correlation_id, created_at`,
		documentID, partnerID, input.ReviewedByActorID, input.Decision, input.Reason, input.CorrelationID,
	).Scan(&rev.ID, &rev.DocumentID, &rev.PartnerID, &rev.ReviewedByActorID,
		&rev.Decision, &rev.Reason, &rev.CorrelationID, &rev.CreatedAt)
	if err != nil {
		return Document{}, DocumentReview{}, err
	}

	if err := recordActivationEvent(tx, partnerID, "document_reviewed:"+input.Decision, input.ReviewedByActorID, "control-panel", input.Reason); err != nil {
		return Document{}, DocumentReview{}, err
	}

	if err := tx.Commit(); err != nil {
		return Document{}, DocumentReview{}, err
	}
	return d, rev, nil
}

// ─── Field visits ──────────────────────────────────────────────────────────

func CreateFieldVisit(db *sql.DB, input CreateFieldVisitInput) (FieldVisit, error) {
	if input.PartnerID == "" || input.FieldActorID == "" {
		return FieldVisit{}, ErrInvalid
	}
	if (input.LocationLatitude == nil) != (input.LocationLongitude == nil) {
		return FieldVisit{}, ErrInvalid
	}

	var storeIDSQL sql.NullString
	if input.StoreID != "" {
		var partnerID sql.NullString
		err := db.QueryRow(`SELECT partner_id FROM dsh_stores WHERE id = $1`, input.StoreID).Scan(&partnerID)
		if errors.Is(err, sql.ErrNoRows) {
			return FieldVisit{}, ErrInvalid
		}
		if err != nil {
			return FieldVisit{}, err
		}
		if !partnerID.Valid || partnerID.String != input.PartnerID {
			return FieldVisit{}, ErrInvalid
		}
		storeIDSQL = sql.NullString{String: input.StoreID, Valid: true}
	}

	var latSQL, lonSQL sql.NullFloat64
	if input.LocationLatitude != nil {
		latSQL = sql.NullFloat64{Float64: *input.LocationLatitude, Valid: true}
		lonSQL = sql.NullFloat64{Float64: *input.LocationLongitude, Valid: true}
	}

	mediaRefs := input.EvidenceMediaRefs
	if mediaRefs == nil {
		mediaRefs = []string{}
	}

	tx, err := db.Begin()
	if err != nil {
		return FieldVisit{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var v FieldVisit
	var lat, lon sql.NullFloat64
	var submittedAt sql.NullTime
	var storeIDOut sql.NullString
	err = tx.QueryRow(`
		INSERT INTO dsh_partner_field_visits
			(partner_id, store_id, field_actor_id, visit_status, visit_notes, location_latitude, location_longitude, evidence_media_refs, submitted_at)
		VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,NOW())
		RETURNING id, partner_id, COALESCE(store_id,''), field_actor_id, visit_status,
		          visit_notes, location_latitude, location_longitude, evidence_media_refs,
		          version, created_at, submitted_at`,
		input.PartnerID, storeIDSQL, input.FieldActorID, input.VisitNotes, latSQL, lonSQL, pq.Array(mediaRefs),
	).Scan(&v.ID, &v.PartnerID, &storeIDOut, &v.FieldActorID, &v.VisitStatus,
		&v.VisitNotes, &lat, &lon, pq.Array(&v.EvidenceMediaRefs),
		&v.Version, &v.CreatedAt, &submittedAt)
	if err != nil {
		return FieldVisit{}, err
	}
	if err := recordActivationEvent(tx, input.PartnerID, "field_visit_submitted", input.FieldActorID, "app-field", input.VisitNotes); err != nil {
		return FieldVisit{}, err
	}
	if err := tx.Commit(); err != nil {
		return FieldVisit{}, err
	}
	if lat.Valid {
		v.LocationLatitude = &lat.Float64
	}
	if lon.Valid {
		v.LocationLongitude = &lon.Float64
	}
	if submittedAt.Valid {
		v.SubmittedAt = &submittedAt.Time
	}
	v.StoreID = storeIDOut.String
	if v.EvidenceMediaRefs == nil {
		v.EvidenceMediaRefs = []string{}
	}
	return v, nil
}

func ListPartnerStores(db *sql.DB, partnerID string) ([]PartnerLinkedStore, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, slug, display_name, status, is_visible, city_code, created_at
		FROM dsh_stores
		WHERE partner_id = $1
		ORDER BY display_name ASC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stores := []PartnerLinkedStore{}
	for rows.Next() {
		var s PartnerLinkedStore
		var createdAt time.Time
		if err := rows.Scan(&s.ID, &s.PartnerID, &s.Slug, &s.DisplayName, &s.Status, &s.IsVisible, &s.CityCode, &createdAt); err != nil {
			return nil, err
		}
		s.CreatedAt = createdAt.UTC().Format(time.RFC3339Nano)
		stores = append(stores, s)
	}
	return stores, rows.Err()
}

func LinkPartnerStore(db *sql.DB, partnerID, storeID, actorID string) ([]PartnerLinkedStore, error) {
	if partnerID == "" || storeID == "" {
		return nil, ErrInvalid
	}
	res, err := db.Exec(`
		UPDATE dsh_stores
		SET partner_id = $1,
		    partner_readiness = 'pending',
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $2`, partnerID, storeID)
	if err != nil {
		return nil, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, ErrNotFound
	}
	if err := recordActivationEvent(db, partnerID, "store_linked:"+storeID, actorID, "control-panel", ""); err != nil {
		return nil, err
	}
	return ListPartnerStores(db, partnerID)
}

func ListFieldVisits(db *sql.DB, partnerID string) ([]FieldVisit, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, COALESCE(store_id,''), field_actor_id, visit_status,
		       visit_notes, location_latitude, location_longitude, evidence_media_refs,
		       version, created_at, submitted_at
		FROM dsh_partner_field_visits WHERE partner_id = $1 ORDER BY created_at DESC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []FieldVisit
	for rows.Next() {
		var v FieldVisit
		var lat, lon sql.NullFloat64
		var submittedAt sql.NullTime
		var storeIDOut sql.NullString
		if err := rows.Scan(&v.ID, &v.PartnerID, &storeIDOut, &v.FieldActorID, &v.VisitStatus,
			&v.VisitNotes, &lat, &lon, pq.Array(&v.EvidenceMediaRefs),
			&v.Version, &v.CreatedAt, &submittedAt); err != nil {
			return nil, err
		}
		if lat.Valid {
			v.LocationLatitude = &lat.Float64
		}
		if lon.Valid {
			v.LocationLongitude = &lon.Float64
		}
		if submittedAt.Valid {
			t := submittedAt.Time
			v.SubmittedAt = &t
		}
		v.StoreID = storeIDOut.String
		if v.EvidenceMediaRefs == nil {
			v.EvidenceMediaRefs = []string{}
		}
		list = append(list, v)
	}
	if list == nil {
		list = []FieldVisit{}
	}
	return list, rows.Err()
}

func SubmitFieldVisit(db *sql.DB, partnerID, visitID, actorID string) (FieldVisit, error) {
	now := time.Now()
	var v FieldVisit
	var lat, lon sql.NullFloat64
	var submittedAt sql.NullTime
	var storeIDOut sql.NullString
	err := db.QueryRow(`
		UPDATE dsh_partner_field_visits SET
			visit_status = 'submitted',
			submitted_at = $4,
			version      = version + 1
		WHERE id = $1 AND partner_id = $2 AND field_actor_id = $3 AND visit_status IN ('draft','in_progress')
		RETURNING id, partner_id, COALESCE(store_id,''), field_actor_id, visit_status,
		          visit_notes, location_latitude, location_longitude, evidence_media_refs,
		          version, created_at, submitted_at`,
		visitID, partnerID, actorID, now,
	).Scan(&v.ID, &v.PartnerID, &storeIDOut, &v.FieldActorID, &v.VisitStatus,
		&v.VisitNotes, &lat, &lon, pq.Array(&v.EvidenceMediaRefs),
		&v.Version, &v.CreatedAt, &submittedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return FieldVisit{}, ErrNotFound
	}
	if err != nil {
		return FieldVisit{}, err
	}
	if lat.Valid {
		v.LocationLatitude = &lat.Float64
	}
	if lon.Valid {
		v.LocationLongitude = &lon.Float64
	}
	if submittedAt.Valid {
		t := submittedAt.Time
		v.SubmittedAt = &t
	}
	v.StoreID = storeIDOut.String
	if v.EvidenceMediaRefs == nil {
		v.EvidenceMediaRefs = []string{}
	}
	return v, nil
}

// ─── Activation audit ──────────────────────────────────────────────────────

// execer is satisfied by both *sql.DB and *sql.Tx, letting audit events be
// recorded either standalone or as part of an existing transaction.
type execer interface {
	Exec(query string, args ...any) (sql.Result, error)
}

// recordActivationEvent appends a non-transition activation event (document
// upload, document review, field visit, store link) to the same audit trail
// TransitionStatus writes to, so the full partner lifecycle is visible from
// a single ordered timeline instead of being scattered across tables.
func recordActivationEvent(x execer, partnerID, toStatus, actorID, actorSurface, reason string) error {
	_, err := x.Exec(`
		INSERT INTO dsh_partner_activation_events
			(partner_id, from_status, to_status, actor_id, actor_surface, reason)
		VALUES ($1, '', $2, $3, $4, $5)`,
		partnerID, toStatus, actorID, actorSurface, reason)
	return err
}

func ListActivationEvents(db *sql.DB, partnerID string) ([]ActivationEvent, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, from_status, to_status, actor_id, actor_surface, reason, correlation_id, created_at
		FROM dsh_partner_activation_events WHERE partner_id = $1 ORDER BY created_at ASC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []ActivationEvent
	for rows.Next() {
		var e ActivationEvent
		if err := rows.Scan(&e.ID, &e.PartnerID, &e.FromStatus, &e.ToStatus,
			&e.ActorID, &e.ActorSurface, &e.Reason, &e.CorrelationID, &e.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	if list == nil {
		list = []ActivationEvent{}
	}
	return list, rows.Err()
}

// ─── Store count for readiness ──────────────────────────────────────────────

func CountStores(db *sql.DB, partnerID string) (int, error) {
	var n int
	return n, db.QueryRow(`SELECT COUNT(*) FROM dsh_stores WHERE partner_id = $1`, partnerID).Scan(&n)
}

func CountApprovedDocuments(db *sql.DB, partnerID string) (int, int, error) {
	var total, approved int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partner_documents WHERE partner_id = $1`, partnerID).Scan(&total); err != nil {
		return 0, 0, err
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partner_documents WHERE partner_id = $1 AND document_status = 'approved'`, partnerID).Scan(&approved); err != nil {
		return 0, 0, err
	}
	return total, approved, nil
}

// ─── Store team members (DSH-050) ───────────────────────────────────────────

func ListStoreTeamMembers(db *sql.DB, storeID string) ([]StoreTeamMember, error) {
	rows, err := db.Query(`
		SELECT id, name, role, status, branch_assignment, permissions_summary,
		       delivery_assignment, invite_lifecycle, operational_impact, audit_note
		FROM dsh_store_team_members
		WHERE store_id = $1
		ORDER BY created_at ASC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []StoreTeamMember{}
	for rows.Next() {
		var m StoreTeamMember
		if err := rows.Scan(&m.ID, &m.Name, &m.Role, &m.Status, &m.BranchAssignment,
			&m.PermissionsSummary, &m.DeliveryAssignment, &m.InviteLifecycle,
			&m.OperationalImpact, &m.AuditNote); err != nil {
			return nil, err
		}
		m.RoleLabel = roleLabel(m.Role)
		m.StatusLabel = statusLabel(m.Status)
		m.InlineAction = inlineActionForStatus(m.Status)
		m.InlineActionLabel = inlineActionLabelForStatus(m.Status)
		members = append(members, m)
	}
	return members, rows.Err()
}

// InviteStoreTeamMember creates a pending invite row for identity against
// storeID. There is no identity-resolution service wired up yet (FIX_REQUIRED
// for a future round) — the raw identity string is stored as both the
// member's placeholder display name and the invited_identity audit field.
func InviteStoreTeamMember(db *sql.DB, storeID string, input InviteTeamMemberInput) error {
	if err := input.Validate(); err != nil {
		return err
	}
	_, err := db.Exec(`
		INSERT INTO dsh_store_team_members (
			store_id, name, role, status, invite_lifecycle, invited_identity, invited_by_actor_id
		) VALUES ($1, $2, 'staff', 'invited', 'دعوة أُرسلت وبانتظار القبول', $2, $3)`,
		storeID, input.Identity, input.InvitedByActorID)
	return err
}

// ListInvitesForPhone finds all pending team member records matching phone.
func ListInvitesForPhone(db *sql.DB, phone string) ([]StoreTeamMember, error) {
	rows, err := db.Query(`
		SELECT id, name, role, status, branch_assignment, permissions_summary,
		       delivery_assignment, invite_lifecycle, operational_impact, audit_note
		FROM dsh_store_team_members
		WHERE invited_identity = $1 AND status = 'invited'
		ORDER BY created_at ASC`, phone)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []StoreTeamMember{}
	for rows.Next() {
		var m StoreTeamMember
		if err := rows.Scan(&m.ID, &m.Name, &m.Role, &m.Status, &m.BranchAssignment,
			&m.PermissionsSummary, &m.DeliveryAssignment, &m.InviteLifecycle,
			&m.OperationalImpact, &m.AuditNote); err != nil {
			return nil, err
		}
		m.RoleLabel = roleLabel(m.Role)
		m.StatusLabel = statusLabel(m.Status)
		m.InlineAction = inlineActionForStatus(m.Status)
		m.InlineActionLabel = inlineActionLabelForStatus(m.Status)
		members = append(members, m)
	}
	return members, rows.Err()
}

// AcceptInvite binds the identity_actor_id and marks the member active.
func AcceptInvite(db *sql.DB, inviteID, actorID, actorPhone string) error {
	res, err := db.Exec(`
		UPDATE dsh_store_team_members
		SET status = 'active',
		    identity_actor_id = $1,
		    invite_lifecycle = 'دعوة مقبولة',
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $2 AND invited_identity = $3 AND status = 'invited'`,
		actorID, inviteID, actorPhone)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

// RejectInvite marks the member blocked/rejected.
func RejectInvite(db *sql.DB, inviteID, actorID, actorPhone string) error {
	res, err := db.Exec(`
		UPDATE dsh_store_team_members
		SET status = 'blocked',
		    identity_actor_id = $1,
		    invite_lifecycle = 'دعوة مرفوضة',
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $2 AND invited_identity = $3 AND status = 'invited'`,
		actorID, inviteID, actorPhone)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

// teamActionStatusMap maps the inlineActionLabel strings this backend itself
// generates (see inlineActionLabelForStatus) back to the resulting status.
// executeDshPartnerTeamMemberAction's actionLabel is free-form per the
// OpenAPI contract, but since this backend is also the sole producer of the
// labels shown to the user, the round-trip is closed and unambiguous.
var teamActionStatusMap = map[string]string{
	"pause":         "paused",
	"activate":      "active",
	"block":         "blocked",
	"resend-invite": "invited",
	"cancel-invite": "blocked",
}

// ExecuteStoreTeamMemberAction applies actionLabel to memberID, guarding
// against cross-store IDOR by requiring the member's store_id to match
// storeID. Every action is recorded in dsh_store_team_member_actions,
// including labels this backend doesn't recognize (recorded with no status
// change) so nothing is silently dropped.
func ExecuteStoreTeamMemberAction(db *sql.DB, storeID, memberID string, input TeamMemberActionInput) error {
	if err := input.Validate(); err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var currentStoreID, fromStatus string
	err = tx.QueryRow(`SELECT store_id, status FROM dsh_store_team_members WHERE id = $1`, memberID).
		Scan(&currentStoreID, &fromStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if currentStoreID != storeID {
		return ErrForbidden
	}

	toStatus := teamActionStatusMap[input.Action]
	if toStatus != "" {
		if _, err := tx.Exec(`
			UPDATE dsh_store_team_members
			SET status = $1, version = version + 1, updated_at = NOW()
			WHERE id = $2`, toStatus, memberID); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(`
		INSERT INTO dsh_store_team_member_actions (
			member_id, store_id, action_label, from_status, to_status, actor_id
		) VALUES ($1, $2, $3, $4, $5, $6)`,
		memberID, storeID, input.Action, fromStatus, toStatus, input.ActorID); err != nil {
		return err
	}

	return tx.Commit()
}

func roleLabel(role string) string {
	switch role {
	case "owner":
		return "مالك"
	case "supervisor":
		return "مشرف"
	case "courier":
		return "موصل"
	default:
		return "موظف"
	}
}

func statusLabel(status string) string {
	switch status {
	case "active":
		return "نشط"
	case "paused":
		return "موقوف"
	case "invited":
		return "بانتظار القبول"
	case "blocked":
		return "محظور"
	case "review-needed":
		return "بحاجة مراجعة"
	default:
		return status
	}
}

func inlineActionLabelForStatus(status string) string {
	switch status {
	case "active":
		return "إيقاف"
	case "paused":
		return "تفعيل"
	case "invited":
		return "إعادة إرسال الدعوة"
	case "blocked":
		return "تفعيل"
	default:
		return "مراجعة"
	}
}

func inlineActionForStatus(status string) string {
	switch status {
	case "active":
		return "pause"
	case "paused":
		return "activate"
	case "invited":
		return "resend-invite"
	case "blocked":
		return "activate"
	default:
		return ""
	}
}

// ─── Store courier settings (DSH-050) ───────────────────────────────────────

func GetStoreCourierSettings(db *sql.DB, storeID string) (StoreCourierSettings, error) {
	var s StoreCourierSettings
	err := db.QueryRow(`
		SELECT courier_name, courier_phone, is_active, policy, pricing_source, compensation, selected_branch_ids
		FROM dsh_store_courier_settings WHERE store_id = $1`, storeID).
		Scan(&s.CourierName, &s.CourierPhone, &s.IsActive, &s.Policy, &s.PricingSource, &s.Compensation, pq.Array(&s.SelectedBranchIDs))
	if errors.Is(err, sql.ErrNoRows) {
		// The OpenAPI contract has no 404 response for this operation — return
		// the zero-value settings shape instead of an error.
		return StoreCourierSettings{
			Policy:            "free_delivery",
			PricingSource:     "bthwani_pricing",
			Compensation:      "none",
			SelectedBranchIDs: []string{},
		}, nil
	}
	if err != nil {
		return StoreCourierSettings{}, err
	}
	if s.SelectedBranchIDs == nil {
		s.SelectedBranchIDs = []string{}
	}
	return s, nil
}

func UpsertStoreCourierSettings(db *sql.DB, storeID string, input StoreCourierSettings) (StoreCourierSettings, error) {
	if err := input.Validate(); err != nil {
		return StoreCourierSettings{}, err
	}
	var s StoreCourierSettings
	err := db.QueryRow(`
		INSERT INTO dsh_store_courier_settings (
			store_id, courier_name, courier_phone, is_active, policy, pricing_source, compensation, selected_branch_ids
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (store_id) DO UPDATE SET
			courier_name = EXCLUDED.courier_name,
			courier_phone = EXCLUDED.courier_phone,
			is_active = EXCLUDED.is_active,
			policy = EXCLUDED.policy,
			pricing_source = EXCLUDED.pricing_source,
			compensation = EXCLUDED.compensation,
			selected_branch_ids = EXCLUDED.selected_branch_ids,
			version = dsh_store_courier_settings.version + 1,
			updated_at = NOW()
		RETURNING courier_name, courier_phone, is_active, policy, pricing_source, compensation, selected_branch_ids`,
		storeID, input.CourierName, input.CourierPhone, input.IsActive, input.Policy,
		input.PricingSource, input.Compensation, pq.Array(input.SelectedBranchIDs)).
		Scan(&s.CourierName, &s.CourierPhone, &s.IsActive, &s.Policy, &s.PricingSource, &s.Compensation, pq.Array(&s.SelectedBranchIDs))
	if err != nil {
		return StoreCourierSettings{}, err
	}
	if s.SelectedBranchIDs == nil {
		s.SelectedBranchIDs = []string{}
	}
	return s, nil
}

// ─── Store coverage zones (DSH-050) ─────────────────────────────────────────

func ListStoreCoverageZones(db *sql.DB, storeID string) ([]StoreCoverageZone, error) {
	rows, err := db.Query(`
		SELECT id, name, status, status_label, branch_relation, service_mode_relation,
		       policy_summary, policy_reason, operational_impact, pricing_reference,
		       commission_reference, payout_reference, review_action_label, audit_note
		FROM dsh_store_coverage_zones
		WHERE store_id = $1
		ORDER BY created_at ASC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	zones := []StoreCoverageZone{}
	for rows.Next() {
		var z StoreCoverageZone
		if err := rows.Scan(&z.ID, &z.Name, &z.Status, &z.StatusLabel, &z.BranchRelation,
			&z.ServiceModeRelation, &z.PolicySummary, &z.PolicyReason, &z.OperationalImpact,
			&z.PricingReference, &z.CommissionReference, &z.PayoutReference,
			&z.ReviewActionLabel, &z.AuditNote); err != nil {
			return nil, err
		}
		zones = append(zones, z)
	}
	return zones, rows.Err()
}

// ─── Partner operational scopes (DSH-050) ───────────────────────────────────
// Scopes derive from dsh_stores.partner_id: a partner's stores are their
// scopes. Role comes from the actor's own team-member row per store when one
// exists (matched by invited_identity); absent a team-member row, the caller
// is the store's owning partner and defaults to "owner".
func ListPartnerScopesForActor(db *sql.DB, partnerID, actorIdentity string) ([]OperationalScope, error) {
	rows, err := db.Query(`
		SELECT s.id, s.partner_id, s.display_name, tm.role AS role
		FROM dsh_stores s
		INNER JOIN dsh_store_team_members tm
			ON tm.store_id = s.id AND tm.identity_actor_id = $2 AND tm.status = 'active'
		WHERE s.partner_id = $1
		ORDER BY s.display_name ASC`, partnerID, actorIdentity)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	scopes := []OperationalScope{}
	for rows.Next() {
		var sc OperationalScope
		if err := rows.Scan(&sc.StoreID, &sc.PartnerID, &sc.DisplayName, &sc.Role); err != nil {
			return nil, err
		}
		sc.ScopeID = sc.StoreID
		sc.Permissions = permissionsForRole(sc.Role)
		scopes = append(scopes, sc)
	}
	return scopes, rows.Err()
}

// ─── Helpers ───────────────────────────────────────────────────────────────

func isPgUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pgErr *pq.Error
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return strings.TrimSpace(strings.Repeat("0", 0) + func() string {
		s := ""
		for n > 0 {
			s = string(rune('0'+n%10)) + s
			n /= 10
		}
		return s
	}())
}
