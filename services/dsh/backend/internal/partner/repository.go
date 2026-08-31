package partner

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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
		       category, COALESCE(business_vertical_id,''), activation_status, onboarding_case_status, created_by_actor_id, created_by_surface,
		       notes,
		       COALESCE(payout_destination_id,''), COALESCE(destination_method,''),
		       COALESCE(masked_destination_reference,''), COALESCE(destination_verification_status,''),
		       version, created_at, updated_at
		FROM dsh_partners WHERE id = $1`, partnerID,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerActorID, &p.WorkforcePersonID, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email,
		&p.Category, &p.BusinessVerticalID, &p.ActivationStatus, &p.OnboardingCaseStatus, &p.CreatedByActorID, &p.CreatedBySurface,
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
		SELECT id, display_name, legal_name_ar, category, COALESCE(business_vertical_id,''), activation_status, primary_phone, created_at, updated_at
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
			&s.BusinessVerticalID, &s.ActivationStatus, &s.PrimaryPhone, &s.CreatedAt, &s.UpdatedAt); err != nil {
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

func partnerReadinessForActivationStatus(status ActivationStatus) (string, bool) {
	switch status {
	case StatusClientVisible:
		return "ready", true
	case StatusClientHidden, StatusPartnerSuspended, StatusPartnerTerminated:
		return "blocked", true
	default:
		return "", false
	}
}

// â”€â”€â”€ Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const partnerDocumentReadColumns = `id, partner_id, document_type, upload_status, review_status, document_status,
	uploaded_by_actor_id, media_ref, notes, rejection_reason,
	COALESCE(reviewed_by_actor_id,''),
	reviewed_at, last_review_reason, COALESCE(supersedes_document_id,''),
	version, created_at, updated_at`

const insertPartnerDocumentSQL = `
	INSERT INTO dsh_partner_documents
		(partner_id, document_type, media_ref, notes, uploaded_by_actor_id, upload_status,
		 review_status, supersedes_document_id, idempotency_key, request_hash, correlation_id)
	VALUES ($1,$2,$3,$4,$5,'uploaded','pending',$6,$7,$8,$9)
	RETURNING id, partner_id, document_type, upload_status, review_status, document_status,
		uploaded_by_actor_id, media_ref, notes, rejection_reason,
		COALESCE(reviewed_by_actor_id,''), reviewed_at, last_review_reason,
		COALESCE(supersedes_document_id,''), version, created_at, updated_at`

const selectPartnerDocumentSQL = `SELECT id, partner_id, document_type, upload_status, review_status, document_status,
	uploaded_by_actor_id, media_ref, notes, rejection_reason,
	COALESCE(reviewed_by_actor_id,''), reviewed_at, last_review_reason,
	COALESCE(supersedes_document_id,''), version, created_at, updated_at
FROM dsh_partner_documents WHERE partner_id = $1 AND id = $2`

const reviewPartnerDocumentSQL = `
	UPDATE dsh_partner_documents SET
		document_status  = $3,
		review_status    = $4,
		rejection_reason = CASE WHEN $3='approved' THEN '' ELSE $6 END,
		reviewed_by_actor_id = $5,
		reviewed_at      = NOW(),
		last_review_reason = $6,
		version          = version + 1,
		updated_at       = NOW()
	WHERE id = $1 AND partner_id = $2
	RETURNING id, partner_id, document_type, upload_status, review_status, document_status,
		uploaded_by_actor_id, media_ref, notes, rejection_reason,
		COALESCE(reviewed_by_actor_id,''), reviewed_at, last_review_reason,
		COALESCE(supersedes_document_id,''), version, created_at, updated_at`

func UploadDocumentIdempotent(ctx context.Context, db *sql.DB, partnerID string, input UploadDocumentInput) (Document, error) {
	partnerID = strings.TrimSpace(partnerID)
	input.DocumentType = strings.TrimSpace(input.DocumentType)
	input.MediaRef = strings.TrimSpace(input.MediaRef)
	input.Notes = strings.TrimSpace(input.Notes)
	input.UploadedByActorID = strings.TrimSpace(input.UploadedByActorID)
	input.UploadedBySurface = strings.TrimSpace(input.UploadedBySurface)
	if input.UploadedBySurface == "" {
		input.UploadedBySurface = "app-field"
	}
	if err := input.Validate(); err != nil {
		return Document{}, err
	}
	key, correlationID, err := normalizePartnerMutationIdentity(input.IdempotencyKey, input.CorrelationID, partnerID, input.UploadedByActorID, "document-upload")
	if err != nil {
		return Document{}, err
	}
	requestHash, err := partnerMutationRequestHash(struct {
		PartnerID         string `json:"partnerId"`
		DocumentType      string `json:"documentType"`
		MediaRef          string `json:"mediaRef"`
		Notes             string `json:"notes"`
		UploadedByActorID string `json:"uploadedByActorId"`
		UploadedBySurface string `json:"uploadedBySurface"`
	}{partnerID, input.DocumentType, input.MediaRef, input.Notes, input.UploadedByActorID, input.UploadedBySurface})
	if err != nil {
		return Document{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Document{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var operatorContextID string
	if err := tx.QueryRowContext(ctx, `SELECT operator_context_id FROM dsh_partners WHERE id = $1`, partnerID).Scan(&operatorContextID); errors.Is(err, sql.ErrNoRows) {
		return Document{}, ErrNotFound
	} else if err != nil {
		return Document{}, err
	}
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, partnerMutationLock(operatorContextID, partnerID, input.UploadedByActorID, "document-upload", key)); err != nil {
		return Document{}, err
	}

	var replayID, storedHash string
	err = tx.QueryRowContext(ctx, `
		SELECT id, request_hash
		FROM dsh_partner_documents
		WHERE operator_context_id = $1 AND partner_id = $2
		  AND uploaded_by_actor_id = $3 AND idempotency_key = $4`,
		operatorContextID, partnerID, input.UploadedByActorID, key,
	).Scan(&replayID, &storedHash)
	if err == nil {
		if storedHash != requestHash {
			return Document{}, ErrIdempotencyConflict
		}
		document, loadErr := loadDocumentTx(ctx, tx, partnerID, replayID)
		if loadErr != nil {
			return Document{}, loadErr
		}
		if err := tx.Commit(); err != nil {
			return Document{}, err
		}
		return document, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Document{}, err
	}
	if err := validateLegalDocumentType(tx, input.DocumentType); err != nil {
		return Document{}, err
	}
	if err := validateLegalDocumentMedia(tx, partnerID, input.MediaRef); err != nil {
		return Document{}, err
	}

	var supersedesID sql.NullString
	_ = tx.QueryRowContext(ctx, `
		SELECT id FROM dsh_partner_documents
		WHERE partner_id = $1 AND document_type = $2 AND review_status = 'reupload_required'
		ORDER BY created_at DESC LIMIT 1`, partnerID, input.DocumentType).Scan(&supersedesID)

	var d Document
	err = tx.QueryRowContext(ctx, insertPartnerDocumentSQL,
		partnerID, input.DocumentType, input.MediaRef, input.Notes, input.UploadedByActorID, supersedesID,
		key, requestHash, correlationID,
	).Scan(documentScanArgs(&d)...)
	if err != nil {
		return Document{}, err
	}
	if err := recordActivationEventWithIdentity(tx, partnerID, "document_uploaded:"+d.DocumentType, input.UploadedByActorID, input.UploadedBySurface, input.Notes, correlationID, key, requestHash); err != nil {
		return Document{}, err
	}

	if err := EvaluateOnboardingCaseStatus(ctx, tx, partnerID); err != nil {
		return Document{}, err
	}
	if err := tx.Commit(); err != nil {
		return Document{}, err
	}
	return d, nil
}

func loadDocumentTx(ctx context.Context, tx *sql.Tx, partnerID, documentID string) (Document, error) {
	var document Document
	err := tx.QueryRowContext(ctx, selectPartnerDocumentSQL, partnerID, documentID).Scan(documentScanArgs(&document)...)
	if errors.Is(err, sql.ErrNoRows) {
		return Document{}, ErrNotFound
	}
	if err != nil {
		return Document{}, err
	}
	return document, nil
}

func ListDocuments(db *sql.DB, partnerID string) ([]Document, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, document_type, upload_status, review_status, document_status,
		       uploaded_by_actor_id, media_ref, notes, rejection_reason,
		       COALESCE(reviewed_by_actor_id,''),
		       reviewed_at, last_review_reason, COALESCE(supersedes_document_id,''),
		       version, created_at, updated_at
		FROM dsh_partner_documents WHERE partner_id = $1 ORDER BY created_at ASC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Document
	for rows.Next() {
		var d Document
		if err := rows.Scan(documentScanArgs(&d)...); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	if list == nil {
		list = []Document{}
	}
	return list, rows.Err()
}

func ReviewDocumentIdempotent(ctx context.Context, db *sql.DB, partnerID, documentID string, input ReviewDocumentInput) (Document, DocumentReview, error) {
	partnerID = strings.TrimSpace(partnerID)
	documentID = strings.TrimSpace(documentID)
	input.Decision = strings.TrimSpace(input.Decision)
	input.Reason = strings.TrimSpace(input.Reason)
	input.ReviewedByActorID = strings.TrimSpace(input.ReviewedByActorID)
	if err := input.Validate(); err != nil {
		return Document{}, DocumentReview{}, err
	}
	key, correlationID, err := normalizePartnerMutationIdentity(input.IdempotencyKey, input.CorrelationID, partnerID, documentID, input.ReviewedByActorID, "document-review")
	if err != nil {
		return Document{}, DocumentReview{}, err
	}
	requestHash, err := partnerMutationRequestHash(struct {
		PartnerID         string `json:"partnerId"`
		DocumentID        string `json:"documentId"`
		Decision          string `json:"decision"`
		Reason            string `json:"reason"`
		ReviewedByActorID string `json:"reviewedByActorId"`
	}{partnerID, documentID, input.Decision, input.Reason, input.ReviewedByActorID})
	if err != nil {
		return Document{}, DocumentReview{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Document{}, DocumentReview{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var operatorContextID string
	if err := tx.QueryRowContext(ctx, `SELECT operator_context_id FROM dsh_partners WHERE id = $1`, partnerID).Scan(&operatorContextID); errors.Is(err, sql.ErrNoRows) {
		return Document{}, DocumentReview{}, ErrNotFound
	} else if err != nil {
		return Document{}, DocumentReview{}, err
	}
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, partnerMutationLock(operatorContextID, partnerID, documentID, input.ReviewedByActorID, "document-review", key)); err != nil {
		return Document{}, DocumentReview{}, err
	}

	var replayID, storedHash string
	err = tx.QueryRowContext(ctx, `
		SELECT id, request_hash
		FROM dsh_partner_document_reviews
		WHERE operator_context_id = $1 AND partner_id = $2 AND document_id = $3
		  AND reviewed_by_actor_id = $4 AND idempotency_key = $5`,
		operatorContextID, partnerID, documentID, input.ReviewedByActorID, key,
	).Scan(&replayID, &storedHash)
	if err == nil {
		return replayReviewedDocument(ctx, tx, partnerID, documentID, replayID, storedHash, requestHash)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Document{}, DocumentReview{}, err
	}

	newDocStatus, newReviewStatus := documentReviewStatuses(input.Decision)

	var d Document
	err = tx.QueryRowContext(ctx, reviewPartnerDocumentSQL,
		documentID, partnerID, newDocStatus, newReviewStatus, input.ReviewedByActorID, input.Reason,
	).Scan(documentScanArgs(&d)...)
	if errors.Is(err, sql.ErrNoRows) {
		return Document{}, DocumentReview{}, ErrNotFound
	}
	if err != nil {
		return Document{}, DocumentReview{}, err
	}

	var rev DocumentReview
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_partner_document_reviews
			(document_id, partner_id, reviewed_by_actor_id, decision, reason, correlation_id, idempotency_key, request_hash)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, document_id, partner_id, reviewed_by_actor_id, decision, reason, correlation_id, created_at`,
		documentID, partnerID, input.ReviewedByActorID, input.Decision, input.Reason, correlationID, key, requestHash,
	).Scan(&rev.ID, &rev.DocumentID, &rev.PartnerID, &rev.ReviewedByActorID,
		&rev.Decision, &rev.Reason, &rev.CorrelationID, &rev.CreatedAt)
	if err != nil {
		return Document{}, DocumentReview{}, err
	}

	if err := recordActivationEventWithIdentity(tx, partnerID, "document_reviewed:"+input.Decision, input.ReviewedByActorID, "control-panel", input.Reason, correlationID, key, requestHash); err != nil {
		return Document{}, DocumentReview{}, err
	}

	if err := tx.Commit(); err != nil {
		return Document{}, DocumentReview{}, err
	}
	return d, rev, nil
}

func replayReviewedDocument(ctx context.Context, tx *sql.Tx, partnerID, documentID, replayID, storedHash, requestHash string) (Document, DocumentReview, error) {
	if storedHash != requestHash {
		return Document{}, DocumentReview{}, ErrIdempotencyConflict
	}
	document, err := loadDocumentTx(ctx, tx, partnerID, documentID)
	if err != nil {
		return Document{}, DocumentReview{}, err
	}
	review, err := loadDocumentReviewTx(ctx, tx, partnerID, documentID, replayID)
	if err != nil {
		return Document{}, DocumentReview{}, err
	}
	if err := tx.Commit(); err != nil {
		return Document{}, DocumentReview{}, err
	}
	return document, review, nil
}

func documentReviewStatuses(decision string) (string, string) {
	switch decision {
	case "approved":
		return "approved", "verified"
	case "needs_resubmit":
		return "rejected", "reupload_required"
	case "rejected":
		return "rejected", "rejected"
	default:
		return "under_review", "under_review"
	}
}

func loadDocumentReviewTx(ctx context.Context, tx *sql.Tx, partnerID, documentID, reviewID string) (DocumentReview, error) {
	var review DocumentReview
	err := tx.QueryRowContext(ctx, `
		SELECT id, document_id, partner_id, reviewed_by_actor_id, decision, reason, correlation_id, created_at
		FROM dsh_partner_document_reviews
		WHERE id = $1 AND document_id = $2 AND partner_id = $3`, reviewID, documentID, partnerID).Scan(
		&review.ID, &review.DocumentID, &review.PartnerID, &review.ReviewedByActorID,
		&review.Decision, &review.Reason, &review.CorrelationID, &review.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return DocumentReview{}, ErrNotFound
	}
	if err != nil {
		return DocumentReview{}, err
	}
	return review, nil
}

func documentScanArgs(d *Document) []any {
	return []any{
		&d.ID, &d.PartnerID, &d.DocumentType, &d.UploadStatus, &d.ReviewStatus,
		&d.DocumentStatus, &d.UploadedByActorID, &d.MediaRef, &d.Notes,
		&d.RejectionReason, &d.ReviewedByActorID, &d.ReviewedAt, &d.LastReviewReason,
		&d.SupersedesDocumentID, &d.Version, &d.CreatedAt, &d.UpdatedAt,
	}
}

func validateLegalDocumentMedia(tx *sql.Tx, partnerID, mediaRef string) error {
	var valid bool
	err := tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM dsh_media_refs
			WHERE media_ref = $1 AND partner_id = $2
			  AND purpose = 'partner_document'
			  AND scan_status NOT IN ('failed', 'quarantined')
			  AND content_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
		)`, mediaRef, partnerID).Scan(&valid)
	if err != nil {
		return err
	}
	if !valid {
		return ErrInvalid
	}
	return nil
}

func validateLegalDocumentType(tx *sql.Tx, documentType string) error {
	var valid bool
	if err := tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM dsh_partner_document_taxonomy
			WHERE document_type = $1 AND document_family = 'legal' AND active = TRUE
		)`, strings.TrimSpace(documentType)).Scan(&valid); err != nil {
		return err
	}
	if !valid {
		return ErrInvalid
	}
	return nil
}

// â”€â”€â”€ Field visits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const partnerFieldVisitReadColumns = `id, partner_id, COALESCE(store_id,''), field_actor_id, visit_status,
	visit_notes, location_latitude, location_longitude,
	COALESCE((SELECT array_agg(media_ref ORDER BY created_at ASC)
	          FROM dsh_partner_field_visit_media vm
	          WHERE vm.visit_id = v.id AND vm.status = 'uploaded'), ARRAY[]::TEXT[]),
	version, created_at, submitted_at`

const selectPartnerFieldVisitSQL = `SELECT id, partner_id, COALESCE(store_id,''), field_actor_id, visit_status,
	visit_notes, location_latitude, location_longitude,
	COALESCE((SELECT array_agg(media_ref ORDER BY created_at ASC)
	          FROM dsh_partner_field_visit_media vm
	          WHERE vm.visit_id = v.id AND vm.status = 'uploaded'), ARRAY[]::TEXT[]),
	version, created_at, submitted_at
FROM dsh_partner_field_visits v WHERE v.partner_id = $1 AND v.id = $2`

func CreateFieldVisitIdempotent(ctx context.Context, db *sql.DB, input CreateFieldVisitInput) (FieldVisit, error) {
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.VisitNotes = strings.TrimSpace(input.VisitNotes)
	input.FieldActorID = strings.TrimSpace(input.FieldActorID)
	input.FieldActorSurface = strings.TrimSpace(input.FieldActorSurface)
	if input.FieldActorSurface == "" {
		input.FieldActorSurface = "app-field"
	}
	if input.PartnerID == "" || input.FieldActorID == "" {
		return FieldVisit{}, ErrInvalid
	}
	if (input.LocationLatitude == nil) != (input.LocationLongitude == nil) {
		return FieldVisit{}, ErrInvalid
	}
	if input.StoreID == "" {
		return FieldVisit{}, ErrStoreIDRequired
	}
	if input.VisitNotes == "" && input.LocationLatitude == nil && len(input.EvidenceMediaRefs) == 0 {
		return FieldVisit{}, fmt.Errorf("%w: field visit requires notes, location, or evidence", ErrInvalid)
	}

	mediaRefs := uniqueTrimmedMediaRefs(input.EvidenceMediaRefs)
	key, correlationID, err := normalizePartnerMutationIdentity(input.IdempotencyKey, input.CorrelationID, input.PartnerID, input.FieldActorID, "field-visit-create")
	if err != nil {
		return FieldVisit{}, err
	}
	requestHash, err := partnerMutationRequestHash(struct {
		PartnerID         string   `json:"partnerId"`
		StoreID           string   `json:"storeId"`
		VisitNotes        string   `json:"visitNotes"`
		LocationLatitude  *float64 `json:"locationLatitude"`
		LocationLongitude *float64 `json:"locationLongitude"`
		EvidenceMediaRefs []string `json:"evidenceMediaRefs"`
		FieldActorID      string   `json:"fieldActorId"`
		FieldActorSurface string   `json:"fieldActorSurface"`
	}{input.PartnerID, input.StoreID, input.VisitNotes, input.LocationLatitude, input.LocationLongitude, mediaRefs, input.FieldActorID, input.FieldActorSurface})
	if err != nil {
		return FieldVisit{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return FieldVisit{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var operatorContextID string
	if err := tx.QueryRowContext(ctx, `SELECT operator_context_id FROM dsh_partners WHERE id = $1`, input.PartnerID).Scan(&operatorContextID); errors.Is(err, sql.ErrNoRows) {
		return FieldVisit{}, ErrNotFound
	} else if err != nil {
		return FieldVisit{}, err
	}
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, partnerMutationLock(operatorContextID, input.PartnerID, input.FieldActorID, "field-visit-create", key)); err != nil {
		return FieldVisit{}, err
	}

	var replayID, storedHash string
	err = tx.QueryRowContext(ctx, `
		SELECT id, request_hash
		FROM dsh_partner_field_visits
		WHERE operator_context_id = $1 AND partner_id = $2
		  AND field_actor_id = $3 AND idempotency_key = $4`,
		operatorContextID, input.PartnerID, input.FieldActorID, key,
	).Scan(&replayID, &storedHash)
	if err == nil {
		if storedHash != requestHash {
			return FieldVisit{}, ErrIdempotencyConflict
		}
		visit, loadErr := loadFieldVisitTx(ctx, tx, input.PartnerID, replayID)
		if loadErr != nil {
			return FieldVisit{}, loadErr
		}
		if err := tx.Commit(); err != nil {
			return FieldVisit{}, err
		}
		return visit, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return FieldVisit{}, err
	}

	var storePartnerID sql.NullString
	if err := tx.QueryRowContext(ctx, `SELECT partner_id FROM dsh_stores WHERE id = $1 FOR SHARE`, input.StoreID).Scan(&storePartnerID); errors.Is(err, sql.ErrNoRows) {
		return FieldVisit{}, ErrInvalid
	} else if err != nil {
		return FieldVisit{}, err
	}
	if !storePartnerID.Valid || storePartnerID.String != input.PartnerID {
		return FieldVisit{}, ErrInvalid
	}

	var latSQL, lonSQL sql.NullFloat64
	if input.LocationLatitude != nil {
		latSQL = sql.NullFloat64{Float64: *input.LocationLatitude, Valid: true}
		lonSQL = sql.NullFloat64{Float64: *input.LocationLongitude, Valid: true}
	}
	storeIDSQL := sql.NullString{String: input.StoreID, Valid: true}

	var visitID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_partner_field_visits
			(partner_id, store_id, field_actor_id, visit_status, visit_notes, location_latitude, location_longitude,
			 evidence_media_refs, submitted_at, idempotency_key, request_hash, correlation_id)
		VALUES ($1,$2,$3,'submitted',$4,$5,$6,$7,NOW(),$8,$9,$10)
		RETURNING id`,
		input.PartnerID, storeIDSQL, input.FieldActorID, input.VisitNotes, latSQL, lonSQL, pq.Array(mediaRefs),
		key, requestHash, correlationID,
	).Scan(&visitID)
	if err != nil {
		return FieldVisit{}, err
	}
	for _, mediaRef := range mediaRefs {
		if err := validateVisitMedia(tx, input.PartnerID, input.StoreID, input.FieldActorID, mediaRef); err != nil {
			return FieldVisit{}, err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_partner_field_visit_media
				(partner_id, visit_id, store_id, media_ref, captured_by_actor_id, context)
			VALUES ($1,$2,$3,$4,$5,'partner_onboarding')
			ON CONFLICT (visit_id, media_ref) DO NOTHING`,
			input.PartnerID, visitID, storeIDSQL, mediaRef, input.FieldActorID); err != nil {
			return FieldVisit{}, err
		}
	}
	if err := recordActivationEventWithIdentity(tx, input.PartnerID, "field_visit_submitted", input.FieldActorID, input.FieldActorSurface, input.VisitNotes, correlationID, key, requestHash); err != nil {
		return FieldVisit{}, err
	}
	visit, err := loadFieldVisitTx(ctx, tx, input.PartnerID, visitID)
	if err != nil {
		return FieldVisit{}, err
	}
	if err := tx.Commit(); err != nil {
		return FieldVisit{}, err
	}
	return visit, nil
}

func loadFieldVisitTx(ctx context.Context, tx *sql.Tx, partnerID, visitID string) (FieldVisit, error) {
	var visit FieldVisit
	var lat, lon sql.NullFloat64
	var submittedAt sql.NullTime
	var storeIDOut sql.NullString
	err := tx.QueryRowContext(ctx, selectPartnerFieldVisitSQL, partnerID, visitID).Scan(
		&visit.ID, &visit.PartnerID, &storeIDOut, &visit.FieldActorID, &visit.VisitStatus,
		&visit.VisitNotes, &lat, &lon, pq.Array(&visit.EvidenceMediaRefs),
		&visit.Version, &visit.CreatedAt, &submittedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return FieldVisit{}, ErrNotFound
	}
	if err != nil {
		return FieldVisit{}, err
	}
	if lat.Valid {
		visit.LocationLatitude = &lat.Float64
	}
	if lon.Valid {
		visit.LocationLongitude = &lon.Float64
	}
	if submittedAt.Valid {
		t := submittedAt.Time
		visit.SubmittedAt = &t
	}
	visit.StoreID = storeIDOut.String
	if visit.EvidenceMediaRefs == nil {
		visit.EvidenceMediaRefs = []string{}
	}
	return visit, nil
}

func ListPartnerStores(db *sql.DB, partnerID string) ([]PartnerLinkedStore, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, slug, display_name, status, is_visible, city_code,
		       COALESCE((SELECT publication_decision FROM dsh_partner_store_readiness_v readiness WHERE readiness.store_id = dsh_stores.id), 'BLOCKED'),
		       COALESCE((SELECT blocking_reason_codes FROM dsh_partner_store_readiness_v readiness WHERE readiness.store_id = dsh_stores.id), ARRAY[]::text[]),
		       created_at
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
		if err := rows.Scan(&s.ID, &s.PartnerID, &s.Slug, &s.DisplayName, &s.Status, &s.IsVisible, &s.CityCode, &s.PublicationDecision, pq.Array(&s.BlockingReasons), &createdAt); err != nil {
			return nil, err
		}
		s.CreatedAt = createdAt.UTC().Format(time.RFC3339Nano)
		stores = append(stores, s)
	}
	return stores, rows.Err()
}

func ListFieldVisits(db *sql.DB, partnerID string) ([]FieldVisit, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, COALESCE(store_id,''), field_actor_id, visit_status,
		       visit_notes, location_latitude, location_longitude,
		       COALESCE((SELECT array_agg(media_ref ORDER BY created_at ASC)
		                  FROM dsh_partner_field_visit_media vm
		                  WHERE vm.visit_id = v.id AND vm.status = 'uploaded'), ARRAY[]::TEXT[]),
		       version, created_at, submitted_at
		FROM dsh_partner_field_visits v WHERE partner_id = $1 ORDER BY created_at DESC`, partnerID)
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

func uniqueTrimmedMediaRefs(refs []string) []string {
	seen := make(map[string]struct{}, len(refs))
	result := make([]string, 0, len(refs))
	for _, ref := range refs {
		ref = strings.TrimSpace(ref)
		if ref == "" {
			continue
		}
		if _, exists := seen[ref]; exists {
			continue
		}
		seen[ref] = struct{}{}
		result = append(result, ref)
	}
	return result
}

func validateVisitMedia(tx *sql.Tx, partnerID, storeID, actorID, mediaRef string) error {
	var valid bool
	err := tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM dsh_media_refs
			WHERE media_ref = $1 AND partner_id = $2
			  AND purpose = 'field_readiness_evidence'
			  AND owner_actor_id = $3 AND owner_actor_role = 'field'
			  AND scan_status NOT IN ('failed', 'quarantined')
			  AND ($4 = '' AND store_id IS NULL OR $4 <> '' AND store_id = $4)
		)`, mediaRef, partnerID, actorID, storeID).Scan(&valid)
	if err != nil {
		return err
	}
	if !valid {
		return ErrInvalid
	}
	return nil
}

// execer is satisfied by both *sql.DB and *sql.Tx, letting audit events be
// recorded either standalone or as part of an existing transaction.
type execer interface {
	Exec(query string, args ...any) (sql.Result, error)
}

// recordActivationEvent appends a non-transition activation event (document
// upload, document review, field visit, store link) to the canonical activation
// audit trail, so the full partner lifecycle is visible from one ordered timeline.
func recordActivationEvent(x execer, partnerID, toStatus, actorID, actorSurface, reason string) error {
	_, err := x.Exec(`
		INSERT INTO dsh_partner_activation_events
			(partner_id, from_status, to_status, actor_id, actor_surface, reason)
		VALUES ($1, '', $2, $3, $4, $5)`,
		partnerID, toStatus, actorID, actorSurface, reason)
	return err
}

func recordActivationEventWithIdentity(x execer, partnerID, toStatus, actorID, actorSurface, reason, correlationID, idempotencyKey, requestHash string) error {
	_, err := x.Exec(`
		INSERT INTO dsh_partner_activation_events
			(partner_id, from_status, to_status, actor_id, actor_surface, reason,
			 correlation_id, idempotency_key, request_hash)
		VALUES ($1, '', $2, $3, $4, $5, $6, $7, $8)`,
		partnerID, toStatus, actorID, actorSurface, reason, correlationID, idempotencyKey, requestHash)
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
