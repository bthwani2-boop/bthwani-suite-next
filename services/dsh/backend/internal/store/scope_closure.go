package store

import (
	"context"
	"database/sql"
	"strings"
)

// EnsurePartnerOwnerScopeTx grants the owning partner actor canonical access to
// a store. It is intentionally idempotent so unknown-result retries can safely
// close the authorization boundary again.
func EnsurePartnerOwnerScopeTx(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	storeID string,
	ownerActorID string,
) error {
	operatorContextID = strings.TrimSpace(operatorContextID)
	storeID = strings.TrimSpace(storeID)
	ownerActorID = strings.TrimSpace(ownerActorID)
	if operatorContextID == "" || storeID == "" || ownerActorID == "" {
		return nil
	}

	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_actor_scopes
			(operator_context_id, actor_id, actor_role, store_id, scope_type, active)
		VALUES ($1, $2, 'partner', $3, 'own', true)
		ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE
		SET operator_context_id = EXCLUDED.operator_context_id,
		    scope_type = 'own',
		    active = true`,
		operatorContextID, ownerActorID, storeID,
	)
	return err
}

// EnsureFieldStoreAccessScopeTx grants the field actor's DSH store-access
// authorization for the onboarding draft. This is an authorization scope,
// not a Workforce operational assignment.
func EnsureFieldStoreAccessScopeTx(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	storeID string,
	fieldActorID string,
) error {
	operatorContextID = strings.TrimSpace(operatorContextID)
	storeID = strings.TrimSpace(storeID)
	fieldActorID = strings.TrimSpace(fieldActorID)
	if operatorContextID == "" || storeID == "" || fieldActorID == "" {
		return nil
	}

	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_actor_scopes
			(operator_context_id, actor_id, actor_role, store_id, scope_type, active)
		VALUES ($1, $2, 'field', $3, 'assigned', true)
		ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE
		SET operator_context_id = EXCLUDED.operator_context_id,
		    scope_type = 'assigned',
		    active = true`,
		operatorContextID, fieldActorID, storeID,
	)
	return err
}

// RebindStoreOperationalScopesTx revokes operational access inherited from a
// previous owner before granting the new owner. Operator access is permission-
// scoped and therefore is not stored in this table.
func RebindStoreOperationalScopesTx(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	storeID string,
	newOwnerActorID string,
) error {
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_store_actor_scopes
		SET active = false
		WHERE store_id = $1
		  AND actor_role IN ('partner', 'field', 'captain')`,
		storeID,
	); err != nil {
		return err
	}
	return EnsurePartnerOwnerScopeTx(ctx, tx, operatorContextID, storeID, newOwnerActorID)
}
