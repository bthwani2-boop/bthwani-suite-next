package pickup

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
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

type fixture struct {
	partnerID string
	storeID   string
	clientID  string
	orderID   string
}

func seedFixture(t *testing.T, db *sql.DB, orderStatus string) fixture {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	tenantID := "tenant-pickup-test-" + suffix
	f := fixture{
		partnerID: "pk-test-partner-" + suffix,
		storeID:   "pk-test-store-" + suffix,
		clientID:  uuid.NewString(),
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners (id, legal_name_ar, display_name, legal_identity_number, primary_phone)
		VALUES ($1, 'شريك اختبار', 'PK Test Partner', $1, '700000002')`,
		f.partnerID); err != nil {
		t.Fatalf("failed to insert test partner: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, partner_id)
		VALUES ($1, $1, 'PK Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true, $2)`,
		f.storeID, f.partnerID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'pickup', 'active')
		RETURNING id::text`,
		f.clientID, f.storeID,
	).Scan(&cartID); err != nil {
		t.Fatalf("failed to insert test cart: %v", err)
	}

	var checkoutIntentID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, fulfillment_mode, payment_method)
		VALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'pickup', 'wallet')
		RETURNING id::text`,
		tenantID, f.clientID, cartID, f.storeID,
	).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_orders (tenant_id, checkout_intent_id, store_id, fulfillment_mode, client_id, status)
		VALUES ($1, $2::uuid, $3, 'pickup', $4, $5)
		RETURNING id::text`,
		tenantID, checkoutIntentID, f.storeID, f.clientID, orderStatus,
	).Scan(&f.orderID); err != nil {
		t.Fatalf("failed to insert test order: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_pickup_audit_events WHERE entity_id IN (SELECT id::text FROM dsh_pickup_sessions WHERE order_id = $1::uuid) OR entity_id = $1`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_operational_outbox_events WHERE entity_type = 'pickup_session' AND entity_id IN (SELECT id FROM dsh_pickup_sessions WHERE order_id = $1::uuid)`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_pickup_sessions WHERE order_id = $1::uuid`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_orders WHERE id = $1::uuid`, f.orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, checkoutIntentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE id = $1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, f.storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, f.partnerID)
	})

	return f
}

func issuedSession(t *testing.T, svc *Service, f fixture) (string, *PickupSession) {
	t.Helper()
	plain, session, err := svc.IssueOtp(context.Background(), f.orderID, f.clientID, "partner-1", "partner", "")
	if err != nil {
		t.Fatalf("IssueOtp failed: %v", err)
	}
	return plain, session
}

func TestVerifyOtpSuccessDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)

	plain, _ := issuedSession(t, svc, f)

	session, err := svc.VerifyOtp(context.Background(), f.orderID, plain, "partner-1", "partner", "")
	if err != nil {
		t.Fatalf("VerifyOtp failed: %v", err)
	}
	if session.UsedAt == nil {
		t.Fatal("expected usedAt to be set after successful verification")
	}
	if session.VerificationMethod == nil || *session.VerificationMethod != "otp" {
		t.Fatalf("expected verificationMethod 'otp', got %v", session.VerificationMethod)
	}

	var orderStatus string
	if err := db.QueryRow(`SELECT status FROM dsh_orders WHERE id = $1::uuid`, f.orderID).Scan(&orderStatus); err != nil {
		t.Fatalf("failed to read order status: %v", err)
	}
	if orderStatus != "delivered" {
		t.Fatalf("expected order status delivered after pickup verification, got %s", orderStatus)
	}
}

func TestVerifyOtpWrongCodeIncrementsAttemptAndLocksOutDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)
	ctx := context.Background()

	_, session := issuedSession(t, svc, f)
	if session.MaxAttempts <= 0 {
		t.Fatalf("expected positive maxAttempts, got %d", session.MaxAttempts)
	}

	for i := 0; i < session.MaxAttempts; i++ {
		_, err := svc.VerifyOtp(ctx, f.orderID, "000000", "partner-1", "partner", "")
		if !errors.Is(err, ErrInvalidCode) {
			t.Fatalf("attempt %d: expected ErrInvalidCode, got %v", i, err)
		}
	}

	_, err := svc.VerifyOtp(ctx, f.orderID, "000000", "partner-1", "partner", "")
	if !errors.Is(err, ErrAttemptsExceeded) {
		t.Fatalf("expected ErrAttemptsExceeded after exhausting attempts, got %v", err)
	}
}

func TestVerifyOtpReuseAfterVerifiedRejectedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)
	ctx := context.Background()

	plain, _ := issuedSession(t, svc, f)
	if _, err := svc.VerifyOtp(ctx, f.orderID, plain, "partner-1", "partner", ""); err != nil {
		t.Fatalf("first VerifyOtp failed: %v", err)
	}

	if _, err := svc.VerifyOtp(ctx, f.orderID, plain, "partner-1", "partner", ""); !errors.Is(err, ErrAlreadyUsed) {
		t.Fatalf("expected ErrAlreadyUsed on reuse, got %v", err)
	}
}

func TestVerifyOtpExpiredRejectedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)
	ctx := context.Background()

	plain, session := issuedSession(t, svc, f)
	if _, err := db.ExecContext(ctx, `UPDATE dsh_pickup_sessions SET expires_at = NOW() - interval '1 minute' WHERE id = $1`, session.ID); err != nil {
		t.Fatalf("failed to force expiry: %v", err)
	}

	if _, err := svc.VerifyOtp(ctx, f.orderID, plain, "partner-1", "partner", ""); !errors.Is(err, ErrExpired) {
		t.Fatalf("expected ErrExpired, got %v", err)
	}
}

func TestExtendWindowRequiresReasonDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	f := seedFixture(t, db, "ready_for_pickup")
	svc := NewService(db)
	ctx := context.Background()

	_, _ = issuedSession(t, svc, f)

	_, err := svc.ExtendWindow(ctx, f.orderID, time.Now().Add(time.Hour), "operator-1", "operator", "", "")
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid when reason is missing, got %v", err)
	}

	session, err := svc.ExtendWindow(ctx, f.orderID, time.Now().Add(time.Hour), "operator-1", "operator", "customer requested more time", "")
	if err != nil {
		t.Fatalf("ExtendWindow with reason failed: %v", err)
	}
	if session.AttemptCount != 0 {
		t.Fatalf("expected attemptCount reset to 0, got %d", session.AttemptCount)
	}
}
