package clientaddress

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestClientAddressMutationOwnershipIsolation(t *testing.T) {
	db := openAddressIntegrationDB(t)
	ensureIntegrationServiceArea(t, db)
	ctx := context.Background()
	suffix := fmt.Sprintf("%08d", time.Now().UnixNano()%100000000)
	ownerID := "jrn005-owner-" + suffix
	intruderID := "jrn005-intruder-" + suffix

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_client_address_mutation_receipts WHERE client_id IN ($1,$2)`, ownerID, intruderID)
		_, _ = db.Exec(`DELETE FROM dsh_client_addresses WHERE client_id IN ($1,$2)`, ownerID, intruderID)
	})

	owned := insertIntegrationAddress(t, db, ownerID, suffix+"21", true)
	intruderOwned := insertIntegrationAddress(t, db, intruderID, suffix+"22", true)

	listed, err := List(ctx, db, intruderID)
	if err != nil {
		t.Fatalf("list intruder addresses: %v", err)
	}
	if len(listed) != 1 || listed[0].ID != intruderOwned.ID {
		t.Fatalf("intruder list leaked another client address: %+v", listed)
	}

	_, err = UpdateIdempotent(ctx, db, intruderID, owned.ID, UpdateInput{
		CreateInput:     integrationDraft(suffix+"23", true),
		ExpectedVersion: owned.Version,
	}, MutationContext{
		IdempotencyKey: "isolation-update:" + suffix,
		CorrelationID:  "corr-isolation-update-" + suffix,
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-client update error = %v, want ErrNotFound", err)
	}

	err = DeleteIdempotent(ctx, db, intruderID, owned.ID, owned.Version, MutationContext{
		IdempotencyKey: "isolation-delete:" + suffix,
		CorrelationID:  "corr-isolation-delete-" + suffix,
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-client delete error = %v, want ErrNotFound", err)
	}

	_, err = SetDefaultIdempotent(ctx, db, intruderID, owned.ID, owned.Version, MutationContext{
		IdempotencyKey: "isolation-default:" + suffix,
		CorrelationID:  "corr-isolation-default-" + suffix,
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-client set-default error = %v, want ErrNotFound", err)
	}

	var receiptCount int
	if err := db.QueryRow(`SELECT count(*) FROM dsh_client_address_mutation_receipts
		WHERE client_id=$1 AND idempotency_key LIKE 'isolation-%'`, intruderID).Scan(&receiptCount); err != nil {
		t.Fatalf("count isolation receipts: %v", err)
	}
	if receiptCount != 0 {
		t.Fatalf("failed cross-client mutations persisted %d receipts, want 0", receiptCount)
	}

	var ownerActive bool
	if err := db.QueryRow(`SELECT deleted_at IS NULL FROM dsh_client_addresses WHERE id=$1 AND client_id=$2`, owned.ID, ownerID).Scan(&ownerActive); err != nil {
		t.Fatalf("read owner address after isolation attempts: %v", err)
	}
	if !ownerActive {
		t.Fatal("cross-client mutation changed or deleted the owner address")
	}
}
