package clientaddress

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

const integrationServiceAreaCode = "jrn005-integration-area"

func openAddressIntegrationDB(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := os.Getenv("DSH_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DSH_TEST_DATABASE_URL is not configured")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}
	if err := db.PingContext(context.Background()); err != nil {
		db.Close()
		t.Fatalf("ping postgres: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func ensureIntegrationServiceArea(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`INSERT INTO dsh_service_area_geofences
		(service_area_code, display_name, polygon, active, priority)
		VALUES ($1, 'JRN-005 integration area', '[[44,15],[45,15],[45,16],[44,16]]'::jsonb, TRUE, 1000)
		ON CONFLICT (service_area_code) DO UPDATE SET
			display_name = EXCLUDED.display_name,
			polygon = EXCLUDED.polygon,
			active = TRUE,
			priority = EXCLUDED.priority,
			version = dsh_service_area_geofences.version + 1,
			updated_at = NOW()`, integrationServiceAreaCode)
	if err != nil {
		t.Fatalf("ensure integration service area: %v", err)
	}
}

func integrationPhone(suffix string, prefix string) string {
	if len(suffix) > 7 {
		suffix = suffix[len(suffix)-7:]
	}
	return "+967" + prefix + suffix
}

func insertIntegrationAddress(t *testing.T, db *sql.DB, clientID, suffix string, makeDefault bool) *Address {
	t.Helper()
	address, err := scanAddress(db.QueryRowContext(context.Background(), `INSERT INTO dsh_client_addresses
		(client_id, label, recipient_name, phone_e164, address_line, service_area_code,
		 building, floor, unit, delivery_instructions, latitude, longitude, is_default, create_idempotency_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING `+addressColumns,
		clientID,
		"label-"+suffix,
		"Recipient "+suffix,
		integrationPhone(suffix, "70"),
		"Integration address "+suffix,
		integrationServiceAreaCode,
		"building-"+suffix,
		"1",
		"unit-"+suffix,
		"instruction-"+suffix,
		15.3,
		44.2,
		makeDefault,
		"integration-create:"+suffix,
	))
	if err != nil {
		t.Fatalf("insert integration address: %v", err)
	}
	return address
}

func integrationDraft(suffix string, makeDefault bool) CreateInput {
	return CreateInput{
		Label:                "updated-" + suffix,
		RecipientName:        "Updated Recipient " + suffix,
		PhoneE164:            integrationPhone(suffix, "71"),
		AddressLine:          "Updated integration address " + suffix,
		ServiceAreaCode:      integrationServiceAreaCode,
		Building:             stringPointer("updated-building-" + suffix),
		Floor:                stringPointer("2"),
		Unit:                 stringPointer("updated-unit-" + suffix),
		DeliveryInstructions: stringPointer("updated-instruction-" + suffix),
		Latitude:             floatPointer(15.31),
		Longitude:            floatPointer(44.21),
		MakeDefault:          makeDefault,
	}
}

func stringPointer(value string) *string  { return &value }
func floatPointer(value float64) *float64 { return &value }

func eventCount(t *testing.T, db *sql.DB, clientID, addressID, action string) int {
	t.Helper()
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM dsh_client_address_events
		WHERE client_id=$1 AND address_id=$2 AND action=$3`, clientID, addressID, action).Scan(&count); err != nil {
		t.Fatalf("count %s events: %v", action, err)
	}
	return count
}

func TestIdempotentAddressMutationsAreExactlyOnceAndClientScoped(t *testing.T) {
	db := openAddressIntegrationDB(t)
	ensureIntegrationServiceArea(t, db)
	ctx := context.Background()
	suffix := fmt.Sprintf("%08d", time.Now().UnixNano()%100000000)
	clientA := "jrn005-client-a-" + suffix
	clientB := "jrn005-client-b-" + suffix

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_client_address_mutation_receipts WHERE client_id IN ($1,$2)`, clientA, clientB)
		_, _ = db.Exec(`DELETE FROM dsh_client_addresses WHERE client_id IN ($1,$2)`, clientA, clientB)
	})

	first := insertIntegrationAddress(t, db, clientA, suffix+"01", true)
	second := insertIntegrationAddress(t, db, clientA, suffix+"02", false)
	otherClient := insertIntegrationAddress(t, db, clientB, suffix+"03", true)

	updateKey := "address-update:shared:" + suffix
	updated, err := UpdateIdempotent(ctx, db, clientA, first.ID, UpdateInput{
		CreateInput:     integrationDraft(suffix+"11", true),
		ExpectedVersion: first.Version,
	}, MutationContext{IdempotencyKey: updateKey, CorrelationID: "corr-update-" + suffix})
	if err != nil {
		t.Fatalf("first update: %v", err)
	}
	if updated.Version != first.Version+1 {
		t.Fatalf("updated version = %d, want %d", updated.Version, first.Version+1)
	}

	replayed, err := UpdateIdempotent(ctx, db, clientA, first.ID, UpdateInput{
		CreateInput:     integrationDraft(suffix+"11", true),
		ExpectedVersion: first.Version,
	}, MutationContext{IdempotencyKey: updateKey, CorrelationID: "corr-update-replay-" + suffix})
	if err != nil {
		t.Fatalf("update replay: %v", err)
	}
	if replayed.Version != updated.Version {
		t.Fatalf("replayed version = %d, want %d", replayed.Version, updated.Version)
	}
	if got := eventCount(t, db, clientA, first.ID, "updated"); got != 1 {
		t.Fatalf("updated events = %d, want 1", got)
	}

	_, err = UpdateIdempotent(ctx, db, clientA, first.ID, UpdateInput{
		CreateInput:     integrationDraft(suffix+"12", true),
		ExpectedVersion: first.Version,
	}, MutationContext{IdempotencyKey: updateKey, CorrelationID: "corr-update-conflict-" + suffix})
	if !errors.Is(err, ErrMutationIdempotencyConflict) {
		t.Fatalf("different request with same key error = %v, want ErrMutationIdempotencyConflict", err)
	}

	otherUpdated, err := UpdateIdempotent(ctx, db, clientB, otherClient.ID, UpdateInput{
		CreateInput:     integrationDraft(suffix+"13", true),
		ExpectedVersion: otherClient.Version,
	}, MutationContext{IdempotencyKey: updateKey, CorrelationID: "corr-other-client-" + suffix})
	if err != nil {
		t.Fatalf("same key for another client: %v", err)
	}
	if otherUpdated.Version != otherClient.Version+1 {
		t.Fatalf("other client version = %d, want %d", otherUpdated.Version, otherClient.Version+1)
	}

	defaultKey := "address-default:" + suffix
	defaulted, err := SetDefaultIdempotent(ctx, db, clientA, second.ID, second.Version, MutationContext{
		IdempotencyKey: defaultKey,
		CorrelationID:  "corr-default-" + suffix,
	})
	if err != nil {
		t.Fatalf("set default: %v", err)
	}
	defaultReplay, err := SetDefaultIdempotent(ctx, db, clientA, second.ID, second.Version, MutationContext{
		IdempotencyKey: defaultKey,
		CorrelationID:  "corr-default-replay-" + suffix,
	})
	if err != nil {
		t.Fatalf("set default replay: %v", err)
	}
	if defaultReplay.Version != defaulted.Version {
		t.Fatalf("default replay version = %d, want %d", defaultReplay.Version, defaulted.Version)
	}
	if got := eventCount(t, db, clientA, second.ID, "defaulted"); got != 1 {
		t.Fatalf("defaulted events = %d, want 1", got)
	}

	deleteKey := "address-delete:" + suffix
	if err := DeleteIdempotent(ctx, db, clientA, second.ID, defaulted.Version, MutationContext{
		IdempotencyKey: deleteKey,
		CorrelationID:  "corr-delete-" + suffix,
	}); err != nil {
		t.Fatalf("delete default address: %v", err)
	}
	if err := DeleteIdempotent(ctx, db, clientA, second.ID, defaulted.Version, MutationContext{
		IdempotencyKey: deleteKey,
		CorrelationID:  "corr-delete-replay-" + suffix,
	}); err != nil {
		t.Fatalf("delete replay: %v", err)
	}
	if got := eventCount(t, db, clientA, second.ID, "deleted"); got != 1 {
		t.Fatalf("deleted events = %d, want 1", got)
	}

	var activeCount, defaultCount int
	if err := db.QueryRow(`SELECT count(*), count(*) FILTER (WHERE is_default)
		FROM dsh_client_addresses WHERE client_id=$1 AND deleted_at IS NULL`, clientA).Scan(&activeCount, &defaultCount); err != nil {
		t.Fatalf("read active/default counts: %v", err)
	}
	if activeCount != 1 || defaultCount != 1 {
		t.Fatalf("active=%d default=%d, want active=1 default=1", activeCount, defaultCount)
	}
	if got := eventCount(t, db, clientA, first.ID, "defaulted"); got != 1 {
		t.Fatalf("promoted default events = %d, want 1", got)
	}
}
