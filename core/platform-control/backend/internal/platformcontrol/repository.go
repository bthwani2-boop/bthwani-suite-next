package platformcontrol

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
)

var (
	ErrNotFound          = errors.New("platform record not found")
	ErrInvalidTransition = errors.New("invalid platform workflow transition")
	ErrVersionConflict   = errors.New("platform revision conflict")
	ErrMakerChecker      = errors.New("proposer cannot approve own change")
	ErrValidation        = errors.New("platform change validation failed")
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Ready(ctx context.Context) error {
	if r == nil || r.db == nil {
		return errors.New("platform repository is not configured")
	}
	return r.db.PingContext(ctx)
}

func (r *Repository) Variables(ctx context.Context) ([]Variable, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT variable_key, owner_service, value_type, classification, scope_type,
       scope_id, value_json, revision, status, effective_from, expires_at
FROM platform_variables
ORDER BY owner_service, variable_key, scope_type, scope_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	variables := make([]Variable, 0)
	for rows.Next() {
		var variable Variable
		var raw []byte
		var revision int64
		var status string
		if err := rows.Scan(
			&variable.Key,
			&variable.OwnerService,
			&variable.ValueType,
			&variable.Classification,
			&variable.ScopeType,
			&variable.ScopeID,
			&raw,
			&revision,
			&status,
			&variable.EffectiveFrom,
			&variable.ExpiresAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(raw, &variable.Value); err != nil {
			return nil, fmt.Errorf("decode variable %s: %w", variable.Key, err)
		}
		variable.Revision = strconv.FormatInt(revision, 10)
		variable.Status = persistedState(status)
		variables = append(variables, variable)
	}
	return variables, rows.Err()
}

func (r *Repository) FeatureFlags(ctx context.Context) ([]FeatureFlag, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT flag_key, owner_service, enabled, revision, status, targeting_json
FROM platform_feature_flags
ORDER BY owner_service, flag_key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	flags := make([]FeatureFlag, 0)
	for rows.Next() {
		var flag FeatureFlag
		var enabled bool
		var revision int64
		var status string
		var raw []byte
		if err := rows.Scan(
			&flag.Key,
			&flag.Owner,
			&enabled,
			&revision,
			&status,
			&raw,
		); err != nil {
			return nil, err
		}
		flag.Enabled = &enabled
		flag.Revision = strconv.FormatInt(revision, 10)
		flag.Status = persistedState(status)
		if err := json.Unmarshal(raw, &flag.Targeting); err != nil {
			return nil, fmt.Errorf("decode flag %s targeting: %w", flag.Key, err)
		}
		flags = append(flags, flag)
	}
	return flags, rows.Err()
}

func persistedState(status string) PlatformControlState {
	if status == "active" {
		return StateOperational
	}
	return StatePartiallyBound
}

func (r *Repository) EffectiveRuntimeConfig(ctx context.Context) (EffectiveRuntimeConfig, error) {
	variables, err := r.Variables(ctx)
	if err != nil {
		return EffectiveRuntimeConfig{}, err
	}
	flags, err := r.FeatureFlags(ctx)
	if err != nil {
		return EffectiveRuntimeConfig{}, err
	}

	values := make(map[string]any, len(variables)+len(flags))
	var revision int64
	for _, variable := range variables {
		key := variable.Key
		if variable.ScopeType != "global" || variable.ScopeID != "" {
			key = fmt.Sprintf("%s@%s:%s", variable.Key, variable.ScopeType, variable.ScopeID)
		}
		values[key] = variable.Value
		if parsed, parseErr := strconv.ParseInt(variable.Revision, 10, 64); parseErr == nil && parsed > revision {
			revision = parsed
		}
	}
	for _, flag := range flags {
		values["flag:"+flag.Key] = flag.Enabled != nil && *flag.Enabled
		if parsed, parseErr := strconv.ParseInt(flag.Revision, 10, 64); parseErr == nil && parsed > revision {
			revision = parsed
		}
	}

	return EffectiveRuntimeConfig{
		Revision:        fmt.Sprintf("platform-control-db-%d", revision),
		Stale:           false,
		FallbackUsed:    false,
		EvaluationTrace: []string{"platform-control PostgreSQL store", "active variables and feature flags"},
		Values:          values,
	}, nil
}

func (r *Repository) AuditEvents(ctx context.Context) ([]AuditEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id::text, COALESCE(change_set_id::text, ''), action, actor_id,
       actor_roles, status, reason, correlation_id, created_at
FROM platform_audit_events
ORDER BY created_at DESC
LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]AuditEvent, 0)
	for rows.Next() {
		var event AuditEvent
		if err := rows.Scan(
			&event.ID,
			&event.ChangeSetID,
			&event.Action,
			&event.ActorID,
			pq.Array(&event.ActorRoles),
			&event.Status,
			&event.Reason,
			&event.CorrelationID,
			&event.CreatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

func (r *Repository) ChangeSets(ctx context.Context) ([]ChangeSet, error) {
	rows, err := r.db.QueryContext(ctx, changeSetSelect+`
ORDER BY created_at DESC
LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	changeSets := make([]ChangeSet, 0)
	for rows.Next() {
		changeSet, scanErr := scanChangeSet(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items, itemErr := r.changeSetItems(ctx, changeSet.ID)
		if itemErr != nil {
			return nil, itemErr
		}
		changeSet.Items = items
		changeSets = append(changeSets, changeSet)
	}
	return changeSets, rows.Err()
}

func (r *Repository) GetChangeSet(ctx context.Context, id string) (ChangeSet, error) {
	row := r.db.QueryRowContext(ctx, changeSetSelect+` WHERE id = $1::uuid`, id)
	changeSet, err := scanChangeSet(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ChangeSet{}, ErrNotFound
	}
	if err != nil {
		return ChangeSet{}, err
	}
	items, err := r.changeSetItems(ctx, id)
	if err != nil {
		return ChangeSet{}, err
	}
	changeSet.Items = items
	return changeSet, nil
}

const changeSetSelect = `
SELECT id::text, title, reason, impact_assessment, rollback_plan, status,
       proposer_actor_id, COALESCE(approver_actor_id, ''),
       COALESCE(applied_by_actor_id, ''), COALESCE(rejected_by_actor_id, ''),
       COALESCE(rejection_reason, ''), version, created_at, updated_at,
       validated_at, submitted_at, approved_at, rejected_at, applied_at, rolled_back_at
FROM platform_change_sets`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanChangeSet(row rowScanner) (ChangeSet, error) {
	var changeSet ChangeSet
	var status string
	err := row.Scan(
		&changeSet.ID,
		&changeSet.Title,
		&changeSet.Reason,
		&changeSet.ImpactAssessment,
		&changeSet.RollbackPlan,
		&status,
		&changeSet.ProposerActorID,
		&changeSet.ApproverActorID,
		&changeSet.AppliedByActorID,
		&changeSet.RejectedByActorID,
		&changeSet.RejectionReason,
		&changeSet.Version,
		&changeSet.CreatedAt,
		&changeSet.UpdatedAt,
		&changeSet.ValidatedAt,
		&changeSet.SubmittedAt,
		&changeSet.ApprovedAt,
		&changeSet.RejectedAt,
		&changeSet.AppliedAt,
		&changeSet.RolledBackAt,
	)
	changeSet.Status = ChangeSetStatus(status)
	return changeSet, err
}

func (r *Repository) changeSetItems(ctx context.Context, changeSetID string) ([]ChangeSetItem, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id::text, target_type, target_key, owner_service, scope_type, scope_id,
       value_type, classification, expected_revision, before_value_json,
       proposed_value_json, applied_revision
FROM platform_change_set_items
WHERE change_set_id = $1::uuid
ORDER BY created_at, id`, changeSetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ChangeSetItem, 0)
	for rows.Next() {
		var item ChangeSetItem
		var targetType string
		var beforeRaw, proposedRaw []byte
		var appliedRevision sql.NullInt64
		if err := rows.Scan(
			&item.ID,
			&targetType,
			&item.TargetKey,
			&item.OwnerService,
			&item.ScopeType,
			&item.ScopeID,
			&item.ValueType,
			&item.Classification,
			&item.ExpectedRevision,
			&beforeRaw,
			&proposedRaw,
			&appliedRevision,
		); err != nil {
			return nil, err
		}
		item.TargetType = ChangeTargetType(targetType)
		if len(beforeRaw) > 0 {
			if err := json.Unmarshal(beforeRaw, &item.BeforeValue); err != nil {
				return nil, err
			}
		}
		if err := json.Unmarshal(proposedRaw, &item.ProposedValue); err != nil {
			return nil, err
		}
		if appliedRevision.Valid {
			value := appliedRevision.Int64
			item.AppliedRevision = &value
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateChangeSet(
	ctx context.Context,
	actorID string,
	actorRoles []string,
	correlationID string,
	input CreateChangeSetInput,
) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var id string
	err = tx.QueryRowContext(ctx, `
INSERT INTO platform_change_sets
    (title, reason, impact_assessment, rollback_plan, proposer_actor_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id::text`,
		strings.TrimSpace(input.Title),
		strings.TrimSpace(input.Reason),
		strings.TrimSpace(input.ImpactAssessment),
		strings.TrimSpace(input.RollbackPlan),
		actorID,
	).Scan(&id)
	if err != nil {
		return ChangeSet{}, err
	}

	for _, item := range input.Items {
		scopeType := strings.TrimSpace(item.ScopeType)
		if scopeType == "" {
			scopeType = "global"
		}
		valueType := strings.TrimSpace(item.ValueType)
		if valueType == "" {
			valueType = "json"
		}
		classification := strings.TrimSpace(item.Classification)
		if classification == "" {
			classification = "internal"
		}
		_, err = tx.ExecContext(ctx, `
INSERT INTO platform_change_set_items
    (change_set_id, target_type, target_key, owner_service, scope_type,
     scope_id, value_type, classification, expected_revision, proposed_value_json)
VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
			id,
			item.TargetType,
			strings.TrimSpace(item.TargetKey),
			strings.TrimSpace(item.OwnerService),
			scopeType,
			strings.TrimSpace(item.ScopeID),
			valueType,
			classification,
			item.ExpectedRevision,
			[]byte(item.ProposedValue),
		)
		if err != nil {
			return ChangeSet{}, err
		}
	}

	if err := insertAudit(ctx, tx, id, "change_set_created", actorID, actorRoles, string(ChangeSetDraft), input.Reason, correlationID, nil, input); err != nil {
		return ChangeSet{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return r.GetChangeSet(ctx, id)
}

func (r *Repository) ValidateChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return r.transition(ctx, id, []ChangeSetStatus{ChangeSetDraft}, ChangeSetValidated, actorID, roles, correlationID, "change_set_validated", "")
}

func (r *Repository) SubmitChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return r.transition(ctx, id, []ChangeSetStatus{ChangeSetValidated}, ChangeSetSubmitted, actorID, roles, correlationID, "change_set_submitted", "")
}

func (r *Repository) ApproveChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var proposer string
	var status string
	if err := tx.QueryRowContext(ctx, `SELECT proposer_actor_id, status FROM platform_change_sets WHERE id = $1::uuid FOR UPDATE`, id).Scan(&proposer, &status); errors.Is(err, sql.ErrNoRows) {
		return ChangeSet{}, ErrNotFound
	} else if err != nil {
		return ChangeSet{}, err
	}
	if ChangeSetStatus(status) != ChangeSetSubmitted {
		return ChangeSet{}, ErrInvalidTransition
	}
	if proposer == actorID {
		return ChangeSet{}, ErrMakerChecker
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE platform_change_sets
SET status = 'approved', approver_actor_id = $2, approved_at = NOW(),
    updated_at = NOW(), version = version + 1
WHERE id = $1::uuid`, id, actorID); err != nil {
		return ChangeSet{}, err
	}
	if err := insertAudit(ctx, tx, id, "change_set_approved", actorID, roles, string(ChangeSetApproved), "", correlationID, map[string]any{"status": status}, map[string]any{"status": ChangeSetApproved}); err != nil {
		return ChangeSet{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return r.GetChangeSet(ctx, id)
}

func (r *Repository) RejectChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID, reason string) (ChangeSet, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return ChangeSet{}, ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var status string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM platform_change_sets WHERE id = $1::uuid FOR UPDATE`, id).Scan(&status); errors.Is(err, sql.ErrNoRows) {
		return ChangeSet{}, ErrNotFound
	} else if err != nil {
		return ChangeSet{}, err
	}
	if ChangeSetStatus(status) != ChangeSetSubmitted {
		return ChangeSet{}, ErrInvalidTransition
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE platform_change_sets
SET status = 'rejected', rejected_by_actor_id = $2, rejection_reason = $3,
    rejected_at = NOW(), updated_at = NOW(), version = version + 1
WHERE id = $1::uuid`, id, actorID, reason); err != nil {
		return ChangeSet{}, err
	}
	if err := insertAudit(ctx, tx, id, "change_set_rejected", actorID, roles, string(ChangeSetRejected), reason, correlationID, map[string]any{"status": status}, map[string]any{"status": ChangeSetRejected}); err != nil {
		return ChangeSet{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return r.GetChangeSet(ctx, id)
}

func (r *Repository) transition(
	ctx context.Context,
	id string,
	allowed []ChangeSetStatus,
	next ChangeSetStatus,
	actorID string,
	roles []string,
	correlationID, action, reason string,
) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var status string
	var itemCount int
	if err := tx.QueryRowContext(ctx, `
SELECT cs.status, COUNT(csi.id)
FROM platform_change_sets cs
LEFT JOIN platform_change_set_items csi ON csi.change_set_id = cs.id
WHERE cs.id = $1::uuid
GROUP BY cs.id
FOR UPDATE OF cs`, id).Scan(&status, &itemCount); errors.Is(err, sql.ErrNoRows) {
		return ChangeSet{}, ErrNotFound
	} else if err != nil {
		return ChangeSet{}, err
	}
	if itemCount == 0 {
		return ChangeSet{}, ErrValidation
	}
	current := ChangeSetStatus(status)
	allowedCurrent := false
	for _, candidate := range allowed {
		if candidate == current {
			allowedCurrent = true
			break
		}
	}
	if !allowedCurrent {
		return ChangeSet{}, ErrInvalidTransition
	}

	timestampColumn := map[ChangeSetStatus]string{
		ChangeSetValidated: "validated_at",
		ChangeSetSubmitted: "submitted_at",
	}[next]
	if timestampColumn == "" {
		return ChangeSet{}, ErrInvalidTransition
	}
	query := fmt.Sprintf(`
UPDATE platform_change_sets
SET status = $2, %s = NOW(), updated_at = NOW(), version = version + 1
WHERE id = $1::uuid`, timestampColumn)
	if _, err := tx.ExecContext(ctx, query, id, next); err != nil {
		return ChangeSet{}, err
	}
	if err := insertAudit(ctx, tx, id, action, actorID, roles, string(next), reason, correlationID, map[string]any{"status": current}, map[string]any{"status": next}); err != nil {
		return ChangeSet{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return r.GetChangeSet(ctx, id)
}

func (r *Repository) ApplyChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var status string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM platform_change_sets WHERE id = $1::uuid FOR UPDATE`, id).Scan(&status); errors.Is(err, sql.ErrNoRows) {
		return ChangeSet{}, ErrNotFound
	} else if err != nil {
		return ChangeSet{}, err
	}
	if ChangeSetStatus(status) != ChangeSetApproved {
		return ChangeSet{}, ErrInvalidTransition
	}

	items, err := changeSetItemsTx(ctx, tx, id)
	if err != nil {
		return ChangeSet{}, err
	}
	if len(items) == 0 {
		return ChangeSet{}, ErrValidation
	}
	for _, item := range items {
		if err := applyItem(ctx, tx, item); err != nil {
			return ChangeSet{}, err
		}
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE platform_change_sets
SET status = 'applied', applied_by_actor_id = $2, applied_at = NOW(),
    updated_at = NOW(), version = version + 1
WHERE id = $1::uuid`, id, actorID); err != nil {
		return ChangeSet{}, err
	}
	if err := insertAudit(ctx, tx, id, "change_set_applied", actorID, roles, string(ChangeSetApplied), "", correlationID, map[string]any{"status": status}, map[string]any{"status": ChangeSetApplied}); err != nil {
		return ChangeSet{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return r.GetChangeSet(ctx, id)
}

func changeSetItemsTx(ctx context.Context, tx *sql.Tx, id string) ([]ChangeSetItem, error) {
	rows, err := tx.QueryContext(ctx, `
SELECT id::text, target_type, target_key, owner_service, scope_type, scope_id,
       value_type, classification, expected_revision, proposed_value_json
FROM platform_change_set_items
WHERE change_set_id = $1::uuid
ORDER BY created_at, id
FOR UPDATE`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]ChangeSetItem, 0)
	for rows.Next() {
		var item ChangeSetItem
		var targetType string
		var proposedRaw []byte
		if err := rows.Scan(
			&item.ID,
			&targetType,
			&item.TargetKey,
			&item.OwnerService,
			&item.ScopeType,
			&item.ScopeID,
			&item.ValueType,
			&item.Classification,
			&item.ExpectedRevision,
			&proposedRaw,
		); err != nil {
			return nil, err
		}
		item.TargetType = ChangeTargetType(targetType)
		if err := json.Unmarshal(proposedRaw, &item.ProposedValue); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func applyItem(ctx context.Context, tx *sql.Tx, item ChangeSetItem) error {
	proposedRaw, err := json.Marshal(item.ProposedValue)
	if err != nil {
		return err
	}
	switch item.TargetType {
	case ChangeTargetVariable:
		var beforeRaw []byte
		var currentRevision int64
		err := tx.QueryRowContext(ctx, `
SELECT value_json, revision
FROM platform_variables
WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3
FOR UPDATE`, item.TargetKey, item.ScopeType, item.ScopeID).Scan(&beforeRaw, &currentRevision)
		if errors.Is(err, sql.ErrNoRows) {
			if item.ExpectedRevision != 0 {
				return ErrVersionConflict
			}
			currentRevision = 0
			beforeRaw = nil
		} else if err != nil {
			return err
		} else if currentRevision != item.ExpectedRevision {
			return ErrVersionConflict
		}
		nextRevision := currentRevision + 1
		_, err = tx.ExecContext(ctx, `
INSERT INTO platform_variables
    (variable_key, owner_service, value_type, classification, scope_type, scope_id,
     value_json, revision, status, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'active', NOW())
ON CONFLICT (variable_key, scope_type, scope_id) DO UPDATE
SET owner_service = EXCLUDED.owner_service,
    value_type = EXCLUDED.value_type,
    classification = EXCLUDED.classification,
    value_json = EXCLUDED.value_json,
    revision = EXCLUDED.revision,
    status = 'active',
    updated_at = NOW()`,
			item.TargetKey, item.OwnerService, item.ValueType, item.Classification,
			item.ScopeType, item.ScopeID, proposedRaw, nextRevision,
		)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `
UPDATE platform_change_set_items
SET before_value_json = $2::jsonb, applied_revision = $3
WHERE id = $1::uuid`, item.ID, nullableJSON(beforeRaw), nextRevision)
		return err

	case ChangeTargetFeatureFlag:
		enabled, ok := item.ProposedValue.(bool)
		if !ok {
			return fmt.Errorf("%w: feature flag proposedValue must be boolean", ErrValidation)
		}
		var beforeEnabled bool
		var currentRevision int64
		err := tx.QueryRowContext(ctx, `
SELECT enabled, revision
FROM platform_feature_flags
WHERE flag_key = $1
FOR UPDATE`, item.TargetKey).Scan(&beforeEnabled, &currentRevision)
		var beforeRaw []byte
		if errors.Is(err, sql.ErrNoRows) {
			if item.ExpectedRevision != 0 {
				return ErrVersionConflict
			}
			currentRevision = 0
			beforeRaw = nil
		} else if err != nil {
			return err
		} else {
			if currentRevision != item.ExpectedRevision {
				return ErrVersionConflict
			}
			beforeRaw, _ = json.Marshal(beforeEnabled)
		}
		nextRevision := currentRevision + 1
		_, err = tx.ExecContext(ctx, `
INSERT INTO platform_feature_flags
    (flag_key, owner_service, enabled, revision, status, updated_at)
VALUES ($1, $2, $3, $4, 'active', NOW())
ON CONFLICT (flag_key) DO UPDATE
SET owner_service = EXCLUDED.owner_service,
    enabled = EXCLUDED.enabled,
    revision = EXCLUDED.revision,
    status = 'active',
    updated_at = NOW()`, item.TargetKey, item.OwnerService, enabled, nextRevision)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `
UPDATE platform_change_set_items
SET before_value_json = $2::jsonb, applied_revision = $3
WHERE id = $1::uuid`, item.ID, nullableJSON(beforeRaw), nextRevision)
		return err
	default:
		return ErrValidation
	}
}

func nullableJSON(raw []byte) any {
	if len(raw) == 0 {
		return nil
	}
	return raw
}

func (r *Repository) RollbackChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return ChangeSet{}, err
	}
	defer tx.Rollback()

	var status string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM platform_change_sets WHERE id = $1::uuid FOR UPDATE`, id).Scan(&status); errors.Is(err, sql.ErrNoRows) {
		return ChangeSet{}, ErrNotFound
	} else if err != nil {
		return ChangeSet{}, err
	}
	if ChangeSetStatus(status) != ChangeSetApplied {
		return ChangeSet{}, ErrInvalidTransition
	}

	rows, err := tx.QueryContext(ctx, `
SELECT id::text, target_type, target_key, scope_type, scope_id,
       before_value_json, applied_revision
FROM platform_change_set_items
WHERE change_set_id = $1::uuid
ORDER BY created_at DESC, id DESC
FOR UPDATE`, id)
	if err != nil {
		return ChangeSet{}, err
	}
	type rollbackItem struct {
		id              string
		targetType      ChangeTargetType
		targetKey       string
		scopeType       string
		scopeID         string
		beforeRaw       []byte
		appliedRevision int64
	}
	items := make([]rollbackItem, 0)
	for rows.Next() {
		var item rollbackItem
		var targetType string
		var appliedRevision sql.NullInt64
		if err := rows.Scan(&item.id, &targetType, &item.targetKey, &item.scopeType, &item.scopeID, &item.beforeRaw, &appliedRevision); err != nil {
			rows.Close()
			return ChangeSet{}, err
		}
		if !appliedRevision.Valid {
			rows.Close()
			return ChangeSet{}, ErrInvalidTransition
		}
		item.targetType = ChangeTargetType(targetType)
		item.appliedRevision = appliedRevision.Int64
		items = append(items, item)
	}
	if err := rows.Close(); err != nil {
		return ChangeSet{}, err
	}
	if len(items) == 0 {
		return ChangeSet{}, ErrValidation
	}

	for _, item := range items {
		if err := rollbackAppliedItem(ctx, tx, item.targetType, item.targetKey, item.scopeType, item.scopeID, item.beforeRaw, item.appliedRevision); err != nil {
			return ChangeSet{}, err
		}
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE platform_change_sets
SET status = 'rolled_back', rolled_back_at = NOW(), updated_at = NOW(), version = version + 1
WHERE id = $1::uuid`, id); err != nil {
		return ChangeSet{}, err
	}
	if err := insertAudit(ctx, tx, id, "change_set_rolled_back", actorID, roles, string(ChangeSetRolledBack), "", correlationID, map[string]any{"status": status}, map[string]any{"status": ChangeSetRolledBack}); err != nil {
		return ChangeSet{}, err
	}
	if err := tx.Commit(); err != nil {
		return ChangeSet{}, err
	}
	return r.GetChangeSet(ctx, id)
}

func rollbackAppliedItem(
	ctx context.Context,
	tx *sql.Tx,
	targetType ChangeTargetType,
	targetKey, scopeType, scopeID string,
	beforeRaw []byte,
	appliedRevision int64,
) error {
	switch targetType {
	case ChangeTargetVariable:
		var currentRevision int64
		if err := tx.QueryRowContext(ctx, `
SELECT revision FROM platform_variables
WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3
FOR UPDATE`, targetKey, scopeType, scopeID).Scan(&currentRevision); errors.Is(err, sql.ErrNoRows) {
			return ErrVersionConflict
		} else if err != nil {
			return err
		}
		if currentRevision != appliedRevision {
			return ErrVersionConflict
		}
		if len(beforeRaw) == 0 {
			_, err := tx.ExecContext(ctx, `DELETE FROM platform_variables WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3 AND revision = $4`, targetKey, scopeType, scopeID, appliedRevision)
			return err
		}
		_, err := tx.ExecContext(ctx, `
UPDATE platform_variables
SET value_json = $4::jsonb, revision = revision + 1, updated_at = NOW()
WHERE variable_key = $1 AND scope_type = $2 AND scope_id = $3 AND revision = $5`, targetKey, scopeType, scopeID, beforeRaw, appliedRevision)
		return err

	case ChangeTargetFeatureFlag:
		var currentRevision int64
		if err := tx.QueryRowContext(ctx, `SELECT revision FROM platform_feature_flags WHERE flag_key = $1 FOR UPDATE`, targetKey).Scan(&currentRevision); errors.Is(err, sql.ErrNoRows) {
			return ErrVersionConflict
		} else if err != nil {
			return err
		}
		if currentRevision != appliedRevision {
			return ErrVersionConflict
		}
		if len(beforeRaw) == 0 {
			_, err := tx.ExecContext(ctx, `DELETE FROM platform_feature_flags WHERE flag_key = $1 AND revision = $2`, targetKey, appliedRevision)
			return err
		}
		var beforeEnabled bool
		if err := json.Unmarshal(beforeRaw, &beforeEnabled); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
UPDATE platform_feature_flags
SET enabled = $2, revision = revision + 1, updated_at = NOW()
WHERE flag_key = $1 AND revision = $3`, targetKey, beforeEnabled, appliedRevision)
		return err
	default:
		return ErrValidation
	}
}

func insertAudit(
	ctx context.Context,
	tx *sql.Tx,
	changeSetID, action, actorID string,
	actorRoles []string,
	status, reason, correlationID string,
	before, after any,
) error {
	beforeRaw, err := marshalNullable(before)
	if err != nil {
		return err
	}
	afterRaw, err := marshalNullable(after)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO platform_audit_events
    (change_set_id, action, actor_id, actor_roles, status, reason,
     before_state_json, after_state_json, correlation_id)
VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
		changeSetID,
		action,
		actorID,
		pq.Array(actorRoles),
		status,
		strings.TrimSpace(reason),
		beforeRaw,
		afterRaw,
		strings.TrimSpace(correlationID),
	)
	return err
}

func marshalNullable(value any) (any, error) {
	if value == nil {
		return nil, nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func validateCreateInput(input CreateChangeSetInput) error {
	if strings.TrimSpace(input.Title) == "" ||
		strings.TrimSpace(input.Reason) == "" ||
		strings.TrimSpace(input.ImpactAssessment) == "" ||
		strings.TrimSpace(input.RollbackPlan) == "" ||
		len(input.Items) == 0 {
		return ErrValidation
	}
	seen := map[string]struct{}{}
	for _, item := range input.Items {
		if item.TargetType != ChangeTargetVariable && item.TargetType != ChangeTargetFeatureFlag {
			return ErrValidation
		}
		if strings.TrimSpace(item.TargetKey) == "" || strings.TrimSpace(item.OwnerService) == "" || len(item.ProposedValue) == 0 || !json.Valid(item.ProposedValue) {
			return ErrValidation
		}
		key := fmt.Sprintf("%s|%s|%s|%s", item.TargetType, item.TargetKey, item.ScopeType, item.ScopeID)
		if _, exists := seen[key]; exists {
			return ErrValidation
		}
		seen[key] = struct{}{}
	}
	return nil
}

func roleContains(roles []string, candidates ...string) bool {
	allowed := make(map[string]struct{}, len(candidates))
	for _, candidate := range candidates {
		allowed[candidate] = struct{}{}
	}
	for _, role := range roles {
		if _, ok := allowed[role]; ok {
			return true
		}
	}
	return false
}

func nowUTC() time.Time {
	return time.Now().UTC()
}
