// Package catalogapproval backs the partner catalog approval queue: a
// partner (or field agent) submits a product/category/media/store change,
// it moves through marketing review and catalog adoption before becoming
// client-visible. This replaces the in-memory mock previously held in
// services/dsh/frontend/shared/partner/partner.workflow.ts.
package catalogapproval

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalid  = errors.New("invalid catalog approval input")
	ErrNotFound = errors.New("catalog approval record not found")
)

type Record struct {
	ID          string          `json:"id"`
	EntityType  string          `json:"entityType"`
	EntityID    string          `json:"entityId,omitempty"`
	Source      string          `json:"source"`
	Stage       string          `json:"stage"`
	Title       string          `json:"title"`
	Metadata    json.RawMessage `json:"metadata,omitempty"`
	SubmittedAt time.Time       `json:"submittedAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
	AuditTrail  []AuditEntry    `json:"auditTrail,omitempty"`
}

type AuditEntry struct {
	At          time.Time `json:"at"`
	FromStage   string    `json:"fromStage"`
	ToStage     string    `json:"toStage"`
	Owner       string    `json:"owner"`
	ActionLabel string    `json:"actionLabel"`
}

// PartnerQueueRecord is the safe projection exposed to the partner surface --
// it does not expose title/metadata/auditTrail (marketing/catalog-owned).
type PartnerQueueRecord struct {
	ID         string    `json:"id"`
	EntityID   string    `json:"entityId"`
	EntityType string    `json:"entityType"`
	Stage      string    `json:"stage"`
	Owner      string    `json:"owner"`
	CreatedAt  time.Time `json:"createdAt"`
}

var partnerQueueStages = map[string]bool{
	"partner-submitted": true,
	"field-submitted":   true,
	"partner-review":    true,
	"partner-approved":  true,
	"needs-fix":         true,
	"rejected":          true,
}

type CreateInput struct {
	EntityType string
	EntityID   string
	Source     string
	Stage      string
	Title      string
	Metadata   json.RawMessage
}

func Create(db *sql.DB, input CreateInput) (Record, error) {
	if input.EntityType == "" || input.Source == "" || input.Stage == "" || input.Title == "" {
		return Record{}, ErrInvalid
	}
	metadata := input.Metadata
	if len(metadata) == 0 {
		metadata = json.RawMessage(`{}`)
	}
	var entityID sql.NullString
	if input.EntityID != "" {
		entityID = sql.NullString{String: input.EntityID, Valid: true}
	}
	row := db.QueryRow(`
		INSERT INTO dsh_catalog_approval_records (id, entity_type, entity_id, source, stage, title, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, entity_type, COALESCE(entity_id,''), source, stage, title, metadata, submitted_at, updated_at`,
		uuid.NewString(), input.EntityType, entityID, input.Source, input.Stage, input.Title, metadata,
	)
	return scanRecord(row)
}

func Get(db *sql.DB, id string) (Record, error) {
	row := db.QueryRow(`
		SELECT id, entity_type, COALESCE(entity_id,''), source, stage, title, metadata, submitted_at, updated_at
		FROM dsh_catalog_approval_records WHERE id = $1`, id)
	rec, err := scanRecord(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Record{}, ErrNotFound
	}
	if err != nil {
		return Record{}, err
	}
	trail, err := listAuditTrail(db, id)
	if err != nil {
		return Record{}, err
	}
	rec.AuditTrail = trail
	return rec, nil
}

func List(db *sql.DB, entityType, stage, source string, limit int) ([]Record, error) {
	if limit <= 0 {
		limit = 100
	}
	q := `SELECT id, entity_type, COALESCE(entity_id,''), source, stage, title, metadata, submitted_at, updated_at
	      FROM dsh_catalog_approval_records WHERE 1=1`
	var args []any
	if entityType != "" {
		args = append(args, entityType)
		q += fmt.Sprintf(" AND entity_type = $%d", len(args))
	}
	if stage != "" {
		args = append(args, stage)
		q += fmt.Sprintf(" AND stage = $%d", len(args))
	}
	if source != "" {
		args = append(args, source)
		q += fmt.Sprintf(" AND source = $%d", len(args))
	}
	args = append(args, limit)
	q += fmt.Sprintf(" ORDER BY submitted_at DESC LIMIT $%d", len(args))

	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Record
	for rows.Next() {
		rec, err := scanRecordRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, rec)
	}
	return list, rows.Err()
}

// ListPartnerQueue returns the safe partner-facing projection, scoped to the
// stages a partner is allowed to see (partner submission/review lifecycle).
func ListPartnerQueue(db *sql.DB, source string, limit int) ([]PartnerQueueRecord, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := db.Query(`
		SELECT id, COALESCE(entity_id,''), entity_type, stage, source, submitted_at
		FROM dsh_catalog_approval_records
		WHERE source = $1
		  AND stage IN ('partner-submitted','field-submitted','partner-review','partner-approved','needs-fix','rejected')
		ORDER BY submitted_at DESC LIMIT $2`, source, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []PartnerQueueRecord
	for rows.Next() {
		var rec PartnerQueueRecord
		if err := rows.Scan(&rec.ID, &rec.EntityID, &rec.EntityType, &rec.Stage, &rec.Owner, &rec.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, rec)
	}
	return list, rows.Err()
}

func Transition(db *sql.DB, id, toStage, owner, actionLabel string) (Record, error) {
	if id == "" || toStage == "" || owner == "" || actionLabel == "" {
		return Record{}, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return Record{}, err
	}
	defer tx.Rollback()

	var fromStage string
	if err := tx.QueryRow(`SELECT stage FROM dsh_catalog_approval_records WHERE id = $1 FOR UPDATE`, id).Scan(&fromStage); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Record{}, ErrNotFound
		}
		return Record{}, err
	}

	row := tx.QueryRow(`
		UPDATE dsh_catalog_approval_records SET stage = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, entity_type, COALESCE(entity_id,''), source, stage, title, metadata, submitted_at, updated_at`,
		id, toStage,
	)
	rec, err := scanRecord(row)
	if err != nil {
		return Record{}, err
	}

	if _, err := tx.Exec(`
		INSERT INTO dsh_catalog_approval_audit_trail (id, approval_record_id, from_stage, to_stage, owner, action_label)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		uuid.NewString(), id, fromStage, toStage, owner, actionLabel,
	); err != nil {
		return Record{}, err
	}

	if err := tx.Commit(); err != nil {
		return Record{}, err
	}
	trail, err := listAuditTrail(db, id)
	if err != nil {
		return Record{}, err
	}
	rec.AuditTrail = trail
	return rec, nil
}

func listAuditTrail(db *sql.DB, recordID string) ([]AuditEntry, error) {
	rows, err := db.Query(`
		SELECT from_stage, to_stage, owner, action_label, at
		FROM dsh_catalog_approval_audit_trail WHERE approval_record_id = $1 ORDER BY at ASC`, recordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []AuditEntry
	for rows.Next() {
		var e AuditEntry
		if err := rows.Scan(&e.FromStage, &e.ToStage, &e.Owner, &e.ActionLabel, &e.At); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanRecord(s rowScanner) (Record, error) {
	var rec Record
	var metadata []byte
	err := s.Scan(&rec.ID, &rec.EntityType, &rec.EntityID, &rec.Source, &rec.Stage, &rec.Title, &metadata, &rec.SubmittedAt, &rec.UpdatedAt)
	if err != nil {
		return Record{}, err
	}
	rec.Metadata = metadata
	return rec, nil
}

func scanRecordRow(rows *sql.Rows) (Record, error) {
	return scanRecord(rows)
}
