package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

var (
	ErrOverlappingAssignment = errors.New("overlapping active assignment exists for this scope")
)

func (r *Repository) SetOperationalScopes(ctx context.Context, actorID, operatorContextID, role string, inputs []OperationalAssignmentInput, changedBy string) (*ActorScopes, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Deactivate existing assignments
	if _, err := tx.ExecContext(ctx, `
		UPDATE workforce_operational_assignments
		SET active = false, ends_on = NOW()
		WHERE actor_id = $1 AND operator_context_id = $2 AND role = $3 AND active = true`, actorID, operatorContextID, role); err != nil {
		return nil, err
	}

	for _, input := range inputs {
		// Overlap validation (though we deactivated all, we enforce it structurally)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO workforce_operational_assignments 
			(actor_id, operator_context_id, role, scope_type, scope_target_id, starts_on, ends_on, active, assigned_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
			actorID, operatorContextID, role, input.ScopeType, input.ScopeTargetID, input.StartsOn, input.EndsOn, changedBy); err != nil {
			return nil, err
		}
	}

	var storeIDs []string
	var areaCodes []string
	for _, input := range inputs {
		if input.ScopeType == "store" {
			storeIDs = append(storeIDs, input.ScopeTargetID)
		} else if input.ScopeType == "area" {
			areaCodes = append(areaCodes, input.ScopeTargetID)
		}
	}

	storeJSON, _ := json.Marshal(storeIDs)
	areaJSON, _ := json.Marshal(areaCodes)

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO workforce_operational_assignment_audit 
		(actor_id, role, changed_by, store_ids, service_areas)
		VALUES ($1, $2, $3, $4, $5)`,
		actorID, role, changedBy, storeJSON, areaJSON); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetOperationalScopes(ctx, actorID, operatorContextID, role)
}

func (r *Repository) GetOperationalScopes(ctx context.Context, actorID, operatorContextID, role string) (*ActorScopes, error) {
	scopes := &ActorScopes{
		ActorID:           actorID,
		Role:              role,
		OperatorContextID: operatorContextID,
		StoreIDs:          []string{},
		ServiceAreaCodes:  []string{},
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT scope_type, scope_target_id
		FROM workforce_operational_assignments
		WHERE actor_id = $1 AND operator_context_id = $2 AND role = $3 AND active = true`, actorID, operatorContextID, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var scopeType, targetID string
		if err := rows.Scan(&scopeType, &targetID); err != nil {
			return nil, err
		}
		if scopeType == "store" {
			scopes.StoreIDs = append(scopes.StoreIDs, targetID)
		} else if scopeType == "area" {
			scopes.ServiceAreaCodes = append(scopes.ServiceAreaCodes, targetID)
		}
	}
	return scopes, rows.Err()
}
