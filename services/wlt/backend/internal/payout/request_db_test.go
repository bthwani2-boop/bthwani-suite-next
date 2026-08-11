package payout

import (
	"database/sql"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"
)

func getTestDB(t *testing.T) *sql.DB {
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
	return db
}

func TestRuntimePayoutRoutesBindOnlyGovernedLifecycle(t *testing.T) {
	server, err := os.ReadFile("../http/server.go")
	if err != nil {
		t.Fatalf("read WLT router: %v", err)
	}
	text := string(server)
	for _, required := range []string{
		"payout.HandleCreateGovernedPayoutRequest(db)",
		"payout.HandleApprovePayoutRequestSovereign(db)",
		"payout.HandleRecordManualTransferExecution(db)",
		"payout.HandleVerifyManualTransferExecution(db)",
		"payout.HandleCompletePayoutRequestSovereign(db)",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("runtime payout route is missing governed handler %s", required)
		}
	}
	// The provider-managed Cash-Out lifecycle is retired: the current
	// production model is governed manual external settlement. These routes
	// were permanently-erroring stubs whose only effect was to make the payout
	// state machine look complete while it had no reachable terminal state.
	for _, forbidden := range []string{
		"payout.HandleCreatePayoutRequest(db)",
		"payout.HandleApprovePayoutRequest(db)",
		"payout.HandleProcessGovernedPayoutRequest(db)",
		"payout.HandleCompletePayoutRequest(db)",
		"payout.HandleFailPayoutRequestSovereign(db)",
		"payout.HandleReconcileGovernedPayoutRequest(db)",
	} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("runtime router still binds retired payout handler %s", forbidden)
		}
	}
}

// TestPayoutCompletionRequiresVerifiedExternalExecution pins the completion
// gate to the manual-settlement evidence chain. Completion previously demanded
// a successful provider proof and status='processing', neither of which any
// writer could produce, so no payout could ever complete.
func TestPayoutCompletionRequiresVerifiedExternalExecution(t *testing.T) {
	implementation, err := os.ReadFile("sovereign_payout.go")
	if err != nil {
		t.Fatalf("read sovereign payout implementation: %v", err)
	}
	text := string(implementation)
	for _, required := range []string{
		"VERIFIED_EXECUTION_REQUIRED",
		"wlt_manual_transfer_evidence",
		"e.verified_at IS NOT NULL",
		"MAKER_CHECKER_VIOLATION",
		"ledger.PostLedgerTransaction",
		"shared.RequireOperatorContext(ctx)",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("sovereign payout completion is missing %s", required)
		}
	}
	for _, forbidden := range []string{
		"PROVIDER_PROOF_REQUIRED",
		"provider_reference",
		"status = 'processing'",
	} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("sovereign payout completion still depends on the retired provider proof: %s", forbidden)
		}
	}
}
