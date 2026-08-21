package fieldassignment

import (
	"database/sql"
	"fmt"
	"os"
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

func TestCreateReadbackPreservesBusinessAndStoreHints(t *testing.T) {
	db := openRequiredDB(t)
	key := fmt.Sprintf("fieldassignment-readback-%d", time.Now().UnixNano())
	assignment, err := Create(t.Context(), db, "local-dsh", "field-readback-test", CreateInput{
		FieldActorID:    "field-readback-test",
		BusinessTaskKey: key,
		StoreNameHint:   "Readback Store",
		PhoneHint:       "+967770000099",
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_onboarding_assignments WHERE id = $1`, assignment.ID) })

	if assignment.BusinessTaskKey != key || assignment.StoreNameHint != "Readback Store" {
		t.Fatalf("create readback swapped fields: businessTaskKey=%q storeNameHint=%q", assignment.BusinessTaskKey, assignment.StoreNameHint)
	}
	readback, err := Get(t.Context(), db, "local-dsh", assignment.ID)
	if err != nil {
		t.Fatal(err)
	}
	if readback.BusinessTaskKey != key || readback.StoreNameHint != "Readback Store" {
		t.Fatalf("stored readback swapped fields: businessTaskKey=%q storeNameHint=%q", readback.BusinessTaskKey, readback.StoreNameHint)
	}
}

func TestAssignmentLifecycleTransitionsAndReadbacksDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	operatorContextID := "local-dsh"
	fieldActorID := "field-lifecycle-test"
	var partnerID string
	if err := db.QueryRow(`SELECT id FROM dsh_partners ORDER BY id LIMIT 1`).Scan(&partnerID); err != nil {
		t.Fatalf("seeded partner is required for draft-link lifecycle: %v", err)
	}
	firstKey := fmt.Sprintf("fieldassignment-lifecycle-first-%d", time.Now().UnixNano())
	first, err := Create(t.Context(), db, operatorContextID, "operator-lifecycle-test", CreateInput{
		FieldActorID: fieldActorID, BusinessTaskKey: firstKey, StoreNameHint: "Lifecycle Store", PhoneHint: "+967770000098",
	})
	if err != nil {
		t.Fatal(err)
	}
	secondKey := fmt.Sprintf("fieldassignment-lifecycle-second-%d", time.Now().UnixNano())
	second, err := Create(t.Context(), db, operatorContextID, "operator-lifecycle-test", CreateInput{
		FieldActorID: fieldActorID, BusinessTaskKey: secondKey, StoreNameHint: "Lifecycle Store 2", AddressHint: "Sana'a",
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_field_onboarding_assignments WHERE id IN ($1,$2)`, first.ID, second.ID)
	})

	opened, err := Open(t.Context(), db, operatorContextID, first.ID, fieldActorID, TransitionInput{ExpectedVersion: 1})
	if err != nil || opened.Status != StatusInProgress || opened.Version != 2 {
		t.Fatalf("open transition mismatch: assignment=%#v err=%v", opened, err)
	}
	linked, err := LinkDraft(t.Context(), db, operatorContextID, first.ID, fieldActorID, partnerID)
	if err != nil || linked.Status != StatusDraftLinked || linked.DraftPartnerID != partnerID || linked.Version != 3 {
		t.Fatalf("draft-link transition mismatch: assignment=%#v err=%v", linked, err)
	}
	if _, err := Get(t.Context(), db, operatorContextID, first.ID); err != nil {
		t.Fatalf("linked assignment readback failed: %v", err)
	}
	fieldItems, err := ListForField(t.Context(), db, operatorContextID, fieldActorID)
	if err != nil || len(fieldItems) < 2 {
		t.Fatalf("field assignment list did not include active lifecycle assignments: len=%d err=%v", len(fieldItems), err)
	}

	reassigned, err := Reassign(t.Context(), db, operatorContextID, second.ID, "operator-lifecycle-test", ReassignInput{
		ExpectedVersion: 1, FieldActorID: "field-lifecycle-reassigned", Reason: "coverage lifecycle handoff",
	})
	if err != nil || reassigned.FieldActorID != "field-lifecycle-reassigned" || reassigned.Status != StatusAssigned || reassigned.Version != 2 {
		t.Fatalf("reassign transition mismatch: assignment=%#v err=%v", reassigned, err)
	}
	cancelled, err := Cancel(t.Context(), db, operatorContextID, second.ID, "operator-lifecycle-test", TransitionInput{ExpectedVersion: 2, Reason: "operator cancellation"})
	if err != nil || cancelled.Status != StatusCancelled || cancelled.Version != 3 {
		t.Fatalf("cancel transition mismatch: assignment=%#v err=%v", cancelled, err)
	}
	operatorItems, err := ListForOperator(t.Context(), db, operatorContextID)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range operatorItems {
		if item.ID == second.ID && item.Status != StatusCancelled {
			t.Fatalf("operator readback returned stale cancellation: %#v", item)
		}
	}
}
