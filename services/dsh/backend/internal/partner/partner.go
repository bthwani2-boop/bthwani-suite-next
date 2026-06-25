package partner

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound        = errors.New("partner not found")
	ErrInvalid         = errors.New("invalid input")
	ErrForbidden       = errors.New("transition not allowed")
	ErrConflict        = errors.New("partner already exists")
	ErrVersionConflict = errors.New("version conflict")
)

// ── Valid state transitions ────────────────────────────────────────────────────

var validTransitions = map[string][]string{
	"draft":                    {"submitted", "field_visit_scheduled"},
	"submitted":                {"field_visit_scheduled", "documents_missing", "documents_uploaded"},
	"field_visit_scheduled":    {"field_visit_completed", "documents_missing"},
	"field_visit_completed":    {"documents_missing", "documents_uploaded"},
	"documents_missing":        {"documents_uploaded"},
	"documents_uploaded":       {"documents_verified", "documents_missing"},
	"documents_verified":       {"catalog_not_ready", "ops_review"},
	"catalog_not_ready":        {"catalog_ready", "ops_review"},
	"catalog_ready":            {"delivery_modes_not_ready", "delivery_modes_ready"},
	"delivery_modes_not_ready": {"delivery_modes_ready"},
	"delivery_modes_ready":     {"ops_review"},
	"ops_review":               {"ops_approved", "ops_rejected"},
	"ops_approved":             {"partner_active"},
	"ops_rejected":             {"submitted", "documents_missing"},
	"partner_active":           {"client_visible", "client_hidden", "partner_deactivated"},
	"partner_deactivated":      {"ops_review", "submitted"},
	"client_visible":           {"client_hidden", "partner_deactivated"},
	"client_hidden":            {"client_visible", "partner_deactivated"},
}

func isValidTransition(from, to string) bool {
	allowed, ok := validTransitions[from]
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

// ── Domain types ──────────────────────────────────────────────────────────────

type Partner struct {
	ID                   string     `json:"id"`
	LegalNameAr          string     `json:"legalNameAr"`
	LegalNameEn          string     `json:"legalNameEn"`
	DisplayName          string     `json:"displayName"`
	LegalIdentityType    string     `json:"legalIdentityType"`
	LegalIdentityNumber  string     `json:"legalIdentityNumber"`
	OwnerName            string     `json:"ownerName"`
	PrimaryPhone         string     `json:"primaryPhone"`
	SecondaryPhone       string     `json:"secondaryPhone"`
	Email                string     `json:"email"`
	Category             string     `json:"category"`
	OnboardingStatus     string     `json:"onboardingStatus"`
	RejectionReason      string     `json:"rejectionReason"`
	CreatedBy            string     `json:"createdBy"`
	AssignedFieldAgent   string     `json:"assignedFieldAgent"`
	Version              int        `json:"version"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
}

type Document struct {
	ID         string     `json:"id"`
	PartnerID  string     `json:"partnerId"`
	DocType    string     `json:"docType"`
	Status     string     `json:"status"`
	MediaRef   string     `json:"mediaRef"`
	Notes      string     `json:"notes"`
	ReviewedBy string     `json:"reviewedBy"`
	ReviewedAt *time.Time `json:"reviewedAt"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

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

type CreateInput struct {
	LegalNameAr         string
	LegalNameEn         string
	DisplayName         string
	LegalIdentityType   string
	LegalIdentityNumber string
	OwnerName           string
	PrimaryPhone        string
	SecondaryPhone      string
	Email               string
	Category            string
	CreatedBy           string
	AssignedFieldAgent  string
	IdempotencyKey      string
}

type TransitionInput struct {
	TargetStatus  string
	ActorID       string
	ActorSurface  string
	Reason        string
	CorrelationID string
	Version       int
}

type ListFilter struct {
	Status   string
	Category string
	Limit    int
	Offset   int
}

type DocumentInput struct {
	DocType  string
	MediaRef string
	Notes    string
}

type ReviewDocInput struct {
	Status     string
	Notes      string
	ReviewedBy string
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

func Create(db *sql.DB, in CreateInput) (Partner, error) {
	if in.LegalNameAr == "" || in.DisplayName == "" || in.PrimaryPhone == "" ||
		in.LegalIdentityNumber == "" || in.OwnerName == "" {
		return Partner{}, ErrInvalid
	}
	var p Partner
	err := db.QueryRow(`
		INSERT INTO dsh_partners
		  (legal_name_ar, legal_name_en, display_name,
		   legal_identity_type, legal_identity_number,
		   owner_name, primary_phone, secondary_phone, email, category,
		   created_by, assigned_field_agent, idempotency_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		ON CONFLICT (legal_identity_number) DO NOTHING
		RETURNING id, legal_name_ar, legal_name_en, display_name,
		          legal_identity_type, legal_identity_number,
		          owner_name, primary_phone, secondary_phone, email, category,
		          onboarding_status, rejection_reason, created_by, assigned_field_agent,
		          version, created_at, updated_at`,
		in.LegalNameAr, in.LegalNameEn, in.DisplayName,
		in.LegalIdentityType, in.LegalIdentityNumber,
		in.OwnerName, in.PrimaryPhone, in.SecondaryPhone, in.Email, in.Category,
		in.CreatedBy, in.AssignedFieldAgent, in.IdempotencyKey,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerName, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email, &p.Category,
		&p.OnboardingStatus, &p.RejectionReason, &p.CreatedBy, &p.AssignedFieldAgent,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return Partner{}, ErrConflict
	}
	return p, err
}

func GetByID(db *sql.DB, id string) (Partner, error) {
	var p Partner
	err := db.QueryRow(`
		SELECT id, legal_name_ar, legal_name_en, display_name,
		       legal_identity_type, legal_identity_number,
		       owner_name, primary_phone, secondary_phone, email, category,
		       onboarding_status, rejection_reason, created_by, assigned_field_agent,
		       version, created_at, updated_at
		FROM dsh_partners WHERE id = $1`, id,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerName, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email, &p.Category,
		&p.OnboardingStatus, &p.RejectionReason, &p.CreatedBy, &p.AssignedFieldAgent,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ErrNotFound
	}
	return p, err
}

func List(db *sql.DB, f ListFilter) ([]Partner, int, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}

	countQ := `SELECT COUNT(*) FROM dsh_partners WHERE ($1='' OR onboarding_status=$1) AND ($2='' OR category=$2)`
	var total int
	if err := db.QueryRow(countQ, f.Status, f.Category).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(`
		SELECT id, legal_name_ar, legal_name_en, display_name,
		       legal_identity_type, legal_identity_number,
		       owner_name, primary_phone, secondary_phone, email, category,
		       onboarding_status, rejection_reason, created_by, assigned_field_agent,
		       version, created_at, updated_at
		FROM dsh_partners
		WHERE ($1='' OR onboarding_status=$1) AND ($2='' OR category=$2)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`,
		f.Status, f.Category, f.Limit, f.Offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []Partner
	for rows.Next() {
		var p Partner
		if err := rows.Scan(
			&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
			&p.LegalIdentityType, &p.LegalIdentityNumber,
			&p.OwnerName, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email, &p.Category,
			&p.OnboardingStatus, &p.RejectionReason, &p.CreatedBy, &p.AssignedFieldAgent,
			&p.Version, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []Partner{}
	}
	return out, total, rows.Err()
}

// Transition enforces allowed state machine transitions and records an audit event.
func Transition(db *sql.DB, partnerID string, in TransitionInput) (Partner, error) {
	tx, err := db.Begin()
	if err != nil {
		return Partner{}, err
	}
	defer tx.Rollback()

	var current Partner
	err = tx.QueryRow(`
		SELECT id, onboarding_status, version
		FROM dsh_partners WHERE id = $1 FOR UPDATE`, partnerID,
	).Scan(&current.ID, &current.OnboardingStatus, &current.Version)
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ErrNotFound
	}
	if err != nil {
		return Partner{}, err
	}

	if in.Version > 0 && current.Version != in.Version {
		return Partner{}, ErrVersionConflict
	}

	if !isValidTransition(current.OnboardingStatus, in.TargetStatus) {
		return Partner{}, ErrForbidden
	}

	rejectionReason := ""
	if in.TargetStatus == "ops_rejected" || in.TargetStatus == "partner_deactivated" || in.TargetStatus == "client_hidden" {
		rejectionReason = in.Reason
	}

	var p Partner
	err = tx.QueryRow(`
		UPDATE dsh_partners
		SET onboarding_status=$1, rejection_reason=$2, version=version+1, updated_at=NOW()
		WHERE id=$3
		RETURNING id, legal_name_ar, legal_name_en, display_name,
		          legal_identity_type, legal_identity_number,
		          owner_name, primary_phone, secondary_phone, email, category,
		          onboarding_status, rejection_reason, created_by, assigned_field_agent,
		          version, created_at, updated_at`,
		in.TargetStatus, rejectionReason, partnerID,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerName, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email, &p.Category,
		&p.OnboardingStatus, &p.RejectionReason, &p.CreatedBy, &p.AssignedFieldAgent,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return Partner{}, err
	}

	_, err = tx.Exec(`
		INSERT INTO dsh_partner_activation_events
		  (partner_id, from_status, to_status, actor_id, actor_surface, reason, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		partnerID, current.OnboardingStatus, in.TargetStatus,
		in.ActorID, in.ActorSurface, in.Reason, in.CorrelationID,
	)
	if err != nil {
		return Partner{}, err
	}

	// When deactivated or hidden, record store visibility event for all linked stores
	if in.TargetStatus == "partner_deactivated" || in.TargetStatus == "client_hidden" {
		eventType := "became_hidden"
		if in.TargetStatus == "partner_deactivated" {
			eventType = "deactivated"
		}
		_, _ = tx.Exec(`
			INSERT INTO dsh_store_visibility_events (store_id, partner_id, event_type, reason, actor_id)
			SELECT id, $1::uuid, $2, $3, $4 FROM dsh_stores WHERE partner_id=$1::uuid`,
			partnerID, eventType, in.Reason, in.ActorID,
		)
	}
	if in.TargetStatus == "client_visible" {
		_, _ = tx.Exec(`
			INSERT INTO dsh_store_visibility_events (store_id, partner_id, event_type, reason, actor_id)
			SELECT id, $1::uuid, 'became_visible', $2, $3 FROM dsh_stores WHERE partner_id=$1::uuid`,
			partnerID, in.Reason, in.ActorID,
		)
	}

	return p, tx.Commit()
}

// ── Documents ─────────────────────────────────────────────────────────────────

func AddDocument(db *sql.DB, partnerID string, in DocumentInput) (Document, error) {
	if in.DocType == "" || in.MediaRef == "" {
		return Document{}, ErrInvalid
	}
	var d Document
	err := db.QueryRow(`
		INSERT INTO dsh_partner_documents (partner_id, doc_type, media_ref, notes)
		VALUES ($1,$2,$3,$4)
		RETURNING id, partner_id, doc_type, status, media_ref, notes,
		          reviewed_by, reviewed_at, created_at, updated_at`,
		partnerID, in.DocType, in.MediaRef, in.Notes,
	).Scan(
		&d.ID, &d.PartnerID, &d.DocType, &d.Status, &d.MediaRef, &d.Notes,
		&d.ReviewedBy, &d.ReviewedAt, &d.CreatedAt, &d.UpdatedAt,
	)
	return d, err
}

func ListDocuments(db *sql.DB, partnerID string) ([]Document, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, doc_type, status, media_ref, notes,
		       reviewed_by, reviewed_at, created_at, updated_at
		FROM dsh_partner_documents WHERE partner_id=$1 ORDER BY created_at DESC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Document
	for rows.Next() {
		var d Document
		if err := rows.Scan(
			&d.ID, &d.PartnerID, &d.DocType, &d.Status, &d.MediaRef, &d.Notes,
			&d.ReviewedBy, &d.ReviewedAt, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	if out == nil {
		out = []Document{}
	}
	return out, rows.Err()
}

func ReviewDocument(db *sql.DB, partnerID, docID string, in ReviewDocInput) (Document, error) {
	if in.Status == "" || in.ReviewedBy == "" {
		return Document{}, ErrInvalid
	}
	var d Document
	err := db.QueryRow(`
		UPDATE dsh_partner_documents
		SET status=$1, notes=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW()
		WHERE id=$4 AND partner_id=$5
		RETURNING id, partner_id, doc_type, status, media_ref, notes,
		          reviewed_by, reviewed_at, created_at, updated_at`,
		in.Status, in.Notes, in.ReviewedBy, docID, partnerID,
	).Scan(
		&d.ID, &d.PartnerID, &d.DocType, &d.Status, &d.MediaRef, &d.Notes,
		&d.ReviewedBy, &d.ReviewedAt, &d.CreatedAt, &d.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Document{}, ErrNotFound
	}
	return d, err
}

// ── Audit events ──────────────────────────────────────────────────────────────

func ListEvents(db *sql.DB, partnerID string) ([]ActivationEvent, error) {
	rows, err := db.Query(`
		SELECT id, partner_id, from_status, to_status,
		       actor_id, actor_surface, reason, correlation_id, created_at
		FROM dsh_partner_activation_events
		WHERE partner_id=$1 ORDER BY created_at DESC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ActivationEvent
	for rows.Next() {
		var e ActivationEvent
		if err := rows.Scan(
			&e.ID, &e.PartnerID, &e.FromStatus, &e.ToStatus,
			&e.ActorID, &e.ActorSurface, &e.Reason, &e.CorrelationID, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	if out == nil {
		out = []ActivationEvent{}
	}
	return out, rows.Err()
}

// ── Stores linked to a partner ────────────────────────────────────────────────

type PartnerStore struct {
	ID          string    `json:"id"`
	PartnerID   string    `json:"partnerId"`
	Slug        string    `json:"slug"`
	DisplayName string    `json:"displayName"`
	Status      string    `json:"status"`
	IsVisible   bool      `json:"isVisible"`
	CityCode    string    `json:"cityCode"`
	CreatedAt   time.Time `json:"createdAt"`
}

func ListPartnerStores(db *sql.DB, partnerID string) ([]PartnerStore, error) {
	rows, err := db.Query(`
		SELECT id, COALESCE(partner_id::text,''), slug, display_name, status, is_visible, city_code, created_at
		FROM dsh_stores WHERE partner_id=$1::uuid ORDER BY created_at DESC`, partnerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PartnerStore
	for rows.Next() {
		var s PartnerStore
		if err := rows.Scan(&s.ID, &s.PartnerID, &s.Slug, &s.DisplayName, &s.Status, &s.IsVisible, &s.CityCode, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	if out == nil {
		out = []PartnerStore{}
	}
	return out, rows.Err()
}

func LinkStore(db *sql.DB, partnerID, storeID string) error {
	res, err := db.Exec(`UPDATE dsh_stores SET partner_id=$1::uuid WHERE id=$2`, partnerID, storeID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ── Readiness ─────────────────────────────────────────────────────────────────

type Readiness struct {
	PartnerID       string `json:"partnerId"`
	Status          string `json:"status"`
	DocumentsDone   bool   `json:"documentsDone"`
	CatalogDone     bool   `json:"catalogDone"`
	DeliveryDone    bool   `json:"deliveryDone"`
	PartnerActive   bool   `json:"partnerActive"`
	ClientVisible   bool   `json:"clientVisible"`
	BlockerSummary  string `json:"blockerSummary"`
}

func GetReadiness(db *sql.DB, partnerID string) (Readiness, error) {
	p, err := GetByID(db, partnerID)
	if err != nil {
		return Readiness{}, err
	}
	docsDone := isStatusAtOrPast(p.OnboardingStatus, "documents_verified")
	catalogDone := isStatusAtOrPast(p.OnboardingStatus, "catalog_ready")
	deliveryDone := isStatusAtOrPast(p.OnboardingStatus, "delivery_modes_ready")
	active := p.OnboardingStatus == "partner_active" || p.OnboardingStatus == "client_visible" || p.OnboardingStatus == "client_hidden"
	visible := p.OnboardingStatus == "client_visible"

	blocker := ""
	if !docsDone {
		blocker = "الوثائق غير مكتملة أو لم يتم التحقق منها"
	} else if !catalogDone {
		blocker = "الكتالوج فارغ أو غير معتمد"
	} else if !deliveryDone {
		blocker = "أوضاع التوصيل غير مهيأة"
	} else if !active {
		blocker = "بانتظار اعتماد العمليات النهائي"
	}

	return Readiness{
		PartnerID:      partnerID,
		Status:         p.OnboardingStatus,
		DocumentsDone:  docsDone,
		CatalogDone:    catalogDone,
		DeliveryDone:   deliveryDone,
		PartnerActive:  active,
		ClientVisible:  visible,
		BlockerSummary: blocker,
	}, nil
}

var statusOrder = []string{
	"draft", "submitted", "field_visit_scheduled", "field_visit_completed",
	"documents_missing", "documents_uploaded", "documents_verified",
	"catalog_not_ready", "catalog_ready",
	"delivery_modes_not_ready", "delivery_modes_ready",
	"ops_review", "ops_approved", "ops_rejected",
	"partner_active", "partner_deactivated", "client_visible", "client_hidden",
}

func statusIndex(s string) int {
	for i, v := range statusOrder {
		if v == s {
			return i
		}
	}
	return -1
}

func isStatusAtOrPast(current, milestone string) bool {
	return statusIndex(current) >= statusIndex(milestone)
}
