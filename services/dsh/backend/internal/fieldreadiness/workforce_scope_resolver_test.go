package fieldreadiness

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	"dsh-api/internal/workforceclient"
)

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
