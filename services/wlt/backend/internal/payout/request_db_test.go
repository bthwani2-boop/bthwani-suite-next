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
		"payout.HandleProcessGovernedPayoutRequest(db)",
		"payout.HandleCompletePayoutRequestSovereign(db)",
		"payout.HandleFailPayoutRequestSovereign(db)",
		"payout.HandleReconcileGovernedPayoutRequest(db)",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("runtime payout route is missing governed handler %s", required)
		}
	}
	for _, forbidden := range []string{
		"payout.HandleCreatePayoutRequest(db)",
		"payout.HandleApprovePayoutRequest(db)",
		"payout.HandleProcessPayoutRequest(db)",
		"payout.HandleCompletePayoutRequest(db)",
		"payout.HandleFailPayoutRequest(db)",
	} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("runtime router still binds retired payout handler %s", forbidden)
		}
	}
}

func TestRetiredManualPayoutLifecycleIsNotAValidCompletionProof(t *testing.T) {
	implementation, err := os.ReadFile("sovereign_payout.go")
	if err != nil {
		t.Fatalf("read sovereign payout implementation: %v", err)
	}
	text := string(implementation)
	for _, required := range []string{
		"PROVIDER_PROOF_REQUIRED",
		"provider_reference",
		"provider_status",
		"MAKER_CHECKER_VIOLATION",
		"ledger.PostLedgerTransaction",
		"shared.RequireOperatorContext(ctx)",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("sovereign payout completion is missing %s", required)
		}
	}
}
