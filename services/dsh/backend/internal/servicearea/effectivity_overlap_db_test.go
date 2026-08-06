package servicearea

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/lib/pq"
)

func openServiceAreaDBIntegration(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for service-area database integration tests")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.PingContext(t.Context()); err != nil {
		db.Close()
		t.Skipf("DSH database unavailable: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func j026Polygon() [][]float64 {
	return [][]float64{
		{-170.0, -80.0},
		{-169.0, -80.0},
		{-169.0, -79.0},
		{-170.0, -79.0},
	}
}

func j026UpsertInput(actorID, key, displayName string, active bool, expectedVersion int) UpsertInput {
	return UpsertInput{
		DisplayName:     displayName,
		Polygon:         j026Polygon(),
		Active:          active,
		Priority:        100000,
		SRID:            serviceAreaSRID,
		OverlapPolicy:   serviceAreaOverlapPolicy,
		ExpectedVersion: expectedVersion,
		Reason:          "J026 governed service-area effectivity test",
		ActorID:         actorID,
		ActorSurface:    "control-panel",
		IdempotencyKey:  key,
		CorrelationID:   key,
	}
}

func TestServiceAreaResolutionUsesEffectiveHistoryAndDeterministicOverlapDBIntegration(t *testing.T) {
	db := openServiceAreaDBIntegration(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	alphaCode := "000-j026-alpha-" + suffix
	betaCode := "000-j026-beta-" + suffix
	actorID := "operator-j026-" + suffix

	alpha, err := Upsert(context.Background(), db, alphaCode, j026UpsertInput(actorID, "j026-alpha-create-"+suffix, "J026 Alpha", true, 0))
	if err != nil {
		t.Fatal(err)
	}
	beta, err := Upsert(context.Background(), db, betaCode, j026UpsertInput(actorID, "j026-beta-create-"+suffix, "J026 Beta", true, 0))
	if err != nil {
		t.Fatal(err)
	}
	if alpha.SRID != 4326 || alpha.OverlapPolicy != "priority_then_code" || beta.SRID != 4326 {
		t.Fatalf("unexpected governed geometry metadata: alpha=%+v beta=%+v", alpha, beta)
	}

	resolved, err := Resolve(context.Background(), db, -79.5, -169.5)
	if err != nil {
		t.Fatal(err)
	}
	if !resolved.Verified || resolved.ServiceAreaCode != alphaCode {
		t.Fatalf("equal-priority overlap resolved to %+v, want lexicographically first %s", resolved, alphaCode)
	}

	alphaDisabledInput := j026UpsertInput(actorID, "j026-alpha-disable-"+suffix, "J026 Alpha", false, alpha.Version)
	alphaDisabled, err := Upsert(context.Background(), db, alphaCode, alphaDisabledInput)
	if err != nil {
		t.Fatal(err)
	}
	if alphaDisabled.Version != alpha.Version+1 {
		t.Fatalf("alpha version=%d, want %d", alphaDisabled.Version, alpha.Version+1)
	}

	resolved, err = Resolve(context.Background(), db, -79.5, -169.5)
	if err != nil {
		t.Fatal(err)
	}
	if !resolved.Verified || resolved.ServiceAreaCode != betaCode {
		t.Fatalf("inactive latest alpha version did not fall through to beta: %+v", resolved)
	}

	var versionCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_service_area_versions WHERE service_area_code = $1`, alphaCode).Scan(&versionCount); err != nil {
		t.Fatal(err)
	}
	if versionCount != 2 {
		t.Fatalf("alpha history rows=%d, want 2", versionCount)
	}

	_, err = db.Exec(`UPDATE dsh_service_area_versions SET display_name = 'tampered' WHERE service_area_code = $1 AND version = 1`, alphaCode)
	var pqErr *pq.Error
	if !errors.As(err, &pqErr) || string(pqErr.Code) != "55000" {
		t.Fatalf("history mutation error=%v, want immutable-object violation", err)
	}

	_, err = db.Exec(`UPDATE dsh_service_area_geofences SET effective_from = now() - interval '1 day' WHERE service_area_code = $1`, betaCode)
	pqErr = nil
	if !errors.As(err, &pqErr) || string(pqErr.Code) != "23514" {
		t.Fatalf("retroactive effectivity error=%v, want check violation", err)
	}
}

func TestServiceAreaEffectivityValidationFailsBeforePersistence(t *testing.T) {
	base := j026UpsertInput("operator-j026-validation", "j026-validation-key", "Validation Area", true, 0)

	invalidSRID := base
	invalidSRID.SRID = 3857
	if _, err := Upsert(context.Background(), nil, "j026-invalid-srid", invalidSRID); !errors.Is(err, ErrInvalid) {
		t.Fatalf("invalid SRID error=%v, want ErrInvalid", err)
	}

	invalidPolicy := base
	invalidPolicy.OverlapPolicy = "largest_polygon"
	if _, err := Upsert(context.Background(), nil, "j026-invalid-policy", invalidPolicy); !errors.Is(err, ErrInvalid) {
		t.Fatalf("invalid overlap policy error=%v, want ErrInvalid", err)
	}

	retroactive := base
	retroactive.EffectiveFrom = time.Now().UTC().Add(-time.Hour)
	if _, err := Upsert(context.Background(), nil, "j026-retroactive", retroactive); !errors.Is(err, ErrInvalid) {
		t.Fatalf("retroactive effectivity error=%v, want ErrInvalid", err)
	}

	invalidRange := base
	invalidRange.EffectiveFrom = time.Now().UTC().Add(time.Hour)
	expiresAt := invalidRange.EffectiveFrom.Add(-time.Minute)
	invalidRange.ExpiresAt = &expiresAt
	if _, err := Upsert(context.Background(), nil, "j026-invalid-range", invalidRange); !errors.Is(err, ErrInvalid) {
		t.Fatalf("invalid effective range error=%v, want ErrInvalid", err)
	}
}
