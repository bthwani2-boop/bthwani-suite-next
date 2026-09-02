package cart

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestCartMutationReceiptInvariantClosureDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()

	var nullable string
	if err := db.QueryRowContext(ctx, `
		SELECT is_nullable
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'dsh_cart_mutation_receipts'
		  AND column_name = 'result_version'
	`).Scan(&nullable); err != nil {
		t.Fatalf("read result_version nullability: %v", err)
	}
	if nullable != "NO" {
		t.Fatalf("result_version must be NOT NULL, got is_nullable=%q", nullable)
	}

	var legacy sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT to_regclass('public.dsh_cart_idempotency')::text`).Scan(&legacy); err != nil {
		t.Fatalf("inspect legacy cart idempotency table: %v", err)
	}
	if legacy.Valid {
		t.Fatalf("legacy dsh_cart_idempotency still exists: %s", legacy.String)
	}

	var quarantine sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT to_regclass('public.dsh_cart_mutation_receipt_quarantine')::text`).Scan(&quarantine); err != nil {
		t.Fatalf("inspect cart receipt quarantine table: %v", err)
	}
	if !quarantine.Valid {
		t.Fatal("dsh_cart_mutation_receipt_quarantine is missing")
	}

	var constraintDefinition string
	if err := db.QueryRowContext(ctx, `
		SELECT pg_get_constraintdef(oid)
		FROM pg_constraint
		WHERE conrelid = 'public.dsh_cart_mutation_receipts'::regclass
		  AND conname = 'dsh_cart_mutation_receipts_result_version_check'
	`).Scan(&constraintDefinition); err != nil {
		t.Fatalf("read result_version constraint: %v", err)
	}
	if !strings.Contains(strings.ReplaceAll(constraintDefinition, " ", ""), "result_version>=1") {
		t.Fatalf("unexpected result_version constraint: %s", constraintDefinition)
	}
}

func TestQuarantinedCartMutationKeyFailsClosedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	clientID := "cart-quarantine-client-" + suffix
	idempotencyKey := "cart-quarantine-key-" + suffix
	correlationID := "cart-quarantine-correlation-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_mutation_receipt_quarantine (
			id, client_id, idempotency_key, operation, request_fingerprint,
			correlation_id, result_version, result_deleted, result_json,
			original_created_at, quarantine_reason
		) VALUES (
			gen_random_uuid(), $1, $2, 'clear_cart', repeat('a', 64),
			$3, NULL, false, '{}'::jsonb, NOW(), 'invalid_result_version'
		)
	`, clientID, idempotencyKey, correlationID); err != nil {
		t.Fatalf("insert quarantined receipt fixture: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `
			DELETE FROM dsh_cart_mutation_receipt_quarantine
			WHERE client_id = $1 AND idempotency_key = $2
		`, clientID, idempotencyKey)
	})

	tx, receipt, err := beginCartMutation(
		ctx,
		db,
		clientID,
		MutationContext{
			IdempotencyKey: idempotencyKey,
			CorrelationID:  correlationID,
		},
		"clear_cart",
		strings.Repeat("b", 64),
	)
	if tx != nil || receipt != nil || !errors.Is(err, ErrMutationOutcomeUnknown) {
		t.Fatalf("quarantined key must fail closed before mutation: tx=%v receipt=%#v err=%v", tx, receipt, err)
	}

	if _, err := FindMutationReceiptWithOutcome(ctx, db, clientID, idempotencyKey); !errors.Is(err, ErrMutationOutcomeUnknown) {
		t.Fatalf("quarantined readback must report unknown outcome, got %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_mutation_receipts (
			client_id, idempotency_key, operation, request_fingerprint,
			correlation_id, result_version, result_deleted, result_json
		) VALUES ($1, $2, 'clear_cart', repeat('c', 64), $3, 1, true, '{}'::jsonb)
	`, clientID, idempotencyKey, correlationID); err == nil {
		t.Fatal("database fence allowed a canonical receipt to reuse a quarantined mutation key")
	} else if !strings.Contains(err.Error(), "DSH_CART_MUTATION_OUTCOME_UNKNOWN") {
		t.Fatalf("unexpected database fence error: %v", err)
	}

	var canonicalCount int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_cart_mutation_receipts
		WHERE client_id = $1 AND idempotency_key = $2
	`, clientID, idempotencyKey).Scan(&canonicalCount); err != nil {
		t.Fatalf("count canonical receipts: %v", err)
	}
	if canonicalCount != 0 {
		t.Fatalf("quarantined key unexpectedly produced %d canonical receipts", canonicalCount)
	}
}
