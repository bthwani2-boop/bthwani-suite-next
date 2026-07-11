package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"dsh-api/internal/store"
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

// seedFieldStore creates a store and grants an active field-role scope to agentID.
func seedFieldStore(t *testing.T, db *sql.DB, storeID, agentID string) {
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
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_actor_scopes WHERE actor_id = $1 AND store_id = $2`, agentID, storeID)
	})
}

func seedFieldMediaRef(t *testing.T, db *sql.DB, partnerID, agentID string) string {
	t.Helper()
	ctx := context.Background()
	mediaRef := uniqueID("media")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_media_refs
			(media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id, purpose, content_type, original_filename)
		VALUES ($1, $2, $3, 'field', $4, 'field_readiness_evidence', 'image/jpeg', 'evidence.jpg')`,
		mediaRef, mediaRef+"-key", agentID, partnerID); err != nil {
		t.Fatalf("seed media ref: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef) })
	return mediaRef
}

func seedPartner(t *testing.T, db *sql.DB, agentID string) string {
	t.Helper()
	ctx := context.Background()
	partnerID := uniqueID("prt")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners
			(id, legal_name_ar, display_name, legal_identity_number, primary_phone, created_by_actor_id)
		VALUES ($1, 'شريك اختبار', 'شريك اختبار', $2, '777000000', $3)`,
		partnerID, partnerID, agentID); err != nil {
		t.Fatalf("seed partner: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, partnerID) })
	return partnerID
}

func uniqueID(prefix string) string {
	return prefix + "-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

func TestSameStoreAssignedAgentCannotAccessAnotherAgentsVisit(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()

	storeA := uniqueID("store-shared")
	agentA := uniqueID("agent-owner")
	agentB := uniqueID("agent-peer")
	seedFieldStore(t, db, storeA, agentA)
	seedFieldStore(t, db, storeA, agentB)

	actorA := store.StoreActor{ID: agentA, Role: "field"}
	actorB := store.StoreActor{ID: agentB, Role: "field"}

	visit, err := CreateVisit(ctx, db, actorA, CreateVisitInput{StoreID: storeA, FieldAgentID: agentA})
	if err != nil {
		t.Fatalf("create owner visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })

	if _, err := GetOwnedVisit(ctx, db, actorB, visit.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden reading same-store peer visit, got %v", err)
	}
	if _, err := ListVisitChecks(ctx, db, actorB, visit.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden listing same-store peer checks, got %v", err)
	}
	if _, err := UpsertReadinessCheck(ctx, db, actorB, visit.ID, UpdateCheckInput{CheckType: "location_verified", Status: CheckPassed}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden upserting same-store peer check, got %v", err)
	}
	if _, err := CompleteVisit(ctx, db, actorB, visit.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden completing same-store peer visit, got %v", err)
	}
	if _, err := CreateEscalation(ctx, db, actorB, CreateEscalationInput{
		VisitID: visit.ID, StoreID: storeA, RaisedBy: agentB, Severity: SeverityLow, Category: CategoryOther, Description: "peer escalation",
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden escalating same-store peer visit, got %v", err)
	}
}

func TestActorCannotAccessOtherStoreVisits(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()

	storeA := uniqueID("store-a")
	storeB := uniqueID("store-b")
	agentA := uniqueID("agent-a")
	agentB := uniqueID("agent-b")
	seedFieldStore(t, db, storeA, agentA)
	seedFieldStore(t, db, storeB, agentB)

	actorA := store.StoreActor{ID: agentA, Role: "field"}
	actorB := store.StoreActor{ID: agentB, Role: "field"}

	visit, err := CreateVisit(ctx, db, actorA, CreateVisitInput{StoreID: storeA, FieldAgentID: agentA})
	if err != nil {
		t.Fatalf("create visit for owner: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })

	if _, err := CreateVisit(ctx, db, actorB, CreateVisitInput{StoreID: storeA, FieldAgentID: agentB}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden creating visit on foreign store, got %v", err)
	}

	if _, err := ListStoreVisits(ctx, db, actorB, storeA, 10); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden listing visits on foreign store, got %v", err)
	}

	if _, err := GetOwnedVisit(ctx, db, actorB, visit.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden reading foreign-owned visit, got %v", err)
	}

	if _, err := CompleteVisit(ctx, db, actorB, visit.ID); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden completing foreign-owned visit, got %v", err)
	}

	if _, err := UpsertReadinessCheck(ctx, db, actorB, visit.ID, UpdateCheckInput{CheckType: "location_verified", Status: CheckPassed}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden upserting check on foreign-owned visit, got %v", err)
	}

	if _, err := CreateEscalation(ctx, db, actorB, CreateEscalationInput{
		VisitID: visit.ID, StoreID: storeA, RaisedBy: agentB, Severity: SeverityLow, Category: CategoryOther, Description: "x",
	}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden creating escalation on foreign store, got %v", err)
	}
}

func TestConcurrentInProgressVisitRejected(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()

	storeA := uniqueID("store-conc")
	agentA := uniqueID("agent-conc")
	seedFieldStore(t, db, storeA, agentA)
	actorA := store.StoreActor{ID: agentA, Role: "field"}

	visit, err := CreateVisit(ctx, db, actorA, CreateVisitInput{StoreID: storeA, FieldAgentID: agentA})
	if err != nil {
		t.Fatalf("create first visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })

	if _, err := CreateVisit(ctx, db, actorA, CreateVisitInput{StoreID: storeA, FieldAgentID: agentA}); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict for second in-progress visit on same store/agent, got %v", err)
	}
}

func TestCompleteVisitRequiresChecklistAndNoOpenEscalation(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()

	storeA := uniqueID("store-cv")
	agentA := uniqueID("agent-cv")
	partnerID := seedPartner(t, db, agentA)
	seedFieldStore(t, db, storeA, agentA)
	actorA := store.StoreActor{ID: agentA, Role: "field"}

	visit, err := CreateVisit(ctx, db, actorA, CreateVisitInput{StoreID: storeA, FieldAgentID: agentA})
	if err != nil {
		t.Fatalf("create visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })

	if _, err := CompleteVisit(ctx, db, actorA, visit.ID); !errors.Is(err, ErrChecklistIncomplete) {
		t.Fatalf("expected ErrChecklistIncomplete with no checks recorded, got %v", err)
	}

	for _, ct := range RequiredCheckTypes {
		mediaRef := seedFieldMediaRef(t, db, partnerID, agentA)
		if _, err := UpsertReadinessCheck(ctx, db, actorA, visit.ID, UpdateCheckInput{CheckType: ct, Status: CheckPassed, EvidenceURL: mediaRef}); err != nil {
			t.Fatalf("upsert check %s: %v", ct, err)
		}
	}

	esc, err := CreateEscalation(ctx, db, actorA, CreateEscalationInput{
		VisitID: visit.ID, StoreID: storeA, RaisedBy: agentA, Severity: SeverityHigh, Category: CategoryOther, Description: "blocking issue",
	})
	if err != nil {
		t.Fatalf("create escalation: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_readiness_escalations WHERE id = $1`, esc.ID) })

	if _, err := CompleteVisit(ctx, db, actorA, visit.ID); !errors.Is(err, ErrOpenEscalation) {
		t.Fatalf("expected ErrOpenEscalation with an open escalation, got %v", err)
	}

	if _, err := UpdateEscalation(ctx, db, esc.ID, UpdateEscalationInput{Status: EscalationResolved, ResolvedBy: agentA, ResolutionNote: "fixed"}); err != nil {
		t.Fatalf("resolve escalation: %v", err)
	}

	completed, err := CompleteVisit(ctx, db, actorA, visit.ID)
	if err != nil {
		t.Fatalf("expected completion to succeed once checklist passed and escalation resolved, got %v", err)
	}
	if completed.Status != VisitComplete {
		t.Fatalf("expected visit status complete, got %s", completed.Status)
	}

	if _, err := CompleteVisit(ctx, db, actorA, visit.ID); !errors.Is(err, ErrVisitAlreadyComplete) {
		t.Fatalf("expected ErrVisitAlreadyComplete on repeat completion, got %v", err)
	}

	if _, err := UpsertReadinessCheck(ctx, db, actorA, visit.ID, UpdateCheckInput{CheckType: "location_verified", Status: CheckFailed}); !errors.Is(err, ErrVisitAlreadyComplete) {
		t.Fatalf("expected ErrVisitAlreadyComplete when editing checks after completion, got %v", err)
	}
}

func TestCreateEscalationRejectsVisitStoreMismatch(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()

	storeA := uniqueID("store-mm-a")
	storeB := uniqueID("store-mm-b")
	agentA := uniqueID("agent-mm")
	seedFieldStore(t, db, storeA, agentA)
	seedFieldStore(t, db, storeB, agentA)
	actorA := store.StoreActor{ID: agentA, Role: "field"}

	visit, err := CreateVisit(ctx, db, actorA, CreateVisitInput{StoreID: storeA, FieldAgentID: agentA})
	if err != nil {
		t.Fatalf("create visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })

	if _, err := CreateEscalation(ctx, db, actorA, CreateEscalationInput{
		VisitID: visit.ID, StoreID: storeB, RaisedBy: agentA, Severity: SeverityLow, Category: CategoryOther, Description: "mismatch",
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for visit/store mismatch, got %v", err)
	}
}
