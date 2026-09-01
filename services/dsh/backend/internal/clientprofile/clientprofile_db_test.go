package clientprofile

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openRequiredClientProfileDB(t *testing.T) *sql.DB {
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

func TestClientProfileMutationsReplayWithoutDuplicateWriteDBIntegration(t *testing.T) {
	db := openRequiredClientProfileDB(t)
	ctx := context.Background()
	clientID := "client-profile-idempotency-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	preferencesMutation := MutationContext{
		IdempotencyKey: "client-profile-preferences-command-" + clientID,
		CorrelationID:  "client-profile-preferences-correlation-" + clientID,
	}
	consentsMutation := MutationContext{
		IdempotencyKey: "client-profile-consents-command-" + clientID,
		CorrelationID:  "client-profile-consents-correlation-" + clientID,
	}

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_client_profile_mutation_receipts WHERE client_id = $1`, clientID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_client_profile_events WHERE client_id = $1`, clientID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_client_profiles WHERE client_id = $1`, clientID)
	})

	preferences := ClientProfilePreferencesInput{Locale: "en", CurrencyPreference: DefaultCurrencyPreference}
	first, err := UpsertClientProfilePreferences(ctx, db, clientID, preferences, preferencesMutation)
	if err != nil {
		t.Fatalf("first preferences mutation failed: %v", err)
	}
	if first.Locale != "en" || first.CurrencyPreference != DefaultCurrencyPreference || first.Version != 1 {
		t.Fatalf("first profile = %#v, want version 1 with requested preferences", first)
	}

	replay, err := UpsertClientProfilePreferences(ctx, db, clientID, preferences, preferencesMutation)
	if err != nil {
		t.Fatalf("replaying preferences mutation failed: %v", err)
	}
	if replay != first {
		t.Fatalf("replay profile = %#v, want original profile %#v", replay, first)
	}

	var eventCount, receiptCount int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM dsh_client_profile_events WHERE client_id = $1`, clientID).Scan(&eventCount); err != nil {
		t.Fatalf("failed to count profile events: %v", err)
	}
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM dsh_client_profile_mutation_receipts WHERE client_id = $1`, clientID).Scan(&receiptCount); err != nil {
		t.Fatalf("failed to count profile mutation receipts: %v", err)
	}
	if eventCount != 1 || receiptCount != 1 {
		t.Fatalf("replay created %d events and %d receipts, want one of each", eventCount, receiptCount)
	}

	differentPreferences := ClientProfilePreferencesInput{Locale: "ar", CurrencyPreference: DefaultCurrencyPreference}
	if _, err := UpsertClientProfilePreferences(ctx, db, clientID, differentPreferences, preferencesMutation); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("reusing key for another preferences mutation returned %v, want ErrIdempotencyConflict", err)
	}

	consents := ClientProfileConsentsInput{
		MarketingConsentEmail: true,
		MarketingConsentSms:   true,
		MarketingConsentPush:  false,
		ExpectedVersion:       first.Version,
	}
	updated, err := UpsertClientProfileConsents(ctx, db, clientID, consents, consentsMutation)
	if err != nil {
		t.Fatalf("consents mutation failed: %v", err)
	}
	if !updated.MarketingConsentEmail || !updated.MarketingConsentSms || updated.Version != 2 {
		t.Fatalf("updated profile = %#v, want consent changes at version 2", updated)
	}

	stale := consents
	stale.MarketingConsentPush = true
	stale.ExpectedVersion = first.Version
	if _, err := UpsertClientProfileConsents(ctx, db, clientID, stale, MutationContext{
		IdempotencyKey: "client-profile-stale-command-" + clientID,
		CorrelationID:  "client-profile-stale-correlation-" + clientID,
	}); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale consent mutation returned %v, want ErrConflict", err)
	}

	canonical, err := GetClientProfile(ctx, db, clientID)
	if err != nil {
		t.Fatalf("canonical profile readback failed: %v", err)
	}
	if canonical != updated {
		t.Fatalf("canonical profile = %#v, want %#v", canonical, updated)
	}
}
