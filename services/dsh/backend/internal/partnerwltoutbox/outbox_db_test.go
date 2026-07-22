package partnerwltoutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"dsh-api/internal/wlt"
)

func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run partner WLT DB integration tests")
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

func seedPartner(t *testing.T, db *sql.DB, prefix string) string {
	t.Helper()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	var partnerID string
	if err := db.QueryRow(`
		INSERT INTO dsh_partners (
			legal_name_ar, display_name, legal_identity_type, legal_identity_number,
			owner_name, primary_phone, created_by_actor_id, created_by_surface
		) VALUES ($1,$2,'commercial_register',$3,'مالك اختبار',$4,'operator-db','control-panel')
		RETURNING id`,
		"شريك "+prefix+suffix,
		"Partner "+prefix+suffix,
		"YE-"+prefix+suffix,
		"+96777"+suffix[len(suffix)-7:],
	).Scan(&partnerID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partner_wlt_reconciliation_cases WHERE partner_id = $1`, partnerID)
		_, _ = db.Exec(`DELETE FROM dsh_partner_wlt_outbox WHERE partner_id = $1`, partnerID)
		_, _ = db.Exec(`DELETE FROM dsh_partner_activation_events WHERE partner_id = $1`, partnerID)
		_, _ = db.Exec(`DELETE FROM dsh_partners WHERE id = $1`, partnerID)
	})
	return partnerID
}

func TestPartnerDeactivationTriggerAndOutboxDeliveryDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	partnerID := seedPartner(t, db, "OUTBOX")

	var requestCount int
	var gotCaller, gotIdempotency, gotCorrelation string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		gotCaller = r.Header.Get("X-Service-Caller")
		gotIdempotency = r.Header.Get("Idempotency-Key")
		gotCorrelation = r.Header.Get("X-Correlation-ID")
		if r.Method != http.MethodPost || r.URL.Path != "/wlt/payout-destinations/"+partnerID+"/deactivate" {
			t.Fatalf("unexpected WLT deactivation request: %s %s", r.Method, r.URL.Path)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()
	client := wlt.NewClient(server.URL, "service-test-token")

	var activationEventID string
	if err := db.QueryRow(`
		INSERT INTO dsh_partner_activation_events (
			partner_id, from_status, to_status, actor_id, actor_surface,
			reason, correlation_id, idempotency_key, request_hash
		) VALUES ($1,'partner_active','partner_deactivated','operator-db','control-panel',
		          'integration deactivation','partner-deactivation-correlation',
		          'partner-deactivation-transition-key','partner-deactivation-hash')
		RETURNING id`, partnerID,
	).Scan(&activationEventID); err != nil {
		t.Fatal(err)
	}

	var pendingCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_partner_wlt_outbox
		WHERE partner_id = $1 AND activation_event_id = $2 AND status = 'pending'`,
		partnerID, activationEventID,
	).Scan(&pendingCount); err != nil {
		t.Fatal(err)
	}
	if pendingCount != 1 {
		t.Fatalf("deactivation transition produced %d pending outbox rows, want 1", pendingCount)
	}

	processed, err := ProcessNext(context.Background(), db, client)
	if err != nil {
		t.Fatal(err)
	}
	if !processed || requestCount != 1 {
		t.Fatalf("outbox delivery processed=%v requests=%d", processed, requestCount)
	}
	if gotCaller != "dsh" || gotIdempotency == "" || gotCorrelation != "partner-deactivation-correlation" {
		t.Fatalf("WLT mutation headers incomplete: caller=%q idempotency=%q correlation=%q", gotCaller, gotIdempotency, gotCorrelation)
	}

	var status string
	var attempts int
	if err := db.QueryRow(`
		SELECT status, attempt_count FROM dsh_partner_wlt_outbox
		WHERE activation_event_id = $1`, activationEventID,
	).Scan(&status, &attempts); err != nil {
		t.Fatal(err)
	}
	if status != "delivered" || attempts != 1 {
		t.Fatalf("outbox status=%q attempts=%d, want delivered/1", status, attempts)
	}
}

func TestPartnerWltReconciliationCreatesAndResolvesMaskedReadbackCaseDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	partnerID := seedPartner(t, db, "RECON")

	active := true
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		requestedPartnerID := strings.TrimPrefix(r.URL.Path, "/wlt/payout-destinations/")
		if requestedPartnerID != partnerID {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":                   "wpd-reconciliation-ref",
			"partnerId":            partnerID,
			"settlementPreference": "bank",
			"maskedAccountNumber":  "*****1234",
			"maskedIban":           "********5678",
			"maskedMobileNumber":   "",
			"beneficiaryName":      "Partner Owner",
			"bankName":             "Test Bank",
			"bankBranch":           "Main",
			"active":               active,
			"updatedAt":            time.Now().UTC().Format(time.RFC3339Nano),
		})
	}))
	defer server.Close()
	client := wlt.NewClient(server.URL, "service-test-token")

	if err := Reconcile(context.Background(), db, client); err != nil {
		t.Fatal(err)
	}
	var issue, status string
	if err := db.QueryRow(`
		SELECT issue_type, status
		FROM dsh_partner_wlt_reconciliation_cases
		WHERE partner_id = $1`, partnerID,
	).Scan(&issue, &status); err != nil {
		t.Fatal(err)
	}
	if issue != "dsh_reference_missing" || status != "open" {
		t.Fatalf("reconciliation issue=%q status=%q", issue, status)
	}

	if _, err := db.Exec(`
		UPDATE dsh_partners SET
			payout_destination_id = 'wpd-reconciliation-ref',
			masked_account_number = '*****1234',
			masked_iban = '********5678',
			masked_mobile_number = '',
			bank_account_number = '', bank_iban = '', payout_mobile_number = ''
		WHERE id = $1`, partnerID); err != nil {
		t.Fatal(err)
	}
	if err := Reconcile(context.Background(), db, client); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`
		SELECT status FROM dsh_partner_wlt_reconciliation_cases
		WHERE partner_id = $1 AND issue_type = 'dsh_reference_missing'`, partnerID,
	).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != "resolved" {
		t.Fatalf("aligned reconciliation case status=%q, want resolved", status)
	}
}
