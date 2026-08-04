package changeset

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

type Status string

const (
	StatusDraft       Status = "DRAFT"
	StatusReview      Status = "REVIEW"
	StatusApproved    Status = "APPROVED"
	StatusScheduled   Status = "SCHEDULED"
	StatusApplied     Status = "APPLIED"
	StatusRolledBack  Status = "ROLLED_BACK"
	StatusFailed      Status = "FAILED"
)

type ChangeSet struct {
	ID              string
	TargetType      string
	TargetID        string
	Status          Status
	BaseVersion     int
	ProposedPayload json.RawMessage
	CreatedBy       string
	ReviewedBy      *string
	ApprovedBy      *string
	AppliedBy       *string
	EffectiveTime   *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) Create(ctx context.Context, targetType, targetID string, baseVersion int, payload json.RawMessage, createdBy string) (*ChangeSet, error) {
	query := `
		INSERT INTO dsh_platform_change_sets (target_type, target_id, base_version, proposed_payload, created_by, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, target_type, target_id, status, base_version, proposed_payload, created_by, created_at, updated_at
	`
	var cs ChangeSet
	err := s.db.QueryRowContext(ctx, query, targetType, targetID, baseVersion, payload, createdBy, StatusDraft).
		Scan(&cs.ID, &cs.TargetType, &cs.TargetID, &cs.Status, &cs.BaseVersion, &cs.ProposedPayload, &cs.CreatedBy, &cs.CreatedAt, &cs.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create change set: %w", err)
	}
	return &cs, nil
}

func (s *Service) SubmitForReview(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `UPDATE dsh_platform_change_sets SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3`, StatusReview, id, StatusDraft)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("change set not found or not in DRAFT state")
	}
	return nil
}

func (s *Service) Approve(ctx context.Context, id, approvedBy string) error {
	var createdBy string
	err := s.db.QueryRowContext(ctx, `SELECT created_by FROM dsh_platform_change_sets WHERE id = $1`, id).Scan(&createdBy)
	if err != nil {
		return err
	}
	if createdBy == approvedBy {
		return errors.New("separation of duties violation: creator cannot approve their own change set")
	}

	res, err := s.db.ExecContext(ctx, `UPDATE dsh_platform_change_sets SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3 AND status = $4`, StatusApproved, approvedBy, id, StatusReview)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("change set not found or not in REVIEW state")
	}
	return nil
}

func (s *Service) Apply(ctx context.Context, id, appliedBy string) error {
	res, err := s.db.ExecContext(ctx, `UPDATE dsh_platform_change_sets SET status = $1, applied_by = $2, updated_at = NOW() WHERE id = $3 AND status = $4`, StatusApplied, appliedBy, id, StatusApproved)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("change set not found or not in APPROVED state")
	}
	return nil
}

func (s *Service) Reject(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `UPDATE dsh_platform_change_sets SET status = $1, updated_at = NOW() WHERE id = $2 AND status IN ($3, $4)`, StatusFailed, id, StatusDraft, StatusReview)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("change set not found or cannot be rejected from current state")
	}
	return nil
}

func (s *Service) Get(ctx context.Context, id string) (*ChangeSet, error) {
	query := `
		SELECT id, target_type, target_id, status, base_version, proposed_payload, created_by, reviewed_by, approved_by, applied_by, effective_time, created_at, updated_at
		FROM dsh_platform_change_sets
		WHERE id = $1
	`
	var cs ChangeSet
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&cs.ID, &cs.TargetType, &cs.TargetID, &cs.Status, &cs.BaseVersion, &cs.ProposedPayload, &cs.CreatedBy,
		&cs.ReviewedBy, &cs.ApprovedBy, &cs.AppliedBy, &cs.EffectiveTime, &cs.CreatedAt, &cs.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &cs, nil
}
