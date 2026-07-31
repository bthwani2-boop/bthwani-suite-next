package fieldreadiness

import (
	"context"
	"database/sql"
	"testing"
)

// seedFieldStoreForPartner creates a store with the final governed partner
// binding from the outset. Tests that exercise immutable partner ownership must
// use this helper instead of creating a temporary partner and then attempting a
// forbidden reassignment.
func seedFieldStoreForPartner(t *testing.T, db *sql.DB, storeID, agentID, partnerID string) {
	t.Helper()
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores
			(id, slug, display_name, status, city_code, service_area_code,
			 serviceability_status, is_visible, partner_id)
		VALUES ($1, $1, 'Governed Field Test Store', 'active', 'SAN', 'SAN-1',
		        'serviceable', true, $2)`, storeID, partnerID); err != nil {
		t.Fatalf("seed governed partner store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id=$1`, storeID) })
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_actor_scopes(actor_id,actor_role,store_id,scope_type,active)
		VALUES($1,'field',$2,'assigned',true)
		ON CONFLICT(actor_id,actor_role,store_id) DO NOTHING`, agentID, storeID); err != nil {
		t.Fatalf("seed governed partner store scope: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_actor_scopes WHERE actor_id=$1 AND store_id=$2`, agentID, storeID)
	})
}
