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
	if dsn == "" { t.Fatal("DATABASE_URL is required when WLT_REQUIRE_DB_TESTS=true") }
	db, err := sql.Open("postgres", dsn)
	if err != nil { t.Fatal(err) }
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil { t.Fatal(err) }
	return db
}

func governedPayoutActorID() string {
	return "partner-payout-db-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

func executeCanonicalPayoutDestinationRequest(t *testing.T, db *sql.DB, operatorContextID, actorType, actorID, idempotencyKey, account string) *httptest.ResponseRecorder {
	t.Helper()
	payload := officialWalletDestinationInput{
		BeneficiaryName:           "DB Partner Owner",
		OfficialWalletProviderKey: testOfficialWalletProviderKey,
		DestinationReference:      account,
		Reason:                    "DB test finance provisioning",
		EvidenceReference:         "db-test-evidence:" + idempotencyKey,
	}
	body, err := json.Marshal(payload)
	if err != nil { t.Fatal(err) }
	path := "/wlt/payout-destinations/" + actorType + "/" + actorID
	req := httptest.NewRequest(http.MethodPut, path, bytes.NewReader(body))
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	req = req.WithContext(shared.WithDelegatedFinancePrincipal(ctx, "finance-db-maker"))
	req.SetPathValue("actorType", actorType)
	req.SetPathValue("actorId", actorID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", idempotencyKey)
	req.Header.Set("X-Correlation-ID", "correlation-"+operatorContextID+"-"+idempotencyKey)
	recorder := httptest.NewRecorder()
	HandleUpsertCanonicalPayoutDestination(db)(recorder, req)
	return recorder
}

func decodeCanonicalPayoutRef(t *testing.T, recorder *httptest.ResponseRecorder) governedDestinationRef {
	t.Helper()
	var envelope struct { PayoutDestination governedDestinationRef `json:"payoutDestination"` }
	if err := json.Unmarshal(recorder.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode payout response %d: %v; body=%s", recorder.Code, err, recorder.Body.String())
	}
	return envelope.PayoutDestination
}

func TestCanonicalPayoutDestinationIdempotencyAndSingleActiveAreOperatorContextLocal(t *testing.T) {
	db := openPayoutRequiredDB(t)
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "db-test-encryption-key")
	actorID := governedPayoutActorID()
	operatorContextA := "OperatorContext-payout-a-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextB := "OperatorContext-payout-b-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_payout_destination_requests WHERE operator_context_id IN ($1,$2)`, operatorContextA, operatorContextB)
		_, _ = db.Exec(`DELETE FROM wlt_payout_audit_events WHERE operator_context_id IN ($1,$2) AND aggregate_type='payout_destination'`, operatorContextA, operatorContextB)
		_, _ = db.Exec(`DELETE FROM wlt_payout_destinations WHERE operator_context_id IN ($1,$2) AND owner_actor_id=$3`, operatorContextA, operatorContextB, actorID)
		_, _ = db.Exec(`DELETE FROM wlt_official_wallet_providers WHERE operator_context_id IN ($1,$2)`, operatorContextA, operatorContextB)
	})
	seedOfficialWalletProvider(t, db, operatorContextA)
	seedOfficialWalletProvider(t, db, operatorContextB)

	first := executeCanonicalPayoutDestinationRequest(t, db, operatorContextA, "partner", actorID, "payout-key-0001", "123456789")
	if first.Code != http.StatusCreated { t.Fatalf("first payout status = %d, want 201; body=%s", first.Code, first.Body.String()) }
	firstRef := decodeCanonicalPayoutRef(t, first)
	if firstRef.ID == "" || firstRef.MaskedDestinationReference == "123456789" { t.Fatalf("first payout response is not masked: %#v", firstRef) }

	replay := executeCanonicalPayoutDestinationRequest(t, db, operatorContextA, "partner", actorID, "payout-key-0001", "123456789")
	if replay.Code != http.StatusOK { t.Fatalf("identical replay status = %d, want 200; body=%s", replay.Code, replay.Body.String()) }
	replayRef := decodeCanonicalPayoutRef(t, replay)
	if replayRef.ID != firstRef.ID { t.Fatalf("identical replay created a new destination: first=%s replay=%s", firstRef.ID, replayRef.ID) }

	conflict := executeCanonicalPayoutDestinationRequest(t, db, operatorContextA, "partner", actorID, "payout-key-0001", "987654321")
	if conflict.Code != http.StatusConflict { t.Fatalf("payload-divergent replay status = %d, want 409; body=%s", conflict.Code, conflict.Body.String()) }

	second := executeCanonicalPayoutDestinationRequest(t, db, operatorContextA, "partner", actorID, "payout-key-0002", "987654321")
	if second.Code != http.StatusCreated { t.Fatalf("second payout status = %d, want 201; body=%s", second.Code, second.Body.String()) }
	secondRef := decodeCanonicalPayoutRef(t, second)
	if secondRef.ID == firstRef.ID { t.Fatal("new idempotency key did not create a new payout destination") }

	otherContext := executeCanonicalPayoutDestinationRequest(t, db, operatorContextB, "partner", actorID, "payout-key-0001", "555555555")
	if otherContext.Code != http.StatusCreated { t.Fatalf("cross-OperatorContext same actor/key status = %d, want 201; body=%s", otherContext.Code, otherContext.Body.String()) }
	otherRef := decodeCanonicalPayoutRef(t, otherContext)
	if otherRef.ID == firstRef.ID || otherRef.ID == secondRef.ID { t.Fatal("cross-OperatorContext request reused another OperatorContext's destination") }

	for _, operatorContextID := range []string{operatorContextA, operatorContextB} {
		var activeCount int
		if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destinations WHERE operator_context_id=$1 AND owner_actor_type='partner' AND owner_actor_id=$2 AND active=true`, operatorContextID, actorID).Scan(&activeCount); err != nil { t.Fatal(err) }
		if activeCount != 1 { t.Fatalf("OperatorContext %s active destination count=%d, want 1", operatorContextID, activeCount) }
	}

	var aRequestCount, bRequestCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destination_requests WHERE operator_context_id=$1`, operatorContextA).Scan(&aRequestCount); err != nil { t.Fatal(err) }
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_destination_requests WHERE operator_context_id=$1`, operatorContextB).Scan(&bRequestCount); err != nil { t.Fatal(err) }
	if aRequestCount != 2 || bRequestCount != 1 { t.Fatalf("OperatorContext-local request counts are wrong: A=%d B=%d", aRequestCount, bRequestCount) }

	var decryptedReference string
	var referenceEncrypted bool
	if err := db.QueryRow(`SELECT pgp_sym_decrypt(destination_reference_encrypted, $3), destination_reference_encrypted IS NOT NULL FROM wlt_payout_destinations WHERE operator_context_id=$1 AND id=$2`, operatorContextA, secondRef.ID, "db-test-encryption-key").Scan(&decryptedReference, &referenceEncrypted); err != nil { t.Fatal(err) }
	if decryptedReference != "987654321" { t.Fatalf("decrypted payout reference mismatch: %q", decryptedReference) }
	if !referenceEncrypted { t.Fatal("encrypted payout reference is missing") }
}
