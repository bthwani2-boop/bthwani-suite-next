package platformpolicies

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// The operational-zone binding invariants live at the persistence owner: every
// zone references a governed service area and at most one zone may bind a
// service area. These proofs fail if either constraint regresses.
func TestZoneServiceAreaBindingInvariants(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for the PostgreSQL operational-zone proof")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer func() { _ = db.Close() }()
	if err := db.Ping(); err != nil {
		t.Fatalf("ping database: %v", err)
	}

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	serviceAreaCode := "area-zone-binding-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_service_area_geofences (service_area_code, display_name, polygon, active)
		VALUES ($1, 'Binding Proof Area', ST_GeomFromText('POLYGON((44.18 15.33,44.20 15.33,44.20 15.35,44.18 15.35,44.18 15.33))', 4326), TRUE)
		ON CONFLICT (service_area_code) DO NOTHING`, serviceAreaCode); err != nil {
		t.Fatalf("seed service-area geofence: %v", err)
	}

	var zoneID string
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_platform_zones (name, service_area_code, description)
		VALUES ($1, $2, 'binding invariant proof')
		RETURNING id::text`, "Binding Proof "+suffix, serviceAreaCode).Scan(&zoneID)
	if err != nil {
		t.Fatalf("insert governed zone: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_platform_delivery_mode_policies WHERE zone_id::text = $1`, zoneID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_capacity_configs WHERE zone_id::text = $1`, zoneID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_sla_rules WHERE zone_id::text = $1`, zoneID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_policy_events WHERE aggregate_id = $1`, zoneID)
		_, _ = db.Exec(`DELETE FROM dsh_platform_zones WHERE id::text = $1`, zoneID)
		_, _ = db.Exec(`DELETE FROM dsh_service_area_geofences WHERE service_area_code = $1`, serviceAreaCode)
	})

	var duplicateRejected bool
	var duplicateErr error
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_platform_zones (name, service_area_code, description)
		VALUES ($1, $2, 'duplicate binding must be rejected')
		RETURNING id::text`, "Duplicate Binding "+suffix, serviceAreaCode).Scan(new(string))
	if err != nil {
		duplicateRejected = true
		duplicateErr = err
	} else {
		var duplicateID string
		_ = db.QueryRowContext(ctx,
			`SELECT id::text FROM dsh_platform_zones WHERE lower(service_area_code) = lower($1) AND id::text <> $2 LIMIT 1`,
			serviceAreaCode, zoneID).Scan(&duplicateID)
		if duplicateID != "" {
			_, _ = db.Exec(`DELETE FROM dsh_platform_policy_events WHERE aggregate_id = $1`, duplicateID)
			_, _ = db.Exec(`DELETE FROM dsh_platform_zones WHERE id::text = $1`, duplicateID)
		}
	}
	if !duplicateRejected {
		t.Fatal("a second operational zone for one service area must be rejected by persistence")
	}
	if duplicateErr != nil && !strings.Contains(duplicateErr.Error(), "uq_dsh_platform_zones_service_area") {
		t.Fatalf("duplicate binding must fail through the canonical unique constraint: %v", duplicateErr)
	}

	var orphanRejected bool
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_platform_zones (name, service_area_code, description)
		VALUES ($1, $2, 'ungoverned service area must be rejected')
		RETURNING id::text`, "Orphan Binding "+suffix, "no-such-area-"+suffix).Scan(new(string))
	if err != nil {
		orphanRejected = true
	}
	if !orphanRejected {
		t.Fatal("a zone bound to an ungoverned service area must be rejected by the foreign key")
	}
}
