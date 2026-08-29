package fieldreadiness

import (
	"context"
	"errors"
	"testing"

	"dsh-api/internal/store"
)

func TestOperatorRoleCannotBypassFieldVisitOwnership(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	storeID := uniqueID("store-operator-no-bypass")
	fieldID := uniqueID("field-owner")
	operatorID := uniqueID("operator-reader")
	seedFieldStore(t, db, storeID, fieldID)

	visit, err := createTestVisit(t, ctx, db, testFieldActor(t, fieldID), CreateVisitInput{
		StoreID:       storeID,
		FieldAgentID:  fieldID,
		StartLocation: testValidLocation(),
	})
	if err != nil {
		t.Fatalf("create visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_actor_scopes(actor_id, actor_role, operator_context_id, store_id, scope_type, active)
		VALUES($1, 'operator', $2, $3, 'assigned', true)
		ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE SET active=true`,
		operatorID, requiredTestOperatorContextID(t), storeID,
	); err != nil {
		t.Fatalf("seed operator scope: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_actor_scopes WHERE actor_id=$1 AND store_id=$2`, operatorID, storeID)
	})

	operator := store.StoreActor{
		ID:                operatorID,
		Role:              "operator",
		OperatorContextID: requiredTestOperatorContextID(t),
	}
	if _, err := GetOwnedVisit(ctx, db, operator, visit.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected role-only operator access to fail closed, got %v", err)
	}
}
