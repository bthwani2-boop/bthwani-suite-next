package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/lib/pq"
)

var (
	ErrProvisionConflict = errors.New("actor provisioning conflict")
	ErrInvalidActorQuery = errors.New("invalid actor query")
)

var canonicalUsernamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,63}$`)

func NormalizeUsername(raw string) (string, error) {
	username := strings.ToLower(strings.TrimSpace(raw))
	if !canonicalUsernamePattern.MatchString(username) {
		return "", ErrInvalidActivation
	}
	return username, nil
}

// ProvisionActorGoverned is the sole live Workforce provisioning path. Phone,
// canonical username, role and operator context form the idempotency fingerprint;
// retries with a different fingerprint fail explicitly.
func (r *Repository) ProvisionActorGoverned(ctx context.Context, input ProvisionActorInput) (ActorAdminView, error) {
	role := strings.ToLower(strings.TrimSpace(input.Role))
	surface, ok := workforceActivationSurfaceFor(role)
	if !ok {
		return ActorAdminView{}, ErrInvalidActivation
	}
	username, err := NormalizeUsername(input.Username)
	if err != nil {
		return ActorAdminView{}, err
	}
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if operatorContextID == "" {
		return ActorAdminView{}, ErrInvalidActivation
	}
	phone, err := NormalizePhoneE164(input.PhoneE164)
	if err != nil {
		return ActorAdminView{}, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ActorAdminView{}, err
	}
	defer tx.Rollback()

	for _, key := range []string{"identity:phone:" + phone, "identity:username:" + username} {
		if _, err = tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, key); err != nil {
			return ActorAdminView{}, err
		}
	}

	existing, err := actorByPhoneAnyRoleTx(ctx, tx, phone)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return ActorAdminView{}, err
	}
	if err == nil {
		if strings.TrimSpace(existing.OperatorContextID) != operatorContextID {
			return ActorAdminView{}, ErrForbidden
		}
		if strings.ToLower(strings.TrimSpace(existing.Username)) != username {
			return ActorAdminView{}, ErrProvisionConflict
		}
		if hasRole(existing.Roles, role) {
			if err := tx.Commit(); err != nil {
				return ActorAdminView{}, err
			}
			return r.ActorAdminByIDGoverned(ctx, operatorContextID, existing.ID)
		}
		permissionsJSON, err := providerPermissions(surface)
		if err != nil {
			return ActorAdminView{}, err
		}
		_, err = tx.ExecContext(ctx, `
			UPDATE identity_actors
			SET roles = array_append(roles, $2),
			    permissions = permissions || $3::jsonb,
			    updated_at = now()
			WHERE id = $1 AND NOT ($2 = ANY(roles))`,
			existing.ID, role, string(permissionsJSON))
		if err != nil {
			return ActorAdminView{}, err
		}
		if err := tx.Commit(); err != nil {
			return ActorAdminView{}, err
		}
		return r.ActorAdminByIDGoverned(ctx, operatorContextID, existing.ID)
	}

	if _, err = actorByUsernameForUpdateTx(ctx, tx, username); err == nil {
		return ActorAdminView{}, ErrUsernameTaken
	} else if !errors.Is(err, sql.ErrNoRows) {
		return ActorAdminView{}, err
	}

	suffix, err := randomToken(9)
	if err != nil {
		return ActorAdminView{}, err
	}
	actorID := role + "-" + suffix
	permissions, err := providerPermissions(surface)
	if err != nil {
		return ActorAdminView{}, err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actors
			(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, active, updated_at)
		VALUES ($1, $2, '', $3, $4, $5, $6::jsonb, false, now())`,
		actorID, username, operatorContextID, phone, pq.Array([]string{role}), string(permissions))
	if err != nil {
		return ActorAdminView{}, mapUniqueViolation(err)
	}
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return ActorAdminView{
		ActorID: actorID, Username: username, PhoneE164: phone,
		Roles: []string{role}, Active: false, Status: ActorStatusProvisioned,
	}, nil
}

// SearchActorsGoverned is the canonical live internal search/readback path.
func (r *Repository) SearchActorsGoverned(ctx context.Context, input ActorSearchInput) (ActorSearchPage, error) {
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if operatorContextID == "" || input.Offset < 0 {
		return ActorSearchPage{}, ErrInvalidActorQuery
	}
	limit := input.Limit
	if limit <= 0 {
		limit = 25
	}
	if limit > 100 {
		return ActorSearchPage{}, ErrInvalidActorQuery
	}
	role := strings.ToLower(strings.TrimSpace(input.Role))
	queryText := strings.TrimSpace(input.Query)
	if len(queryText) > 100 {
		return ActorSearchPage{}, ErrInvalidActorQuery
	}
	status := ActorLifecycleStatus(strings.ToUpper(strings.TrimSpace(string(input.Status))))
	if status != "" && status != ActorStatusProvisioned && status != ActorStatusPendingActivation && status != ActorStatusActive && status != ActorStatusInactive {
		return ActorSearchPage{}, ErrInvalidActorQuery
	}

	clauses := []string{"operator_context_id = $1"}
	args := []any{operatorContextID}
	if role != "" {
		args = append(args, role)
		clauses = append(clauses, fmt.Sprintf("$%d = ANY(roles)", len(args)))
	}
	if queryText != "" {
		if normalizedPhone, err := NormalizePhoneE164(queryText); err == nil {
			queryText = normalizedPhone
		}
		args = append(args, queryText)
		clauses = append(clauses, fmt.Sprintf("(position(lower($%d) in lower(username)) > 0 OR position($%d in COALESCE(phone_e164, '')) > 0)", len(args), len(args)))
	}

	statusExpression := `CASE
		WHEN active THEN 'ACTIVE'
		WHEN EXISTS (
			SELECT 1 FROM identity_activation_challenges c
			WHERE c.actor_id = identity_actors.id
			  AND c.status = 'pending'
			  AND c.expires_at > clock_timestamp()
		) THEN 'PENDING_ACTIVATION'
		WHEN password_hash = '' THEN 'PROVISIONED'
		ELSE 'INACTIVE'
	END`
	args = append(args, string(status))
	statusIndex := len(args)
	args = append(args, limit, input.Offset)
	limitIndex := len(args) - 1
	offsetIndex := len(args)
	query := `
		WITH actor_projection AS (
			SELECT id, username, COALESCE(phone_e164, '') AS phone_e164,
			       roles, active, ` + statusExpression + ` AS lifecycle_status
			FROM identity_actors
			WHERE ` + strings.Join(clauses, " AND ") + `
		)
		SELECT id, username, phone_e164, roles, active, lifecycle_status, COUNT(*) OVER()
		FROM actor_projection
		WHERE $` + strconv.Itoa(statusIndex) + ` = '' OR lifecycle_status = $` + strconv.Itoa(statusIndex) + `
		ORDER BY lower(username), id
		LIMIT $` + strconv.Itoa(limitIndex) + ` OFFSET $` + strconv.Itoa(offsetIndex)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return ActorSearchPage{}, err
	}
	defer rows.Close()
	page := ActorSearchPage{Items: []ActorAdminView{}, Limit: limit, Offset: input.Offset}
	for rows.Next() {
		var view ActorAdminView
		var roles pq.StringArray
		if err := rows.Scan(&view.ActorID, &view.Username, &view.PhoneE164, &roles, &view.Active, &view.Status, &page.Total); err != nil {
			return ActorSearchPage{}, err
		}
		view.Roles = []string(roles)
		page.Items = append(page.Items, view)
	}
	if err := rows.Err(); err != nil {
		return ActorSearchPage{}, err
	}

	return page, nil
}

// DeleteProvisionedActor safely performs a hard delete of an actor if and only if
// it is in the 'PROVISIONED' state and has never logged in. This supports saga
// compensation during failed HR/Platform provisioning processes.
func (r *Repository) DeleteProvisionedActor(ctx context.Context, actorID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Ensure the actor is purely provisioned and has no password (never activated/claimed).
	// We check status by inferring from 'active' and 'password_hash'. 
	// Our model maps PROVISIONED when password_hash = '' and active = false.
	var active bool
	var passHash string
	err = tx.QueryRowContext(ctx, `SELECT active, password_hash FROM actors WHERE id = $1 FOR UPDATE`, actorID).Scan(&active, &passHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil // Already deleted or doesn't exist, idempotent success
		}
		return err
	}

	if active || passHash != "" {
		return errors.New("cannot delete an actor that has been activated or claimed")
	}

	// Delete roles first, then the actor. 
	// (Depending on FK constraints ON DELETE CASCADE, deleting actor might be enough, but we do both to be safe).
	_, err = tx.ExecContext(ctx, `DELETE FROM actor_roles WHERE actor_id = $1`, actorID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `DELETE FROM actors WHERE id = $1`, actorID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) ActorAdminByIDGoverned(ctx context.Context, operatorContextID, actorID string) (ActorAdminView, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	if operatorContextID == "" || actorID == "" {
		return ActorAdminView{}, ErrInvalidActorQuery
	}
	var view ActorAdminView
	var roles pq.StringArray
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, COALESCE(phone_e164, ''), roles, active,
		       CASE
		         WHEN active THEN 'ACTIVE'
		         WHEN EXISTS (
		           SELECT 1 FROM identity_activation_challenges c
		           WHERE c.actor_id = identity_actors.id
		             AND c.status = 'pending'
		             AND c.expires_at > clock_timestamp()
		         ) THEN 'PENDING_ACTIVATION'
		         WHEN password_hash = '' THEN 'PROVISIONED'
		         ELSE 'INACTIVE'
		       END
		FROM identity_actors
		WHERE id = $1 AND operator_context_id = $2`, actorID, operatorContextID).Scan(
		&view.ActorID, &view.Username, &view.PhoneE164, &roles, &view.Active, &view.Status,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ActorAdminView{}, ErrActorNotFound
		}
		return ActorAdminView{}, err
	}
	view.Roles = []string(roles)
	return view, nil
}

func actorByUsernameForUpdateTx(ctx context.Context, tx *sql.Tx, username string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := tx.QueryRowContext(ctx, `
		SELECT id, username, operator_context_id, COALESCE(phone_e164, ''), roles, permissions, active
		FROM identity_actors
		WHERE lower(btrim(username)) = $1
		LIMIT 1
		FOR UPDATE`, username).Scan(
		&actor.ID, &actor.Username, &actor.OperatorContextID, &actor.PhoneE164, &roles, &permissionsJSON, &actor.Active,
	)
	if err != nil {
		return Actor{}, err
	}
	actor.Roles = []string(roles)
	if err := json.Unmarshal(permissionsJSON, &actor.Permissions); err != nil {
		return Actor{}, err
	}
	return actor, nil
}
