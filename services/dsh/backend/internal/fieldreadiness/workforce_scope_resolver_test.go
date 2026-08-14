package fieldreadiness

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"

	"dsh-api/internal/workforceclient"
)

func policyCheckTypes(t *testing.T, db *sql.DB, visitID string) []string {
	t.Helper()
	rows, err := db.Query(`
		SELECT check_type
		FROM dsh_visit_checklist_requirements
		WHERE visit_id = $1 AND required = TRUE
		ORDER BY display_order`, visitID)
	if err != nil {
		t.Fatalf("list visit checklist policy: %v", err)
	}
	defer rows.Close()
	var result []string
	for rows.Next() {
		var checkType string
		if err := rows.Scan(&checkType); err != nil {
			t.Fatalf("scan visit checklist policy: %v", err)
		}
		result = append(result, checkType)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate visit checklist policy: %v", err)
	}
	if len(result) == 0 {
		t.Fatal("visit checklist policy is empty")
	}
	return result
}

// databaseFixtureWorkforceScopeResolver adapts the existing DB integration
// fixtures into the canonical Workforce boundary. It is compiled only into the
// field-readiness test binary; runtime code still fails closed when no
// Workforce resolver is injected.
type databaseFixtureWorkforceScopeResolver struct{}

func (databaseFixtureWorkforceScopeResolver) GetActorScopes(ctx context.Context, actorID, operatorContextID, role string) (*workforceclient.ActorScopes, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is required for field-readiness DB fixtures")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, `
		SELECT store_id
		FROM dsh_store_actor_scopes
		WHERE actor_id = $1
		  AND actor_role = $2
		  AND operator_context_id = $3
		  AND active = true
		ORDER BY created_at ASC`, actorID, role, operatorContextID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	storeIDs := []string{}
	for rows.Next() {
		var storeID string
		if err := rows.Scan(&storeID); err != nil {
			return nil, err
		}
		storeIDs = append(storeIDs, storeID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &workforceclient.ActorScopes{
		ActorID:           actorID,
		Role:              role,
		OperatorContextID: operatorContextID,
		StoreIDs:          storeIDs,
	}, nil
}

func init() {
	workforceScopeResolverOverride = databaseFixtureWorkforceScopeResolver{}
}
