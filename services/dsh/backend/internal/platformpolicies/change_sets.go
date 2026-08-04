package platformpolicies

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrChangeSetInvalidState    = errors.New("invalid state transition for change set")
	ErrChangeSetNotFound        = errors.New("change set not found")
	ErrChangeSetVersionConflict = errors.New("change set base version conflict")
	ErrSelfApprovalForbidden    = errors.New("self approval is forbidden")
)

type ChangeSetStatus string

const (
	StatusDraft      ChangeSetStatus = "DRAFT"
	StatusReview     ChangeSetStatus = "REVIEW"
	StatusApproved   ChangeSetStatus = "APPROVED"
	StatusScheduled  ChangeSetStatus = "SCHEDULED"
	StatusApplied    ChangeSetStatus = "APPLIED"
	StatusRolledBack ChangeSetStatus = "ROLLED_BACK"
	StatusFailed     ChangeSetStatus = "FAILED"
)

type ChangeSet struct {
	ID              string          `json:"id"`
	TargetType      string          `json:"targetType"`
	TargetID        string          `json:"targetId"`
	Status          ChangeSetStatus `json:"status"`
	BaseVersion     int             `json:"baseVersion"`
	ProposedPayload json.RawMessage `json:"proposedPayload"`
	CreatedBy       string          `json:"createdBy"`
	ReviewedBy      *string         `json:"reviewedBy,omitempty"`
	ApprovedBy      *string         `json:"approvedBy,omitempty"`
	AppliedBy       *string         `json:"appliedBy,omitempty"`
	EffectiveTime   *time.Time      `json:"effectiveTime,omitempty"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

type DraftChangeSetInput struct {
	TargetType      string          `json:"targetType"`
	TargetID        string          `json:"targetId"`
	BaseVersion     int             `json:"baseVersion"`
	ProposedPayload json.RawMessage `json:"proposedPayload"`
}

func CreateDraftChangeSet(
	ctx context.Context,
	db *sql.DB,
	input DraftChangeSetInput,
	actorID string,
) (ChangeSet, error) {
	if input.TargetType == "" || input.TargetID == "" || input.BaseVersion < 1 {
		return ChangeSet{}, ErrInvalid
	}

	var cs ChangeSet
	err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_platform_change_sets (
			target_type, target_id, status, base_version, proposed_payload, created_by
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, target_type, target_id, status, base_version, proposed_payload, created_by, created_at, updated_at`,
		input.TargetType, input.TargetID, StatusDraft, input.BaseVersion, input.ProposedPayload, actorID,
	).Scan(
		&cs.ID, &cs.TargetType, &cs.TargetID, &cs.Status, &cs.BaseVersion, &cs.ProposedPayload, &cs.CreatedBy, &cs.CreatedAt, &cs.UpdatedAt,
	)
	if err != nil {
		return ChangeSet{}, err
	}
	return cs, nil
}

func SubmitForReview(ctx context.Context, db *sql.DB, changeSetID string, actorID string) (ChangeSet, error) {
	return transitionChangeSet(ctx, db, changeSetID, actorID, StatusDraft, StatusReview, func(cs *ChangeSet, actor string) error {
		return nil
	})
}

func ApproveChangeSet(ctx context.Context, db *sql.DB, changeSetID string, actorID string) (ChangeSet, error) {
	return transitionChangeSet(ctx, db, changeSetID, actorID, StatusReview, StatusApproved, func(cs *ChangeSet, actor string) error {
		if cs.CreatedBy == actor {
			return ErrSelfApprovalForbidden
		}
		cs.ApprovedBy = &actor
		return nil
	})
}

// Applying the changeset usually happens via a worker or immediately if no schedule is set.
// A real apply engine would fetch the active Target, verify base_version, and apply ProposedPayload.
func MarkApplied(ctx context.Context, db *sql.Tx, changeSetID string, actorID string) error {
	res, err := db.ExecContext(ctx, `
		UPDATE dsh_platform_change_sets
		SET status = $1, applied_by = $2, updated_at = NOW()
		WHERE id = $3 AND status IN ($4, $5)`,
		StatusApplied, actorID, changeSetID, StatusApproved, StatusScheduled,
	)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrChangeSetInvalidState
	}
	return nil
}

func transitionChangeSet(
	ctx context.Context,
	db *sql.DB,
	changeSetID string,
	actorID string,
	expectedStatus ChangeSetStatus,
	newStatus ChangeSetStatus,
	validate func(*ChangeSet, string) error,
) (ChangeSet, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var cs ChangeSet
	err = tx.QueryRowContext(ctx, `
		SELECT id, target_type, target_id, status, base_version, proposed_payload, created_by, approved_by, applied_by, effective_time, created_at, updated_at
		FROM dsh_platform_change_sets
		WHERE id = $1
		FOR UPDATE`, changeSetID).Scan(
		&cs.ID, &cs.TargetType, &cs.TargetID, &cs.Status, &cs.BaseVersion, &cs.ProposedPayload, &cs.CreatedBy, &cs.ApprovedBy, &cs.AppliedBy, &cs.EffectiveTime, &cs.CreatedAt, &cs.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ChangeSet{}, ErrChangeSetNotFound
	}
	if err != nil {
		return ChangeSet{}, err
	}
	if cs.Status != expectedStatus {
		return ChangeSet{}, ErrChangeSetInvalidState
	}

	if validate != nil {
		if err := validate(&cs, actorID); err != nil {
			return ChangeSet{}, err
		}
	}

	cs.Status = newStatus
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_platform_change_sets
		SET status = $1, approved_by = $2, applied_by = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING updated_at`,
		cs.Status, cs.ApprovedBy, cs.AppliedBy, cs.ID,
	).Scan(&cs.UpdatedAt)

	if err != nil {
		return ChangeSet{}, err
	}

	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return cs, nil
}
