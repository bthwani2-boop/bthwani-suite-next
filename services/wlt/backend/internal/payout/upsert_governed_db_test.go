package payout

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/shared"
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

func governedPayoutActorID() string {
	return "partner-payout-db-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

func executeCanonicalPayoutDestinationRequest(
	t *testing.T,
	db *sql.DB,
	tenantID, actorType, actorID, idempotencyKey, account string,
) *httptest.ResponseRecorder {
	t.Helper()
	payload := governedDestinationInput{
		BeneficiaryName:               "DB Partner Owner",
		BankName:                      "DB Test Bank",
		BankBranch:                    "Main",
		AccountNumber:                 account,
		IBAN:                          "YE00TEST" + account,
		SettlementPreference:          "bank",
		BankAccountHolderMatchesOwner: true,
		BankNotes:                     "integration proof",
		OperatorID:                    "field-db-001",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	path := "/wlt/payout-destinations/" + actorType + "/" + actorID
	req := httptest.NewRequest(http.MethodPut, path, bytes.NewReader(body))
	req = req.WithContext(shared.WithTenantContext(context.Background(), tenantID))
	req.SetPathValue("actorType", actorType)
	req.SetPathValue("actorId", actorID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", idempotencyKey)
	req.Header.Set("X-Correlation-ID", "correlation-"+tenantID+"-"+idempotencyKey)
	recorder := httptest.NewRecorder()
	HandleUpsertCanonicalPayoutDestination(db)(recorder, req)
	return recorder
}

func decodeCanonicalPayoutRef(t *testing.T, recorder *httptest.ResponseRecorder) governedDestinationRef {
	t.Helper()
	var envelope struct {
		PayoutDestination governedDestinationRef `json:"payoutDestination"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode payout response %d: %v; body=%s", recorder.Code, err, recorder.Body.String())
	}
	return envelope.PayoutDestination
}

func TestCanonicalPayoutDestinationIdempotencyAndSingleActiveAreTenantLocal(t *testing.T) {
	db := openPayoutRequiredDB(t)
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "jrn-037-db-test-encryption-key")
	actorID := governedPayoutActorID()
	tenantA := "tenant-payout-a-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantB := "tenant-payout-b-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_payout_destination_requests WHERE tenant_id IN ($1,$2)`, tenantA, tenantB)
		_, _ = db.Exec(`DELETE FROM wlt_jrn037_payout_audit_events WHERE tenant_id IN ($1,$2) AND aggregate_type='payout_destination'`, tenantA, tenantB)
		_, _ = db.Exec(`DELETE FROM wlt_payout_destinations WHERE tenant_id IN ($1,$2) AND owner_actor_id=$3`, tenantA, tenantB, actorID)
	})

	first := executeCanonicalPayoutDestinationRequest(t, db, tenantA, "partner", actorID, "payout-key-0001", "123456789")
	if first.Code != http.StatusCreated {
		t.Fatalf("first payout status = %d, want 201; body=%s", first.Code, first.Body.String())
	}
	firstRef := decodeCanonicalPayoutRef(t, first)
	if firstRef.ID == "" || firstRef.MaskedAccountNumber == "123456789" {
		t.Fatalf("first payout response is not masked: %#v", firstRef)
	}

	replay := executeCanonicalPayoutDestinationRequest(t, db, tenantA, "partner", actorID, "payout-key-0001", "123456789")
	if replay.Code != http.StatusOK {
		t.Fatalf("identical replay status = %d, want 200; body=%s", replay.Code, replay.Body.String())
	}
	replayRef := decodeCanonicalPayoutRef(t, replay)
	if replayRef.ID != firstRef.ID {
		t.Fatalf("identical replay created a new destination: first=%s replay=%s", firstRef.ID, replayRef.ID)
	}

	conflict := executeCanonicalPayoutDestinationRequest(t, db, tenantA, "partner", actorID, "payout-key-0001", "987654321")
	if conflict.Code != http.StatusConflict {
		t.Fatalf("payload-divergent replay status = %d, want 409; body=%s", conflict.Code, conflict.Body.String())
	}

	second := executeCanonicalPayoutDestinationRequest(t, db, tenantA, "partner", actorID, "payout-key-0002", "987654321")
	if second.Code != http.StatusCreated {
		t.Fatalf("second payout status = %d, want 201; body=%s", second.Code, second.Body.String())
	}
	secondRef := decodeCanonicalPayoutRef(t, second)
	if secondRef.ID == firstRef.ID {
		t.Fatal("new idempotency key did not create a new payout destination")
	}

	// The same actor identity and idempotency key are independent in another tenant.
	otherTenant := executeCanonicalPayoutDestinationRequest(t, db, tenantB, "partner", actorID, "payout-key-0001", "555555555")
	if otherTenant.Code != http.StatusCreated {
		t.Fatalf("cross-tenant same actor/key status = %d, want 201; body=%s", otherTenant.Code, otherTenant.Body.String())
	}
	otherTenantRef := decodeCanonicalPayoutRef(t, otherTenant)
	if otherTenantRef.ID == firstRef.ID || otherTenantRef.ID == secondRef.ID {
		t.Fatal("cross-tenant request reused another tenant's destination")
	}

	for _, tenantID := range []string{tenantA, tenantB} {
		var activeCount int
		if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destinations
			WHERE tenant_id=$1 AND owner_actor_type='partner' AND owner_actor_id=$2 AND active=true`, tenantID, actorID).Scan(&activeCount); err != nil {
			t.Fatal(err)
		}
		if activeCount != 1 {
			t.Fatalf("tenant %s active destination count=%d, want 1", tenantID, activeCount)
		}
	}

	var tenantARequestCount, tenantBRequestCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destination_requests WHERE tenant_id=$1`, tenantA).Scan(&tenantARequestCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destination_requests WHERE tenant_id=$1`, tenantB).Scan(&tenantBRequestCount); err != nil {
		t.Fatal(err)
	}
	if tenantARequestCount != 2 || tenantBRequestCount != 1 {
		t.Fatalf("tenant-local request counts are wrong: tenantA=%d tenantB=%d", tenantARequestCount, tenantBRequestCount)
	}

	var rawAccount, rawIBAN, rawMobile string
	var accountEncrypted, ibanEncrypted, mobileEncrypted bool
	if err := db.QueryRow(`
		SELECT account_number, iban, payout_mobile_number,
		       account_number_encrypted IS NOT NULL,
		       iban_encrypted IS NOT NULL,
		       payout_mobile_number_encrypted IS NOT NULL
		FROM wlt_payout_destinations
		WHERE tenant_id=$1 AND id=$2`, tenantA, secondRef.ID,
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
