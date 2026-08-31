package partner

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"

	"dsh-api/internal/store"
)

var ErrPartnerCreationIdempotencyRequired = errors.New("partner creation idempotency key is required")

func normalizeOperatorContextID(operatorContextID string) (string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return "", ErrOperatorContextRequired
	}
	return operatorContextID, nil
}

func normalizePartnerCreationInput(input CreatePartnerInput) CreatePartnerInput {
	if strings.TrimSpace(input.Category) == "" {
		input.Category = "default"
	}
	if strings.TrimSpace(input.CreatedBySurface) == "" {
		input.CreatedBySurface = "app-field"
	}
	input.BusinessVerticalID = canonicalBusinessVerticalID(input.BusinessVerticalID, input.Category)
	return input
}

type partnerCreationFingerprint struct {
	OperatorContextID   string `json:"operatorContextId"`
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
	BusinessVerticalID  string `json:"businessVerticalId"`
	Notes               string `json:"notes"`
	CreatedByActorID    string `json:"createdByActorId"`
	CreatedBySurface    string `json:"createdBySurface"`
}

func hashPartnerCreation(operatorContextID string, input CreatePartnerInput) (string, error) {
	payload, err := json.Marshal(partnerCreationFingerprint{
		OperatorContextID:   operatorContextID,
		LegalNameAr:         input.LegalNameAr,
		LegalNameEn:         input.LegalNameEn,
		DisplayName:         input.DisplayName,
		LegalIdentityType:   input.LegalIdentityType,
		LegalIdentityNumber: input.LegalIdentityNumber,
		OwnerActorID:        input.OwnerActorID,
		WorkforcePersonID:   input.WorkforcePersonID,
		PrimaryPhone:        input.PrimaryPhone,
		SecondaryPhone:      input.SecondaryPhone,
		Email:               input.Email,
		Category:            input.Category,
		BusinessVerticalID:  input.BusinessVerticalID,
		Notes:               input.Notes,
		CreatedByActorID:    input.CreatedByActorID,
		CreatedBySurface:    input.CreatedBySurface,
	})
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(payload)
	return hex.EncodeToString(digest[:]), nil
}

func lockPartnerCreationUniqueness(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	input CreatePartnerInput,
) error {
	lockKeys := []string{
		strings.Join([]string{
			"partner-legal-identity",
			operatorContextID,
			strings.TrimSpace(input.LegalIdentityType),
			strings.TrimSpace(input.LegalIdentityNumber),
		}, "\x1f"),
		strings.Join([]string{
			"partner-primary-phone",
			operatorContextID,
			strings.TrimSpace(input.PrimaryPhone),
		}, "\x1f"),
	}
	sort.Strings(lockKeys)
	for _, key := range lockKeys {
		if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, key); err != nil {
			return err
		}
	}

	var duplicate bool
	if err := tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM dsh_partners
			WHERE operator_context_id = $1
			  AND (
				(legal_identity_type = $2 AND btrim(legal_identity_number) = btrim($3))
				OR btrim(primary_phone) = btrim($4)
			  )
		)`,
		operatorContextID,
		input.LegalIdentityType,
		input.LegalIdentityNumber,
		input.PrimaryPhone,
	).Scan(&duplicate); err != nil {
		return err
	}
	if duplicate {
		return ErrConflict
	}
	return nil
}

func createPartnerForOperatorContextTx(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	input CreatePartnerInput,
) (Partner, error) {
	if input.BusinessVerticalID != "" {
		var active bool
		if err := tx.QueryRowContext(ctx, `
			SELECT is_active FROM dsh_catalog_domains WHERE id = $1`, input.BusinessVerticalID).Scan(&active); errors.Is(err, sql.ErrNoRows) {
			return Partner{}, ErrInvalid
		} else if err != nil {
			return Partner{}, err
		} else if !active {
			return Partner{}, ErrInvalid
		}
	}
	if err := lockPartnerCreationUniqueness(ctx, tx, operatorContextID, input); err != nil {
		return Partner{}, err
	}

	var p Partner
	err := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_partners (
			operator_context_id,
			legal_name_ar, legal_name_en, display_name,
			legal_identity_type, legal_identity_number,
			owner_actor_id, workforce_person_id, primary_phone, secondary_phone, email,
			category, business_vertical_id, notes, created_by_actor_id, created_by_surface, onboarding_case_status
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NULLIF($16,''),'draft')
		RETURNING id, legal_name_ar, legal_name_en, display_name,
		          legal_identity_type, legal_identity_number,
		          owner_actor_id, workforce_person_id, primary_phone, secondary_phone, email,
		          category, COALESCE(business_vertical_id,''), activation_status, onboarding_case_status, created_by_actor_id, created_by_surface,
		          notes,
		          COALESCE(payout_destination_id,''), COALESCE(destination_method,''),
		          COALESCE(masked_destination_reference,''), COALESCE(destination_verification_status,''),
		          version, created_at, updated_at`,
		operatorContextID,
		input.LegalNameAr, input.LegalNameEn, input.DisplayName,
		input.LegalIdentityType, input.LegalIdentityNumber,
		input.OwnerActorID, input.WorkforcePersonID, input.PrimaryPhone, input.SecondaryPhone, input.Email,
		input.Category, input.BusinessVerticalID, input.Notes, input.CreatedByActorID, input.CreatedBySurface,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerActorID, &p.WorkforcePersonID, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email,
		&p.Category, &p.BusinessVerticalID, &p.ActivationStatus, &p.OnboardingCaseStatus, &p.CreatedByActorID, &p.CreatedBySurface,
		&p.Notes,
		&p.PayoutDestinationID, &p.DestinationMethod, &p.MaskedDestinationReference, &p.DestinationVerificationStatus,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if isPgUniqueViolation(err) {
			return Partner{}, ErrConflict
		}
		return Partner{}, err
	}
	p = SanitizePartnerForSurface(p)

	// Partner creation owns its unpublished first store. Store authorization is
	// closed in this same transaction: app-field receives a field store-access
	// scope, while an already-bound partner owner receives canonical own access.
	sRow, err := store.CreateDraftStore(tx, store.CreateDraftStoreInput{
		PartnerID:       p.ID,
		DisplayName:     p.DisplayName,
		Category:        p.Category,
		CatalogDomainID: p.BusinessVerticalID,
	})
	if err != nil {
		return Partner{}, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE dsh_stores SET operator_context_id = $1 WHERE id = $2`, operatorContextID, sRow.ID); err != nil {
		return Partner{}, err
	}
	if err := store.EnsurePartnerFirstStoreReferenceTx(ctx, tx, p.ID, sRow.ID, operatorContextID); err != nil {
		return Partner{}, err
	}
	if input.CreatedBySurface == "app-field" {
		if err := store.EnsureFieldStoreAccessScopeTx(ctx, tx, operatorContextID, sRow.ID, input.CreatedByActorID); err != nil {
			return Partner{}, err
		}
	}
	if err := store.EnsurePartnerOwnerScopeTx(ctx, tx, operatorContextID, sRow.ID, input.OwnerActorID); err != nil {
		return Partner{}, err
	}

	return p, nil
}

// CreatePartnerForOperatorContext is the transactionally consistent creation
// primitive. HTTP production paths use the idempotent variant below; this
// primitive remains for trusted fixtures and internal callers that already own
// retry coordination.
func CreatePartnerForOperatorContext(db *sql.DB, operatorContextID string, input CreatePartnerInput) (Partner, error) {
	operatorContextID, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return Partner{}, err
	}
	if err := input.Validate(); err != nil {
		return Partner{}, err
	}
	input = normalizePartnerCreationInput(input)

	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return Partner{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	p, err := createPartnerForOperatorContextTx(context.Background(), tx, operatorContextID, input)
	if err != nil {
		return Partner{}, err
	}
	if err := tx.Commit(); err != nil {
		return Partner{}, err
	}
	return p, nil
}

// CreatePartnerForOperatorContextIdempotent atomically creates the Partner,
// its unpublished first Store, surface-authorized store scopes, and the
// immutable creation event. The lifecycle audit event doubles as the retry
// journal, avoiding a parallel source of truth while making unknown-result
// retries deterministic.
func CreatePartnerForOperatorContextIdempotent(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	idempotencyKey string,
	correlationID string,
	input CreatePartnerInput,
) (Partner, bool, error) {
	operatorContextID, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return Partner{}, false, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return Partner{}, false, ErrPartnerCreationIdempotencyRequired
	}
	if err := input.Validate(); err != nil {
		return Partner{}, false, err
	}
	input = normalizePartnerCreationInput(input)
	if strings.TrimSpace(input.CreatedByActorID) == "" {
		return Partner{}, false, ErrInvalid
	}
	requestHash, err := hashPartnerCreation(operatorContextID, input)
	if err != nil {
		return Partner{}, false, err
	}
	if strings.TrimSpace(correlationID) == "" {
		correlationID = governedMutationKey(
			"partner-create-correlation",
			operatorContextID,
			input.CreatedByActorID,
			idempotencyKey,
		)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Partner{}, false, err
	}
	defer tx.Rollback() //nolint:errcheck

	lockKey := strings.Join([]string{
		"partner-create",
		operatorContextID,
		input.CreatedByActorID,
		idempotencyKey,
	}, "\x1f")
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockKey); err != nil {
		return Partner{}, false, err
	}

	var replayPartnerID string
	var replayRequestHash string
	err = tx.QueryRowContext(ctx, `
		SELECT event.partner_id, COALESCE(event.request_hash, '')
		FROM dsh_partner_activation_events AS event
		JOIN dsh_partners AS partner ON partner.id = event.partner_id
		WHERE partner.operator_context_id = $1
		  AND event.actor_id = $2
		  AND event.idempotency_key = $3
		  AND event.from_status = 'none'
		  AND event.to_status = 'draft'
		ORDER BY event.created_at DESC
		LIMIT 1`,
		operatorContextID, input.CreatedByActorID, idempotencyKey,
	).Scan(&replayPartnerID, &replayRequestHash)
	if err == nil {
		if replayRequestHash != requestHash {
			return Partner{}, false, ErrIdempotencyConflict
		}
		p, loadErr := loadPartnerTx(ctx, tx, replayPartnerID, false)
		if loadErr != nil {
			return Partner{}, false, loadErr
		}
		if err := tx.Commit(); err != nil {
			return Partner{}, false, err
		}
		return SanitizePartnerForSurface(p), true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Partner{}, false, err
	}

	p, err := createPartnerForOperatorContextTx(ctx, tx, operatorContextID, input)
	if err != nil {
		return Partner{}, false, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_partner_activation_events (
			partner_id, from_status, to_status, actor_id, actor_surface,
			reason, correlation_id, idempotency_key, request_hash
		) VALUES ($1, 'none', 'draft', $2, $3, 'partner_created', $4, $5, $6)`,
		p.ID,
		input.CreatedByActorID,
		input.CreatedBySurface,
		correlationID,
		idempotencyKey,
		requestHash,
	); err != nil {
		return Partner{}, false, err
	}

	if err := tx.Commit(); err != nil {
		return Partner{}, false, err
	}
	return p, false, nil
}

func GetPartnerForOperatorContext(db *sql.DB, operatorContextID, partnerID string) (Partner, error) {
	operatorContextID, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return Partner{}, err
	}
	var p Partner
	err = db.QueryRow(`
		SELECT id, legal_name_ar, legal_name_en, display_name,
		       legal_identity_type, legal_identity_number,
		       owner_actor_id, workforce_person_id, primary_phone, secondary_phone, email,
		       category, COALESCE(business_vertical_id,''), activation_status, onboarding_case_status, created_by_actor_id, created_by_surface,
		       notes,
		       COALESCE(payout_destination_id,''), COALESCE(destination_method,''),
		       COALESCE(masked_destination_reference,''), COALESCE(destination_verification_status,''),
		       version, created_at, updated_at
		FROM dsh_partners
		WHERE id = $1 AND operator_context_id = $2`, partnerID, operatorContextID,
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

func ListPartnersForOperatorContext(db *sql.DB, operatorContextID string, q PartnerListQuery) ([]PartnerSummary, int, error) {
	operatorContextID, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return nil, 0, err
	}
	if q.Limit <= 0 {
		q.Limit = 20
	}
	if q.Limit > 100 {
		q.Limit = 100
	}

	args := []any{operatorContextID}
	conds := []string{"operator_context_id = $1"}
	next := 2
	if q.ActivationStatus != "" {
		conds = append(conds, "activation_status = $"+itoa(next))
		args = append(args, q.ActivationStatus)
		next++
	}
	if q.CreatedByActorID != "" {
		conds = append(conds, "created_by_actor_id = $"+itoa(next))
		args = append(args, q.CreatedByActorID)
		next++
	}
	where := " WHERE " + strings.Join(conds, " AND ")

	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partners`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, q.Limit, q.Offset)
	rows, err := db.Query(`
		SELECT id, display_name, legal_name_ar, category, COALESCE(business_vertical_id,''), activation_status, primary_phone, created_at, updated_at
		FROM dsh_partners`+where+`
		ORDER BY created_at DESC
		LIMIT $`+itoa(next)+` OFFSET $`+itoa(next+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()

	list := make([]PartnerSummary, 0)
	for rows.Next() {
		var item PartnerSummary
		if err := rows.Scan(&item.ID, &item.DisplayName, &item.LegalNameAr, &item.Category,
			&item.BusinessVerticalID, &item.ActivationStatus, &item.PrimaryPhone, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, item)
	}
	return list, total, rows.Err()
}

// EnsureOperatorContextPartner intentionally maps cross-OperatorContext IDs to ErrNotFound so the
// boundary does not disclose whether another OperatorContext owns the identifier.
func EnsureOperatorContextPartner(db *sql.DB, operatorContextID, partnerID string) error {
	_, err := GetPartnerForOperatorContext(db, operatorContextID, partnerID)
	return err
}

func EnsureOperatorContextStore(db *sql.DB, operatorContextID, storeID string) error {
	operatorContextID, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return err
	}
	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM dsh_stores WHERE id = $1 AND operator_context_id = $2)`, storeID, operatorContextID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func FieldOwnsPartnerForOperatorContext(db *sql.DB, operatorContextID, partnerID, actorID string) error {
	p, err := GetPartnerForOperatorContext(db, operatorContextID, partnerID)
	if err != nil {
		return err
	}
	if p.CreatedByActorID != actorID {
		return ErrForbidden
	}
	return nil
}

func ListDocumentsForOperatorContext(db *sql.DB, operatorContextID, partnerID string) ([]Document, error) {
	if err := EnsureOperatorContextPartner(db, operatorContextID, partnerID); err != nil {
		return nil, err
	}
	return ListDocuments(db, partnerID)
}

func UploadDocumentForOperatorContext(ctx context.Context, db *sql.DB, operatorContextID, partnerID string, input UploadDocumentInput) (Document, error) {
	if err := EnsureOperatorContextPartner(db, operatorContextID, partnerID); err != nil {
		return Document{}, err
	}
	return UploadDocumentIdempotent(ctx, db, partnerID, input)
}

func ReviewDocumentForOperatorContext(ctx context.Context, db *sql.DB, operatorContextID, partnerID, documentID string, input ReviewDocumentInput) (Document, DocumentReview, error) {
	if err := EnsureOperatorContextPartner(db, operatorContextID, partnerID); err != nil {
		return Document{}, DocumentReview{}, err
	}
	return ReviewDocumentIdempotent(ctx, db, partnerID, documentID, input)
}

func ListFieldVisitsForOperatorContext(db *sql.DB, operatorContextID, partnerID string) ([]FieldVisit, error) {
	if err := EnsureOperatorContextPartner(db, operatorContextID, partnerID); err != nil {
		return nil, err
	}
	return ListFieldVisits(db, partnerID)
}

func ListPartnerStoresForOperatorContext(db *sql.DB, operatorContextID, partnerID string) ([]PartnerLinkedStore, error) {
	if err := EnsureOperatorContextPartner(db, operatorContextID, partnerID); err != nil {
		return nil, err
	}
	return ListPartnerStores(db, partnerID)
}

func ListActivationEventsForOperatorContext(db *sql.DB, operatorContextID, partnerID string) ([]ActivationEvent, error) {
	if err := EnsureOperatorContextPartner(db, operatorContextID, partnerID); err != nil {
		return nil, err
	}
	return ListActivationEvents(db, partnerID)
}
