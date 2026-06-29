package payment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"wlt-api/internal/provider"
)

type fakeProvider struct {
	res provider.ProviderResult
	err error
}

func (f *fakeProvider) Post(ctx context.Context, path string, body any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	return f.res, f.err
}

func getTestDB(t *testing.T) *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Fallback to local dev postgres port
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func TestAuthorizeSessionWithProvider_DBFlow(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	ctx := context.Background()
	checkoutIntentID := fmt.Sprintf("test-checkout-auth-%d", time.Now().UnixNano())

	// Insert initial session
	var sessionID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', 'reference_created')
		RETURNING id`, checkoutIntentID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	client := &fakeProvider{
		res: provider.ProviderResult{
			ProviderReference: "card-auth-001",
			Status:            "authorized",
		},
	}

	// Run AuthorizeSessionWithProvider
	session, err := AuthorizeSessionWithProvider(ctx, db, client, sessionID, 1000, "SAR", provider.RequestMeta{})
	if err != nil {
		t.Fatalf("AuthorizeSessionWithProvider returned error: %v", err)
	}

	if session.Status != "authorized" {
		t.Errorf("expected status 'authorized', got %q", session.Status)
	}
	if session.ProviderReference != "card-auth-001" {
		t.Errorf("expected provider reference 'card-auth-001', got %q", session.ProviderReference)
	}
	if session.AmountMinorUnits != 1000 {
		t.Errorf("expected amount 1000, got %d", session.AmountMinorUnits)
	}
	if session.Currency != "SAR" {
		t.Errorf("expected currency 'SAR', got %q", session.Currency)
	}

	// Verify DB state directly
	var status, providerRef, currency string
	var amount int64
	err = db.QueryRowContext(ctx, `
		SELECT status, provider_reference, amount_minor_units, currency
		FROM wlt_payment_sessions
		WHERE id = $1`, sessionID).Scan(&status, &providerRef, &amount, &currency)
	if err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}

	if status != "authorized" || providerRef != "card-auth-001" || amount != 1000 || currency != "SAR" {
		t.Errorf("DB values do not match: status=%q, ref=%q, amount=%d, currency=%q", status, providerRef, amount, currency)
	}
}

func TestCaptureSessionWithProvider_DBFlow(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	ctx := context.Background()
	checkoutIntentID := fmt.Sprintf("test-checkout-cap-%d", time.Now().UnixNano())

	// Insert initial authorized session
	var sessionID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status, provider_reference, amount_minor_units, currency)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', 'authorized', 'card-auth-001', 1000, 'SAR')
		RETURNING id`, checkoutIntentID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	client := &fakeProvider{
		res: provider.ProviderResult{
			ProviderReference: "card-capture-001",
			Status:            "captured",
		},
	}

	// Run CaptureSessionWithProvider
	session, err := CaptureSessionWithProvider(ctx, db, client, sessionID, provider.RequestMeta{})
	if err != nil {
		t.Fatalf("CaptureSessionWithProvider returned error: %v", err)
	}

	if session.Status != "captured" {
		t.Errorf("expected status 'captured', got %q", session.Status)
	}
	if session.ProviderReference != "card-capture-001" {
		t.Errorf("expected provider reference 'card-capture-001', got %q", session.ProviderReference)
	}
	if session.CapturedAt == nil {
		t.Errorf("expected captured_at to not be nil")
	}

	// Verify DB state directly
	var status, providerRef string
	var capturedAt sql.NullTime
	err = db.QueryRowContext(ctx, `
		SELECT status, provider_reference, captured_at
		FROM wlt_payment_sessions
		WHERE id = $1`, sessionID).Scan(&status, &providerRef, &capturedAt)
	if err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}

	if status != "captured" || providerRef != "card-capture-001" || !capturedAt.Valid {
		t.Errorf("DB values do not match: status=%q, ref=%q, capturedAtValid=%t", status, providerRef, capturedAt.Valid)
	}
}

func TestProviderFailure_DBFlow(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	ctx := context.Background()
	checkoutIntentID := fmt.Sprintf("test-checkout-fail-%d", time.Now().UnixNano())

	// Insert initial session
	var sessionID string
	err := db.QueryRowContext(ctx, `
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', 'reference_created')
		RETURNING id`, checkoutIntentID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	client := &fakeProvider{
		err: errors.New("provider connection refused"),
	}

	// Run AuthorizeSessionWithProvider which should fail
	_, err = AuthorizeSessionWithProvider(ctx, db, client, sessionID, 1000, "SAR", provider.RequestMeta{})
	if err == nil {
		t.Fatalf("expected error from AuthorizeSessionWithProvider, got nil")
	}

	// Verify DB state directly - status must turn to failed
	var status string
	err = db.QueryRowContext(ctx, `
		SELECT status FROM wlt_payment_sessions WHERE id = $1`, sessionID).Scan(&status)
	if err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}

	if status != "failed" {
		t.Errorf("expected status 'failed', got %q", status)
	}
}
