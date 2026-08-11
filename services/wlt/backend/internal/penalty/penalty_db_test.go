package penalty

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

func penaltyTestDB(t *testing.T) *sql.DB {
	t.Helper()
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
		_ = db.Close()
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func TestPenaltyPostAndReverseUseCanonicalLedgerAsSoleBalanceWriter(t *testing.T) {
	db := penaltyTestDB(t)
	if db == nil {
		return
	}

	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "penalty-context-" + suffix
	actorID := "captain-penalty-" + suffix
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 5000,
		"penalty-opening-"+suffix, ledger.Actor{ID: "finance-test", Type: "test"}); err != nil {
		_ = tx.Rollback()
		t.Fatalf("post opening balance: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit opening balance: %v", err)
	}

	input := PostInput{
		IncidentID:        "incident-" + suffix,
		ProviderActorID:   actorID,
		ProviderActorType: "captain",
		AmountMinorUnits:  1200,
		Currency:          "YER",
		Reason:            "verified provider incident",
		PostedByActorID:   "workforce-operator-a",
	}
	posted, err := Post(ctx, db, "penalty-key-"+suffix, input)
	if err != nil {
		t.Fatalf("post penalty: %v", err)
	}
	if posted.LedgerTransactionID == "" {
		t.Fatal("penalty must persist its canonical ledger transaction id")
	}

	projection, err := ledger.GetWalletLedgerProjection(ctx, db, "captain", actorID, "YER")
	if err != nil {
		t.Fatalf("read canonical projection after penalty: %v", err)
	}
	if projection == nil || projection.BalanceMinorUnits != 3800 {
		t.Fatalf("expected canonical wallet balance 3800 after penalty, got %+v", projection)
	}
	var available int64
	if err := db.QueryRowContext(ctx, `SELECT available_balance_minor_units FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`, operatorContextID, actorID).Scan(&available); err != nil {
		t.Fatalf("read materialized wallet: %v", err)
	}
	if available != 3800 {
		t.Fatalf("materialized wallet drift after penalty: got %d want 3800", available)
	}

	replayed, err := Post(ctx, db, "penalty-key-"+suffix, input)
	if err != nil {
		t.Fatalf("idempotent penalty replay: %v", err)
	}
	if replayed.ID != posted.ID || replayed.LedgerTransactionID != posted.LedgerTransactionID {
		t.Fatalf("idempotent replay changed penalty identity: first=%+v replay=%+v", posted, replayed)
	}
	projection, err = ledger.GetWalletLedgerProjection(ctx, db, "captain", actorID, "YER")
	if err != nil || projection == nil || projection.BalanceMinorUnits != 3800 {
		t.Fatalf("idempotent replay changed canonical balance: projection=%+v err=%v", projection, err)
	}
	if _, err := Post(ctx, db, "different-key-"+suffix, input); !errors.Is(err, ErrConflict) {
		t.Fatalf("same incident with a different idempotency identity must conflict, got %v", err)
	}

	reversed, err := Reverse(ctx, db, posted.ID, ReverseInput{
		Reason:            "penalty overturned by review",
		ReversedByActorID: "workforce-operator-b",
	})
	if err != nil {
		t.Fatalf("reverse penalty: %v", err)
	}
	if reversed.ReversalLedgerTransactionID == "" || reversed.Status != "reversed" {
		t.Fatalf("reversal did not persist canonical lineage: %+v", reversed)
	}
	projection, err = ledger.GetWalletLedgerProjection(ctx, db, "captain", actorID, "YER")
	if err != nil || projection == nil || projection.BalanceMinorUnits != 5000 {
		t.Fatalf("expected reversal to restore canonical balance to 5000, projection=%+v err=%v", projection, err)
	}
}

func TestPenaltyHandlerDoesNotTrustRawOperatorContextHeader(t *testing.T) {
	body := `{"incidentId":"incident-spoof","providerActorId":"captain-spoof","providerActorType":"captain","amountMinorUnits":100,"currency":"YER","reason":"spoof attempt","postedByActorId":"operator-spoof"}`
	req := httptest.NewRequest(http.MethodPost, "/wlt/provider-penalties", strings.NewReader(body))
	req.Header.Set("X-Operator-Context-ID", "attacker-controlled-context")
	req.Header.Set("Idempotency-Key", "spoof-key-123")
	res := httptest.NewRecorder()

	HandlePost(nil)(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("raw OperatorContext header must not become domain authority, got status=%d body=%s", res.Code, res.Body.String())
	}
}
