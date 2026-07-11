package store

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func uniqueID(prefix string) string {
	return prefix + "-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

func seedGovernanceStore(t *testing.T, db *sql.DB, storeID, agentID string) {
	t.Helper()
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)
		ON CONFLICT (id) DO NOTHING`, storeID); err != nil {
		t.Fatalf("seed store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_actor_scopes (actor_id, actor_role, store_id, scope_type, active)
		VALUES ($1, 'field', $2, 'assigned', true)
		ON CONFLICT (actor_id, actor_role, store_id) DO NOTHING`, agentID, storeID); err != nil {
		t.Fatalf("seed scope: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_actor_scopes WHERE actor_id = $1 AND store_id = $2`, agentID, storeID) })
}

func seedFieldVisit(t *testing.T, db *sql.DB, storeID, agentID, status string) string {
	t.Helper()
	ctx := context.Background()
	var visitID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_field_visits (store_id, field_agent_id, status)
		VALUES ($1, $2, $3) RETURNING id`, storeID, agentID, status).Scan(&visitID); err != nil {
		t.Fatalf("seed visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visitID) })
	return visitID
}

func TestSubmitFieldVerificationRequiresVisitID(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	storeID := uniqueID("store-fv")
	agentID := uniqueID("agent-fv")
	seedGovernanceStore(t, db, storeID, agentID)
	actor := StoreActor{ID: agentID, Role: "field"}

	_, err := SubmitFieldVerification(ctx, db, actor, storeID, "idempotency-key-1", "correlation-id-1", FieldVerificationInput{
		ExpectedVersion: 1,
		Outcome:         "verified",
		EvidenceStatus:  "complete",
		Notes:           "note",
	})
	if err == nil {
		t.Fatal("expected error when visitId is missing")
	}
}

func TestSubmitFieldVerificationRejectsVisitStoreMismatch(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	storeA := uniqueID("store-fv-a")
	storeB := uniqueID("store-fv-b")
	agentID := uniqueID("agent-fv-mm")
	seedGovernanceStore(t, db, storeA, agentID)
	seedGovernanceStore(t, db, storeB, agentID)
	actor := StoreActor{ID: agentID, Role: "field"}

	visitID := seedFieldVisit(t, db, storeB, agentID, "complete")

	_, err := SubmitFieldVerification(ctx, db, actor, storeA, "idempotency-key-2", "correlation-id-2", FieldVerificationInput{
		ExpectedVersion: 1,
		VisitID:         visitID,
		Outcome:         "verified",
		EvidenceStatus:  "complete",
		Notes:           "note",
	})
	if err == nil {
		t.Fatal("expected error when visit belongs to a different store")
	}
}

func TestSubmitFieldVerificationRejectsVerifiedWithIncompleteVisit(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	storeID := uniqueID("store-fv-ic")
	agentID := uniqueID("agent-fv-ic")
	seedGovernanceStore(t, db, storeID, agentID)
	actor := StoreActor{ID: agentID, Role: "field"}

	visitID := seedFieldVisit(t, db, storeID, agentID, "in_progress")

	_, err := SubmitFieldVerification(ctx, db, actor, storeID, "idempotency-key-3", "correlation-id-3", FieldVerificationInput{
		ExpectedVersion: 1,
		VisitID:         visitID,
		Outcome:         "verified",
		EvidenceStatus:  "complete",
		Notes:           "note",
	})
	if err == nil {
		t.Fatal("expected error when outcome=verified but visit is not complete")
	}

	// needs_follow_up does not require a complete visit.
	resp, err := SubmitFieldVerification(ctx, db, actor, storeID, "idempotency-key-4", "correlation-id-4", FieldVerificationInput{
		ExpectedVersion: 1,
		VisitID:         visitID,
		Outcome:         "needs_follow_up",
		EvidenceStatus:  "partial",
		Notes:           "note",
	})
	if err != nil {
		t.Fatalf("expected needs_follow_up to succeed on an in-progress visit, got %v", err)
	}
	if resp.Replayed {
		t.Fatal("expected a fresh (non-replayed) response")
	}
}

func TestSubmitFieldVerificationRejectsVerifiedWithOpenEscalation(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	storeID := uniqueID("store-fv-esc")
	agentID := uniqueID("agent-fv-esc")
	seedGovernanceStore(t, db, storeID, agentID)
	actor := StoreActor{ID: agentID, Role: "field"}

	visitID := seedFieldVisit(t, db, storeID, agentID, "complete")

	var escID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_readiness_escalations (visit_id, store_id, raised_by, severity, category, description, status)
		VALUES ($1, $2, $3, 'high', 'other', 'blocking', 'open') RETURNING id`,
		visitID, storeID, agentID).Scan(&escID); err != nil {
		t.Fatalf("seed escalation: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_readiness_escalations WHERE id = $1`, escID) })

	_, err := SubmitFieldVerification(ctx, db, actor, storeID, "idempotency-key-5", "correlation-id-5", FieldVerificationInput{
		ExpectedVersion: 1,
		VisitID:         visitID,
		Outcome:         "verified",
		EvidenceStatus:  "complete",
		Notes:           "note",
	})
	if err == nil {
		t.Fatal("expected error when an open escalation is tied to the visit")
	}

	if _, err := db.ExecContext(ctx, `UPDATE dsh_readiness_escalations SET status = 'resolved' WHERE id = $1`, escID); err != nil {
		t.Fatalf("resolve escalation: %v", err)
	}

	if _, err := SubmitFieldVerification(ctx, db, actor, storeID, "idempotency-key-6", "correlation-id-6", FieldVerificationInput{
		ExpectedVersion: 1,
		VisitID:         visitID,
		Outcome:         "verified",
		EvidenceStatus:  "complete",
		Notes:           "note",
	}); err != nil {
		t.Fatalf("expected verification to succeed once escalation resolved, got %v", err)
	}
}

func TestResolveActorStoreForIDFallbackAndExplicit(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	storeA := uniqueID("store-ras-a")
	storeB := uniqueID("store-ras-b")
	agentID := uniqueID("agent-ras")
	seedGovernanceStore(t, db, storeA, agentID)
	seedGovernanceStore(t, db, storeB, agentID)
	actor := StoreActor{ID: agentID, Role: "field"}

	rowNoParam, _, err := ResolveActorStoreForID(ctx, db, actor, "")
	if err != nil {
		t.Fatalf("expected fallback resolution to succeed, got %v", err)
	}
	rowLegacy, _, err := ResolveActorStore(ctx, db, actor)
	if err != nil {
		t.Fatalf("legacy resolution failed: %v", err)
	}
	if rowNoParam.ID != rowLegacy.ID {
		t.Fatalf("expected empty-storeId fallback to match legacy first-scope behavior: got %s want %s", rowNoParam.ID, rowLegacy.ID)
	}

	rowExplicit, _, err := ResolveActorStoreForID(ctx, db, actor, storeB)
	if err != nil {
		t.Fatalf("expected explicit store resolution to succeed, got %v", err)
	}
	if rowExplicit.ID != storeB {
		t.Fatalf("expected explicit storeId to resolve to %s, got %s", storeB, rowExplicit.ID)
	}

	if _, _, err := ResolveActorStoreForID(ctx, db, actor, uniqueID("store-not-scoped")); !errors.Is(err, ErrScopedStoreNotFound) {
		t.Fatalf("expected ErrScopedStoreNotFound for an unscoped store, got %v", err)
	}
}
