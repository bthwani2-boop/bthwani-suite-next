package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestEvaluateOperationalPolicyForStoreFailsClosedOnAmbiguousZoneBinding(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for the PostgreSQL operational-zone proof")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		t.Fatalf("ping database: %v", err)
	}

	ctx := context.Background()
	operatorContextID := "local-dsh"
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	storeID := "store-zone-ambiguity-" + suffix
	serviceAreaCode := "area-zone-ambiguity-" + suffix
	zoneNameA := "Ambiguous A " + suffix
	zoneNameB := "Ambiguous B " + suffix

	_, err = db.ExecContext(ctx, `
		INSERT INTO dsh_stores (
			id, operator_context_id, slug, display_name, status, city_code, service_area_code,
			serviceability_status, is_visible, partner_readiness,
			catalog_approval_status, marketing_visibility
		)
		VALUES (
			$1, $4, $1, $2, 'published', 'test-city', $3, 'serviceable', TRUE,
			'ready', 'approved', 'visible'
		)`, storeID, "Ambiguous Zone Store", serviceAreaCode, operatorContextID)
	if err != nil {
		t.Fatalf("insert store: %v", err)
	}

	var zoneIDA, zoneIDB string
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_platform_zones (name, city_code, description)
		VALUES ($1, $2, 'ambiguity proof A')
		RETURNING id::text`, zoneNameA, serviceAreaCode).Scan(&zoneIDA)
	if err != nil {
		t.Fatalf("insert first zone: %v", err)
	}
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_platform_zones (name, city_code, description)
		VALUES ($1, $2, 'ambiguity proof B')
		RETURNING id::text`, zoneNameB, serviceAreaCode).Scan(&zoneIDB)
	if err != nil {
		t.Fatalf("insert second zone: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_platform_delivery_mode_policies WHERE zone_id::text IN ($1, $2)`, zoneIDA, zoneIDB)
		_, _ = db.Exec(`DELETE FROM dsh_platform_capacity_configs WHERE zone_id::text IN ($1, $2)`, zoneIDA, zoneIDB)
		_, _ = db.Exec(`DELETE FROM dsh_platform_sla_rules WHERE zone_id::text IN ($1, $2)`, zoneIDA, zoneIDB)
		_, _ = db.Exec(`DELETE FROM dsh_platform_policy_events WHERE aggregate_id IN ($1, $2)`, zoneIDA, zoneIDB)
		_, _ = db.Exec(`DELETE FROM dsh_platform_zones WHERE id::text IN ($1, $2)`, zoneIDA, zoneIDB)
		_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id = $1`, storeID)
	})

	_, err = EvaluateOperationalPolicyForStore(ctx, db, storeID, FulfillmentModeBthwaniDelivery)
	if err == nil {
		t.Fatal("ambiguous service-area binding must fail closed")
	}
	if errors.Is(err, ErrNotFound) || errors.Is(err, ErrInvalid) {
		t.Fatalf("ambiguous mapping must remain distinguishable from missing/invalid policy: %v", err)
	}
	if !strings.Contains(err.Error(), "ambiguous operational zone mapping") {
		t.Fatalf("unexpected ambiguity error: %v", err)
	}
}
