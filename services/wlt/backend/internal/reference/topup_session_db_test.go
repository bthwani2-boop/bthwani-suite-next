package reference

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func getTestDB(t *testing.T) *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func uniqueID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

func TestCreateTopUpSession_CustomerDerivesCustomerTopUpPurpose(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	opCtx := uniqueID("op")
	actorID := uniqueID("customer")

	session, err := CreateTopUpSession(db, CreateTopUpSessionInput{
		ActorType:         "customer",
		ActorID:           actorID,
		TopUpReference:    uniqueID("topup"),
		OperatorContextID: opCtx,
		AmountMinorUnits:  5000,
		Currency:          "YER",
		IdempotencyKey:    uniqueID("idem"),
		CorrelationID:     uniqueID("corr"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.FinancialPurpose != "customer_topup" {
		t.Fatalf("expected financialPurpose customer_topup, got %s", session.FinancialPurpose)
	}
	if session.TopUpActorType == nil || *session.TopUpActorType != "customer" {
		t.Fatalf("expected topupActorType customer, got %+v", session.TopUpActorType)
	}
	if session.ClientID != actorID {
		t.Fatalf("expected clientId %s, got %s", actorID, session.ClientID)
	}
	if session.Status != "reference_created" {
		t.Fatalf("expected status reference_created, got %s", session.Status)
	}
}

func TestCreateTopUpSession_CaptainDerivesCaptainTopUpPurpose(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	session, err := CreateTopUpSession(db, CreateTopUpSessionInput{
		ActorType:         "captain",
		ActorID:           uniqueID("captain"),
		TopUpReference:    uniqueID("topup"),
		OperatorContextID: uniqueID("op"),
		AmountMinorUnits:  2500,
		Currency:          "YER",
		IdempotencyKey:    uniqueID("idem"),
		CorrelationID:     uniqueID("corr"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.FinancialPurpose != "captain_topup" {
		t.Fatalf("expected financialPurpose captain_topup, got %s", session.FinancialPurpose)
	}
}

func TestCreateTopUpSession_RejectsUnsupportedActorType(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	_, err := CreateTopUpSession(db, CreateTopUpSessionInput{
		ActorType:         "partner",
		ActorID:           uniqueID("partner"),
		TopUpReference:    uniqueID("topup"),
		OperatorContextID: uniqueID("op"),
		AmountMinorUnits:  1000,
		Currency:          "YER",
		IdempotencyKey:    uniqueID("idem"),
		CorrelationID:     uniqueID("corr"),
	})
	if err == nil {
		t.Fatal("expected an error for unsupported actor type")
	}
}

func TestCreateTopUpSession_ReplayWithSameReferenceReturnsSameSession(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	input := CreateTopUpSessionInput{
		ActorType:         "customer",
		ActorID:           uniqueID("customer"),
		TopUpReference:    uniqueID("topup"),
		OperatorContextID: uniqueID("op"),
		AmountMinorUnits:  3000,
		Currency:          "YER",
		IdempotencyKey:    uniqueID("idem"),
		CorrelationID:     uniqueID("corr"),
	}

	first, err := CreateTopUpSession(db, input)
	if err != nil {
		t.Fatalf("unexpected error on first create: %v", err)
	}
	second, err := CreateTopUpSession(db, input)
	if err != nil {
		t.Fatalf("unexpected error on replay: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected replay to return the same session, got %s vs %s", first.ID, second.ID)
	}
}

func TestCreateTopUpSession_DifferentAmountSameReferenceConflicts(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	ref := uniqueID("topup")
	opCtx := uniqueID("op")
	actorID := uniqueID("customer")

	_, err := CreateTopUpSession(db, CreateTopUpSessionInput{
		ActorType:         "customer",
		ActorID:           actorID,
		TopUpReference:    ref,
		OperatorContextID: opCtx,
		AmountMinorUnits:  3000,
		Currency:          "YER",
		IdempotencyKey:    uniqueID("idem"),
		CorrelationID:     uniqueID("corr"),
	})
	if err != nil {
		t.Fatalf("unexpected error on first create: %v", err)
	}

	_, err = CreateTopUpSession(db, CreateTopUpSessionInput{
		ActorType:         "customer",
		ActorID:           actorID,
		TopUpReference:    ref,
		OperatorContextID: opCtx,
		AmountMinorUnits:  4000,
		Currency:          "YER",
		IdempotencyKey:    uniqueID("idem"),
		CorrelationID:     uniqueID("corr"),
	})
	if err != ErrIdempotencyConflict {
		t.Fatalf("expected ErrIdempotencyConflict, got %v", err)
	}
}
