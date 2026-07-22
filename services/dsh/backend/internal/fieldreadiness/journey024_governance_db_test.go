package fieldreadiness

import (
	"context"
	"errors"
	"testing"

	"dsh-api/internal/store"
)

func registerGovernedStoreLocation(t *testing.T, db interface {
	ExecContext(context.Context, string, ...any) (sqlResult, error)
}, storeID, partnerID string) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(), `
		UPDATE dsh_stores
		SET partner_id = $2, latitude = 15.3694, longitude = 44.1910
		WHERE id = $1`, storeID, partnerID); err != nil {
		t.Fatalf("register governed store location: %v", err)
	}
}

type sqlResult interface {
	LastInsertId() (int64, error)
	RowsAffected() (int64, error)
}

func seedStoreBoundReadinessMedia(t *testing.T, db interface {
	ExecContext(context.Context, string, ...any) (sqlResult, error)
}, partnerID, storeID, agentID string) string {
	t.Helper()
	mediaRef := uniqueID("media-jrn024")
	if _, err := db.ExecContext(context.Background(), `
		INSERT INTO dsh_media_refs
			(media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id, store_id, purpose, content_type, original_filename)
		VALUES ($1, $2, $3, 'field', $4, $5, 'field_readiness_evidence', 'image/jpeg', 'readiness.jpg')`,
		mediaRef, mediaRef+"-key", agentID, partnerID, storeID); err != nil {
		t.Fatalf("seed store-bound readiness media: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef)
	})
	return mediaRef
}

func TestCreateGovernedVisitUsesRegisteredStoreCoordinates(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	agentID := uniqueID("agent-governed-location")
	partnerID := seedPartner(t, db, agentID)
	storeID := uniqueID("store-governed-location")
	seedFieldStore(t, db, storeID, agentID)
	registerGovernedStoreLocation(t, db, storeID, partnerID)
	actor := store.StoreActor{ID: agentID, Role: "field"}

	maliciousLatitude := -33.0
	maliciousLongitude := 151.0
	visit, err := CreateGovernedVisit(ctx, db, actor, CreateVisitInput{
		StoreID:        storeID,
		FieldAgentID:   agentID,
		VisitType:      VisitTypeOnboarding,
		StartLocation:  testValidLocation(),
		StoreLatitude:  &maliciousLatitude,
		StoreLongitude: &maliciousLongitude,
	})
	if err != nil {
		t.Fatalf("create governed visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })
	if visit.StoreLatitude == nil || visit.StoreLongitude == nil {
		t.Fatal("expected persisted server-owned store coordinates")
	}
	if *visit.StoreLatitude != 15.3694 || *visit.StoreLongitude != 44.1910 {
		t.Fatalf("expected registered store coordinates, got %v,%v", *visit.StoreLatitude, *visit.StoreLongitude)
	}
}

func TestGovernedCheckRejectsEvidenceFromAnotherStore(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	agentID := uniqueID("agent-store-evidence")
	partnerID := seedPartner(t, db, agentID)
	storeA := uniqueID("store-evidence-a")
	storeB := uniqueID("store-evidence-b")
	seedFieldStore(t, db, storeA, agentID)
	seedFieldStore(t, db, storeB, agentID)
	registerGovernedStoreLocation(t, db, storeA, partnerID)
	registerGovernedStoreLocation(t, db, storeB, partnerID)
	actor := store.StoreActor{ID: agentID, Role: "field"}

	visit, err := CreateGovernedVisit(ctx, db, actor, CreateVisitInput{
		StoreID: storeA, FieldAgentID: agentID, VisitType: VisitTypeOnboarding, StartLocation: testValidLocation(),
	})
	if err != nil {
		t.Fatalf("create governed visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })
	wrongStoreEvidence := seedStoreBoundReadinessMedia(t, db, partnerID, storeB, agentID)
	_, err = UpsertGovernedReadinessCheck(ctx, db, actor, visit.ID, UpdateCheckInput{
		CheckType: "location_verified", Status: CheckPassed, EvidenceURL: wrongStoreEvidence,
	})
	if !errors.Is(err, ErrEvidenceRequired) {
		t.Fatalf("expected ErrEvidenceRequired for another store's media, got %v", err)
	}
}

func TestEscalatedFurtherRemainsACompletionBlocker(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	agentID := uniqueID("agent-escalated-further")
	partnerID := seedPartner(t, db, agentID)
	storeID := uniqueID("store-escalated-further")
	seedFieldStore(t, db, storeID, agentID)
	registerGovernedStoreLocation(t, db, storeID, partnerID)
	actor := store.StoreActor{ID: agentID, Role: "field"}

	visit, err := CreateGovernedVisit(ctx, db, actor, CreateVisitInput{
		StoreID: storeID, FieldAgentID: agentID, VisitType: VisitTypeOnboarding, StartLocation: testValidLocation(),
	})
	if err != nil {
		t.Fatalf("create governed visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })
	for _, checkType := range RequiredCheckTypes {
		mediaRef := seedStoreBoundReadinessMedia(t, db, partnerID, storeID, agentID)
		if _, err := UpsertGovernedReadinessCheck(ctx, db, actor, visit.ID, UpdateCheckInput{
			CheckType: checkType, Status: CheckPassed, EvidenceURL: mediaRef,
		}); err != nil {
			t.Fatalf("upsert governed check %s: %v", checkType, err)
		}
	}
	escalation, err := CreateGovernedEscalation(ctx, db, actor, CreateEscalationInput{
		VisitID: visit.ID, StoreID: storeID, RaisedBy: agentID,
		Severity: SeverityHigh, Category: CategorySafetyViolation, Description: "critical readiness issue",
	})
	if err != nil {
		t.Fatalf("create governed escalation: %v", err)
	}
	if _, err := UpdateGovernedEscalation(ctx, db, escalation.ID, UpdateEscalationInput{
		Status: EscalationEscalatedFurther, ResolvedBy: "operator-1", ResolutionNote: "escalated to operations",
	}); err != nil {
		t.Fatalf("escalate further: %v", err)
	}
	if _, err := CompleteGovernedVisit(ctx, db, actor, visit.ID, testCompleteInput()); !errors.Is(err, ErrOpenEscalation) {
		t.Fatalf("expected ErrOpenEscalation for escalated_further, got %v", err)
	}
	status, err := GetGovernedStoreOnboardingStatus(ctx, db, storeID)
	if err != nil {
		t.Fatalf("read governed onboarding status: %v", err)
	}
	if status["openEscalations"] != 1 || status["onboardingComplete"] != false {
		t.Fatalf("expected escalated_further to remain visible and blocking, got %#v", status)
	}
}
