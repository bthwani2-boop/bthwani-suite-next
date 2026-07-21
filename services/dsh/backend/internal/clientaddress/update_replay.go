package clientaddress

import (
	"context"
	"database/sql"
	"strings"
)

// FindUpdateReplay checks the durable mutation receipt before any mutable
// service-area validation. This preserves idempotency when an address update was
// committed but its HTTP response was lost and the service-area configuration
// changed before the client retried.
func FindUpdateReplay(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	addressID string,
	raw UpdateInput,
	mutation MutationContext,
) (*Address, bool, error) {
	input, err := normalize(raw.CreateInput)
	if err != nil || validateMutationContext(clientID, addressID, raw.ExpectedVersion, mutation) != nil {
		return nil, false, ErrInvalid
	}
	requestFingerprint, err := fingerprintMutation(struct {
		AddressID       string      `json:"addressId"`
		ExpectedVersion int         `json:"expectedVersion"`
		Input           CreateInput `json:"input"`
	}{strings.TrimSpace(addressID), raw.ExpectedVersion, input})
	if err != nil {
		return nil, false, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return nil, false, err
	}
	receipt, found, err := loadMutationReceipt(ctx, tx, clientID, mutation, "update", requestFingerprint)
	if err != nil {
		return nil, false, err
	}
	if !found {
		return nil, false, nil
	}
	address, err := replayAddressMutation(ctx, tx, clientID, receipt)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return address, true, nil
}
