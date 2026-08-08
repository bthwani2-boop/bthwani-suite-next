package partner

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
)

// â”€â”€â”€ Partner CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// CreatePartner was removed. Use CreatePartnerForOperatorContextIdempotent instead.

func GetPartner(db *sql.DB, partnerID string) (Partner, error) {
	var p Partner
	err := db.QueryRow(`
		SELECT id, legal_name_ar, legal_name_en, display_name,
		       legal_identity_type, legal_identity_number,
		       owner_actor_id, workforce_person_id, primary_phone, secondary_phone, email,
		       category, activation_status, onboarding_case_status, created_by_actor_id, created_by_surface,
		       notes,
		       COALESCE(payout_destination_id,''), COALESCE(destination_method,''),
		       COALESCE(masked_destination_reference,''), COALESCE(destination_verification_status,''),
		       version, created_at, updated_at
		FROM dsh_partners WHERE id = $1`, partnerID,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerActorID, &p.WorkforcePersonID, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email,
		&p.Category, &p.ActivationStatus, &p.OnboardingCaseStatus, &p.CreatedByActorID, &p.CreatedBySurface,
		&p.Notes,
		&p.PayoutDestinationID, &p.DestinationMethod, &p.MaskedDestinationReference, &p.DestinationVerificationStatus,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ErrNotFound
	}
	if err != nil {
		return Partner{}, err
	}
	return SanitizePartnerForSurface(p), nil
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

// â”€â”€â”€ Activation transition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

		if storeStatus != "published" ||
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
		          owner_actor_id, workforce_person_id, primary_phone, secondary_phone, email,
		          category, activation_status, onboarding_case_status, created_by_actor_id, created_by_surface,
		          notes,
		          COALESCE(payout_destination_id,''), COALESCE(destination_method,''),
		          COALESCE(masked_destination_reference,''), COALESCE(destination_verification_status,''),
		          version, created_at, updated_at`,
		partnerID, input.ToStatus,
	).Scan(
		&updated.ID, &updated.LegalNameAr, &updated.LegalNameEn, &updated.DisplayName,
		&updated.LegalIdentityType, &updated.LegalIdentityNumber,
		&updated.OwnerActorID, &updated.WorkforcePersonID, &updated.PrimaryPhone, &updated.SecondaryPhone, &updated.Email,
		&updated.Category, &updated.ActivationStatus, &updated.OnboardingCaseStatus, &updated.CreatedByActorID, &updated.CreatedBySurface,
		&updated.Notes,
		&updated.PayoutDestinationID, &updated.DestinationMethod, &updated.MaskedDestinationReference, &updated.DestinationVerificationStatus,
		&updated.Version, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err != nil {
		return Partner{}, ActivationEvent{}, err
	}
	updated = SanitizePartnerForSurface(updated)

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
	// client_visible â†’ stores become discoverable; client_hidden/deactivated â†’ stores hidden.
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

// â”€â”€â”€ Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
	
	if err := EvaluateOnboardingCaseStatus(context.Background(), tx, partnerID); err != nil {
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
			rejection_reason = CASE WHEN $3='approved' THEN '' ELSE $4 END,
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

// â”€â”€â”€ Field visits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Activation audit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


// â”€â”€â”€ Store courier settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

func GetStoreCourierSettings(db *sql.DB, storeID string) (StoreCourierSettings, error) {
	var s StoreCourierSettings
	err := db.QueryRow(`
		SELECT courier_name, courier_phone, is_active, policy, pricing_source, compensation, selected_branch_ids, version
		FROM dsh_store_courier_settings WHERE store_id = $1`, storeID).
		Scan(&s.CourierName, &s.CourierPhone, &s.IsActive, &s.Policy, &s.PricingSource, &s.Compensation, pq.Array(&s.SelectedBranchIDs), &s.Version)
	if errors.Is(err, sql.ErrNoRows) {
		// The OpenAPI contract has no 404 response for this operation â€” return
		// the zero-value settings shape instead of an error.
		return StoreCourierSettings{
			Policy:            "free_delivery",
			PricingSource:     "bthwani_pricing",
			Compensation:      "none",
			SelectedBranchIDs: []string{},
			Version:           0,
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
	if input.Version == 0 {
		// Expect new insert
		err := db.QueryRow(`
			INSERT INTO dsh_store_courier_settings (
				store_id, courier_name, courier_phone, is_active, policy, pricing_source, compensation, selected_branch_ids, version
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)
			RETURNING courier_name, courier_phone, is_active, policy, pricing_source, compensation, selected_branch_ids, version`,
			storeID, input.CourierName, input.CourierPhone, input.IsActive, input.Policy,
			input.PricingSource, input.Compensation, pq.Array(input.SelectedBranchIDs)).
			Scan(&s.CourierName, &s.CourierPhone, &s.IsActive, &s.Policy, &s.PricingSource, &s.Compensation, pq.Array(&s.SelectedBranchIDs), &s.Version)
		if err != nil {
			if strings.Contains(err.Error(), "duplicate key value") {
				return StoreCourierSettings{}, ErrVersionConflict
			}
			return StoreCourierSettings{}, err
		}
	} else {
		// Expect update of existing version
		err := db.QueryRow(`
			UPDATE dsh_store_courier_settings SET
				courier_name = $2,
				courier_phone = $3,
				is_active = $4,
				policy = $5,
				pricing_source = $6,
				compensation = $7,
				selected_branch_ids = $8,
				version = version + 1,
				updated_at = NOW()
			WHERE store_id = $1 AND version = $9
			RETURNING courier_name, courier_phone, is_active, policy, pricing_source, compensation, selected_branch_ids, version`,
			storeID, input.CourierName, input.CourierPhone, input.IsActive, input.Policy,
			input.PricingSource, input.Compensation, pq.Array(input.SelectedBranchIDs), input.Version).
			Scan(&s.CourierName, &s.CourierPhone, &s.IsActive, &s.Policy, &s.PricingSource, &s.Compensation, pq.Array(&s.SelectedBranchIDs), &s.Version)
		if errors.Is(err, sql.ErrNoRows) {
			return StoreCourierSettings{}, ErrVersionConflict
		}
		if err != nil {
			return StoreCourierSettings{}, err
		}
	}

	if s.SelectedBranchIDs == nil {
		s.SelectedBranchIDs = []string{}
	}
	return s, nil
}

// â”€â”€â”€ Store coverage zones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Partner operational scopes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Scopes derive from dsh_stores.partner_id: a partner's stores are their
// scopes. Role comes from the actor's own team-member row per store when one
// exists (matched by invited_identity); absent a team-member row, the caller
// is the store's owning partner and defaults to "owner".
func ListPartnerScopesForActor(db *sql.DB, partnerID, actorIdentity string, resolver map[string][]string) ([]OperationalScope, error) {
	return nil, errors.New("J014: scopes migrated to Workforce")
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
