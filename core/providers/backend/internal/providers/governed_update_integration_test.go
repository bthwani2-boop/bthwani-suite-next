package providers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestGovernedProviderUpdateIsAtomicAuditedAndIdempotent(t *testing.T) {
	if os.Getenv("JRN039_DATABASE_TEST") != "1" {
		t.Skip("set JRN039_DATABASE_TEST=1 after applying provider migrations")
	}
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Fatal("DATABASE_URL is required for the governed provider integration test")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	const providerID = "jrn039-atomic-provider"
	cleanup := func() {
		_, _ = db.ExecContext(context.Background(), `DROP TRIGGER IF EXISTS jrn039_reject_provider_audit ON providers_action_audit`)
		_, _ = db.ExecContext(context.Background(), `DROP FUNCTION IF EXISTS jrn039_reject_provider_audit()`)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM providers_idempotency WHERE actor_id = 'jrn039-test-actor'`)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM providers_action_audit WHERE target_id = $1`, providerID)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM external_providers WHERE provider_id = $1`, providerID)
	}
	cleanup()
	defer cleanup()

	if _, err := db.ExecContext(ctx, `
		INSERT INTO external_providers (provider_id, kind, code, active, credentials, parameters)
		VALUES ($1, 'email', 'jrn039-atomic-email', false, '{"apiKey":"secret-value"}'::jsonb, '{"environment":"test"}'::jsonb)`,
		providerID,
	); err != nil {
		t.Fatalf("insert provider: %v", err)
	}

	repository := NewRepository(db)
	service := NewService(repository)
	active := true
	input := UpdateProviderInput{Active: &active}
	operator := Operator{ActorID: "jrn039-test-actor", Role: "operator"}

	first, err := service.UpdateProvider(ctx, providerID, input, operator, "jrn039-correlation-1", "jrn039-idempotency-1")
	if err != nil {
		t.Fatalf("first governed update: %v", err)
	}
	if !first.Active || !first.CredentialConfigured {
		t.Fatalf("unexpected safe response: %+v", first)
	}
	encoded, err := json.Marshal(first)
	if err != nil {
		t.Fatalf("marshal safe response: %v", err)
	}
	if strings.Contains(string(encoded), "secret-value") || strings.Contains(string(encoded), "credentials") {
		t.Fatalf("governed response leaked credentials: %s", encoded)
	}

	replay, err := service.UpdateProvider(ctx, providerID, input, operator, "jrn039-correlation-retry", "jrn039-idempotency-1")
	if err != nil {
		t.Fatalf("idempotent replay: %v", err)
	}
	if !replay.UpdatedAt.Equal(first.UpdatedAt) {
		t.Fatalf("replay did not return the original response: first=%s replay=%s", first.UpdatedAt, replay.UpdatedAt)
	}

	var auditCount, idempotencyCount int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM providers_action_audit WHERE target_id = $1`, providerID).Scan(&auditCount); err != nil {
		t.Fatalf("count audit rows: %v", err)
	}
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM providers_idempotency WHERE actor_id = $1 AND operation = 'provider.update'`, operator.ActorID).Scan(&idempotencyCount); err != nil {
		t.Fatalf("count idempotency rows: %v", err)
	}
	if auditCount != 1 || idempotencyCount != 1 {
		t.Fatalf("expected one atomic audit and idempotency row, got audit=%d idempotency=%d", auditCount, idempotencyCount)
	}

	inactive := false
	_, err = service.UpdateProvider(ctx, providerID, UpdateProviderInput{Active: &inactive}, operator, "jrn039-correlation-conflict", "jrn039-idempotency-1")
	if !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected idempotency conflict, got %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		CREATE FUNCTION jrn039_reject_provider_audit() RETURNS trigger AS $$
		BEGIN
			IF NEW.target_id = 'jrn039-atomic-provider' THEN
				RAISE EXCEPTION 'forced audit failure';
			END IF;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
		CREATE TRIGGER jrn039_reject_provider_audit
		BEFORE INSERT ON providers_action_audit
		FOR EACH ROW EXECUTE FUNCTION jrn039_reject_provider_audit();
	`); err != nil {
		t.Fatalf("install audit failure trigger: %v", err)
	}

	_, err = service.UpdateProvider(ctx, providerID, UpdateProviderInput{Active: &inactive}, operator, "jrn039-correlation-rollback", "jrn039-idempotency-rollback")
	if err == nil {
		t.Fatal("expected forced audit failure")
	}
	var persistedActive bool
	if err := db.QueryRowContext(ctx, `SELECT active FROM external_providers WHERE provider_id = $1`, providerID).Scan(&persistedActive); err != nil {
		t.Fatalf("read provider after forced audit failure: %v", err)
	}
	if !persistedActive {
		t.Fatal("provider mutation committed despite audit failure")
	}
	if err := db.QueryRowContext(ctx, `
		SELECT count(*) FROM providers_idempotency
		WHERE actor_id = $1 AND operation = 'provider.update' AND idempotency_key = 'jrn039-idempotency-rollback'`,
		operator.ActorID,
	).Scan(&idempotencyCount); err != nil {
		t.Fatalf("count rollback idempotency rows: %v", err)
	}
	if idempotencyCount != 0 {
		t.Fatalf("idempotency response committed despite audit failure: %d", idempotencyCount)
	}
}
