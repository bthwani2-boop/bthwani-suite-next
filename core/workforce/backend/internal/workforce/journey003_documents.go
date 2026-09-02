package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
)

// AppendProviderDocument atomically links an already-uploaded DSH mediaRef to
// the sovereign Workforce profile. The media object remains owned by DSH;
// Workforce stores only its opaque reference. Optimistic locking prevents a
// document upload from silently overwriting concurrent HR edits.
func (r *Repository) AppendProviderDocument(
	ctx context.Context,
	operatorActorID string,
	operatorRole string,
	actorID string,
	kind string,
	mediaRef string,
	expectedVersion int,
	correlationID string,
) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	actorID = strings.TrimSpace(actorID)
	kind = strings.TrimSpace(kind)
	mediaRef = strings.TrimSpace(mediaRef)
	if actorID == "" || mediaRef == "" || expectedVersion < 1 {
		return Person{}, ErrInvalidInput
	}

	table := ""
	switch kind {
	case "field":
		table = "workforce_field_profiles"
	case "captain":
		table = "workforce_captain_profiles"
	case "employee":
		table = "workforce_employee_profiles"
	default:
		return Person{}, ErrInvalidInput
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Person{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var currentVersion int
	var currentKind string
	if err := tx.QueryRowContext(ctx, `
		SELECT version, workforce_kind
		FROM workforce_people
		WHERE operator_context_id = $2 AND actor_id = $1
		FOR UPDATE`, actorID, operatorContextID).Scan(&currentVersion, &currentKind); errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	} else if err != nil {
		return Person{}, err
	}
	if currentVersion != expectedVersion {
		return Person{}, ErrVersionConflict
	}
	if currentKind != kind {
		return Person{}, ErrWorkforceKindConflict
	}

	query := `UPDATE ` + table + `
		SET document_media_refs = CASE
			WHEN document_media_refs ? $2 THEN document_media_refs
			ELSE document_media_refs || jsonb_build_array($2::text)
		END,
		updated_at = now()
		WHERE operator_context_id = $3 AND actor_id = $1`
	result, err := tx.ExecContext(ctx, query, actorID, mediaRef, operatorContextID)
	if err != nil {
		return Person{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return Person{}, ErrNotFound
	}

	result, err = tx.ExecContext(ctx, `
		UPDATE workforce_people
		SET version = version + 1, updated_at = now()
		WHERE operator_context_id = $3 AND actor_id = $1 AND version = $2`, actorID, expectedVersion, operatorContextID)
	if err != nil {
		return Person{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return Person{}, ErrVersionConflict
	}

	toState, _ := json.Marshal(map[string]string{"mediaRef": mediaRef, "kind": kind})
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO workforce_action_audit
			(operator_context_id, actor_id, actor_role, target_actor_id, action, to_state, correlation_id)
		VALUES ($6, $1, $2, $3, 'provider.document_linked', $4::jsonb, NULLIF($5, ''))`,
		operatorActorID, operatorRole, actorID, string(toState), correlationID, operatorContextID); err != nil {
		return Person{}, err
	}

	if err := tx.Commit(); err != nil {
		return Person{}, err
	}
	return r.PersonByActorID(ctx, actorID)
}
