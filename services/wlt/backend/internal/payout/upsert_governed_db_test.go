package payout

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openPayoutRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("WLT_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WLT_REQUIRE_DB_TESTS=true to run WLT payout DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when WLT_REQUIRE_DB_TESTS=true")
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

func governedPayoutPartnerID() string {
	return "partner-payout-db-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

func executeGovernedPayoutRequest(t *testing.T, db *sql.DB, partnerID, idempotencyKey, account string) *httptest.ResponseRecorder {
	t.Helper()
	payload := UpsertPayoutDestinationInput{
		BeneficiaryName:               "DB Partner Owner",
		BankName:                      "DB Test Bank",
		BankBranch:                    "Main",
		AccountNumber:                 account,
		IBAN:                          "YE00TEST" + account,
		SettlementPreference:          "bank",
		BankAccountHolderMatchesOwner: true,
		BankNotes:                     "integration proof",
		CreatedByActorID:              "field-db-001",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPut, "/wlt/payout-destinations/"+partnerID, bytes.NewReader(body))
	req.SetPathValue("partnerId", partnerID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", idempotencyKey)
	req.Header.Set("X-Correlation-ID", "correlation-"+idempotencyKey)
	recorder := httptest.NewRecorder()
	HandleUpsertPayoutDestinationGoverned(db)(recorder, req)
	return recorder
}

func decodePayoutRef(t *testing.T, recorder *httptest.ResponseRecorder) PayoutDestinationRef {
	t.Helper()
	var ref PayoutDestinationRef
	if err := json.Unmarshal(recorder.Body.Bytes(), &ref); err != nil {
		t.Fatalf("decode payout response %d: %v; body=%s", recorder.Code, err, recorder.Body.String())
	}
	return ref
}

func TestGovernedPayoutDestinationIdempotencyAndSingleActiveDBIntegration(t *testing.T) {
	db := openPayoutRequiredDB(t)
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "jrn-001-db-test-encryption-key")
	partnerID := governedPayoutPartnerID()
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_payout_destination_requests WHERE partner_id = $1`, partnerID)
		_, _ = db.Exec(`DELETE FROM wlt_payout_destinations WHERE partner_id = $1`, partnerID)
	})

	first := executeGovernedPayoutRequest(t, db, partnerID, "payout-key-0001", "123456789")
	if first.Code != http.StatusCreated {
		t.Fatalf("first payout status = %d, want 201; body=%s", first.Code, first.Body.String())
	}
	firstRef := decodePayoutRef(t, first)
	if firstRef.ID == "" || firstRef.MaskedAccountNumber == "123456789" {
		t.Fatalf("first payout response is not masked: %#v", firstRef)
	}

	replay := executeGovernedPayoutRequest(t, db, partnerID, "payout-key-0001", "123456789")
	if replay.Code != http.StatusOK {
		t.Fatalf("identical replay status = %d, want 200; body=%s", replay.Code, replay.Body.String())
	}
	replayRef := decodePayoutRef(t, replay)
	if replayRef.ID != firstRef.ID {
		t.Fatalf("identical replay created a new destination: first=%s replay=%s", firstRef.ID, replayRef.ID)
	}

	conflict := executeGovernedPayoutRequest(t, db, partnerID, "payout-key-0001", "987654321")
	if conflict.Code != http.StatusConflict {
		t.Fatalf("payload-divergent replay status = %d, want 409; body=%s", conflict.Code, conflict.Body.String())
	}

	second := executeGovernedPayoutRequest(t, db, partnerID, "payout-key-0002", "987654321")
	if second.Code != http.StatusCreated {
		t.Fatalf("second payout status = %d, want 201; body=%s", second.Code, second.Body.String())
	}
	secondRef := decodePayoutRef(t, second)
	if secondRef.ID == firstRef.ID {
		t.Fatal("new idempotency key did not create a new payout destination")
	}

	var activeCount, requestCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destinations WHERE partner_id = $1 AND active = true`, partnerID).Scan(&activeCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destination_requests WHERE partner_id = $1`, partnerID).Scan(&requestCount); err != nil {
		t.Fatal(err)
	}
	if activeCount != 1 || requestCount != 2 {
		t.Fatalf("payout invariants failed: active=%d requests=%d", activeCount, requestCount)
	}

	var rawAccount, rawIBAN, rawMobile string
	var accountEncrypted, ibanEncrypted, mobileEncrypted bool
	if err := db.QueryRow(`
		SELECT account_number, iban, payout_mobile_number,
		       account_number_encrypted IS NOT NULL,
		       iban_encrypted IS NOT NULL,
		       payout_mobile_number_encrypted IS NOT NULL
		FROM wlt_payout_destinations
		WHERE id = $1`, secondRef.ID,
	).Scan(&rawAccount, &rawIBAN, &rawMobile, &accountEncrypted, &ibanEncrypted, &mobileEncrypted); err != nil {
		t.Fatal(err)
	}
	if rawAccount != "" || rawIBAN != "" || rawMobile != "" {
		t.Fatalf("plaintext payout data persisted: account=%q iban=%q mobile=%q", rawAccount, rawIBAN, rawMobile)
	}
	if !accountEncrypted || !ibanEncrypted || !mobileEncrypted {
		t.Fatalf("encrypted payout columns incomplete: account=%v iban=%v mobile=%v", accountEncrypted, ibanEncrypted, mobileEncrypted)
	}
}
