package clientaddress

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

var ErrMutationIdempotencyConflict = errors.New("client address mutation idempotency conflict")

type mutationReceipt struct {
	Operation          string
	RequestFingerprint string
	AddressID          string
	ResultVersion      sql.NullInt64
	ResultDeleted      bool
}

func fingerprintMutation(value any) (string, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("marshal client address mutation fingerprint: %w", err)
	}
	digest := sha256.Sum256(encoded)
	return hex.EncodeToString(digest[:]), nil
}

func loadMutationReceipt(
	ctx context.Context,
	tx *sql.Tx,
	clientID string,
	mutation MutationContext,
	operation string,
	requestFingerprint string,
) (mutationReceipt, bool, error) {
	var receipt mutationReceipt
	err := tx.QueryRowContext(ctx, `SELECT operation, request_fingerprint, address_id, result_version, result_deleted
		FROM dsh_client_address_mutation_receipts
		WHERE client_id = $1 AND idempotency_key = $2`,
		strings.TrimSpace(clientID), strings.TrimSpace(mutation.IdempotencyKey),
	).Scan(
		&receipt.Operation,
		&receipt.RequestFingerprint,
		&receipt.AddressID,
		&receipt.ResultVersion,
		&receipt.ResultDeleted,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return mutationReceipt{}, false, nil
	}
	if err != nil {
		return mutationReceipt{}, false, err
	}
	if receipt.Operation != operation || receipt.RequestFingerprint != requestFingerprint {
		return mutationReceipt{}, false, ErrMutationIdempotencyConflict
	}
	return receipt, true, nil
}

func saveMutationReceipt(
	ctx context.Context,
	tx *sql.Tx,
	clientID string,
	mutation MutationContext,
	operation string,
	requestFingerprint string,
	addressID string,
	resultVersion any,
	resultDeleted bool,
) error {
	_, err := tx.ExecContext(ctx, `INSERT INTO dsh_client_address_mutation_receipts
		(client_id, idempotency_key, operation, request_fingerprint, address_id, result_version, result_deleted, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, ''))`,
		strings.TrimSpace(clientID),
		strings.TrimSpace(mutation.IdempotencyKey),
		operation,
		requestFingerprint,
		strings.TrimSpace(addressID),
		resultVersion,
		resultDeleted,
		strings.TrimSpace(mutation.CorrelationID),
	)
	return err
}

func replayAddressMutation(ctx context.Context, tx *sql.Tx, clientID string, receipt mutationReceipt) (*Address, error) {
	if receipt.ResultDeleted {
		return nil, nil
	}
	address, err := scanAddress(tx.QueryRowContext(ctx, `SELECT `+addressColumns+`
		FROM dsh_client_addresses
		WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL`, receipt.AddressID, strings.TrimSpace(clientID)))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return address, err
}

func validateMutationContext(clientID, addressID string, expectedVersion int, mutation MutationContext) error {
	if strings.TrimSpace(clientID) == "" || strings.TrimSpace(addressID) == "" || expectedVersion < 1 {
		return ErrInvalid
	}
	if key := strings.TrimSpace(mutation.IdempotencyKey); len(key) < 8 || len(key) > 200 {
		return ErrInvalid
	}
	return nil
}

// UpdateIdempotent applies an address update exactly once for a client-scoped
// idempotency key. A replay returns the latest committed representation without
// applying the update or incrementing versions again.
func UpdateIdempotent(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	addressID string,
	raw UpdateInput,
	mutation MutationContext,
) (*Address, error) {
	input, err := normalize(raw.CreateInput)
	if err != nil || validateMutationContext(clientID, addressID, raw.ExpectedVersion, mutation) != nil {
		return nil, ErrInvalid
	}
	requestFingerprint, err := fingerprintMutation(struct {
		AddressID       string      `json:"addressId"`
		ExpectedVersion int         `json:"expectedVersion"`
		Input           CreateInput `json:"input"`
	}{strings.TrimSpace(addressID), raw.ExpectedVersion, input})
	if err != nil {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return nil, err
	}

	receipt, found, err := loadMutationReceipt(ctx, tx, clientID, mutation, "update", requestFingerprint)
	if err != nil {
		return nil, err
	}
	if found {
		address, replayErr := replayAddressMutation(ctx, tx, clientID, receipt)
		if replayErr != nil {
			return nil, replayErr
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return address, nil
	}

	var currentDefault bool
	var currentVersion int
	if err := tx.QueryRowContext(ctx, `SELECT is_default, version FROM dsh_client_addresses
		WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL FOR UPDATE`,
		strings.TrimSpace(addressID), strings.TrimSpace(clientID),
	).Scan(&currentDefault, &currentVersion); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if currentVersion != raw.ExpectedVersion {
		return nil, ErrConflict
	}

	makeDefault := currentDefault || input.MakeDefault
	if input.MakeDefault {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses
			SET is_default = FALSE, version = version + 1, updated_at = NOW()
			WHERE client_id = $1 AND id <> $2 AND deleted_at IS NULL AND is_default = TRUE`,
			strings.TrimSpace(clientID), strings.TrimSpace(addressID),
		); err != nil {
			return nil, err
		}
	}

	address, err := scanAddress(tx.QueryRowContext(ctx, `UPDATE dsh_client_addresses SET
		label=$1, recipient_name=$2, phone_e164=$3, address_line=$4, service_area_code=$5,
		building=$6, floor=$7, unit=$8, delivery_instructions=$9, latitude=$10, longitude=$11,
		is_default=$12, version=version+1, updated_at=NOW()
		WHERE id=$13 AND client_id=$14 AND deleted_at IS NULL AND version=$15
		RETURNING `+addressColumns,
		input.Label, input.RecipientName, input.PhoneE164, input.AddressLine, input.ServiceAreaCode,
		input.Building, input.Floor, input.Unit, input.DeliveryInstructions, input.Latitude, input.Longitude,
		makeDefault, strings.TrimSpace(addressID), strings.TrimSpace(clientID), raw.ExpectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	if err := recordEvent(ctx, tx, address.ID, clientID, "updated", address.Version, mutation.CorrelationID); err != nil {
		return nil, err
	}
	if err := saveMutationReceipt(ctx, tx, clientID, mutation, "update", requestFingerprint, address.ID, address.Version, false); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return address, nil
}

// SetDefaultIdempotent changes the sole default address under optimistic
// concurrency and records a durable replay receipt in the same transaction.
func SetDefaultIdempotent(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	addressID string,
	expectedVersion int,
	mutation MutationContext,
) (*Address, error) {
	if err := validateMutationContext(clientID, addressID, expectedVersion, mutation); err != nil {
		return nil, err
	}
	requestFingerprint, err := fingerprintMutation(struct {
		AddressID       string `json:"addressId"`
		ExpectedVersion int    `json:"expectedVersion"`
	}{strings.TrimSpace(addressID), expectedVersion})
	if err != nil {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return nil, err
	}

	receipt, found, err := loadMutationReceipt(ctx, tx, clientID, mutation, "set_default", requestFingerprint)
	if err != nil {
		return nil, err
	}
	if found {
		address, replayErr := replayAddressMutation(ctx, tx, clientID, receipt)
		if replayErr != nil {
			return nil, replayErr
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return address, nil
	}

	current, err := scanAddress(tx.QueryRowContext(ctx, `SELECT `+addressColumns+` FROM dsh_client_addresses
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL FOR UPDATE`,
		strings.TrimSpace(addressID), strings.TrimSpace(clientID),
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if current.Version != expectedVersion {
		return nil, ErrConflict
	}
	if current.IsDefault {
		if err := saveMutationReceipt(ctx, tx, clientID, mutation, "set_default", requestFingerprint, current.ID, current.Version, false); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return current, nil
	}

	if _, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses
		SET is_default=FALSE, version=version+1, updated_at=NOW()
		WHERE client_id=$1 AND id<>$2 AND deleted_at IS NULL AND is_default=TRUE`,
		strings.TrimSpace(clientID), strings.TrimSpace(addressID),
	); err != nil {
		return nil, err
	}
	address, err := scanAddress(tx.QueryRowContext(ctx, `UPDATE dsh_client_addresses
		SET is_default=TRUE, version=version+1, updated_at=NOW()
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL AND version=$3
		RETURNING `+addressColumns,
		strings.TrimSpace(addressID), strings.TrimSpace(clientID), expectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	if err := recordEvent(ctx, tx, address.ID, clientID, "defaulted", address.Version, mutation.CorrelationID); err != nil {
		return nil, err
	}
	if err := saveMutationReceipt(ctx, tx, clientID, mutation, "set_default", requestFingerprint, address.ID, address.Version, false); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return address, nil
}

// DeleteIdempotent soft-deletes once and records both the delete and any
// deterministic default promotion before committing the replay receipt.
func DeleteIdempotent(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	addressID string,
	expectedVersion int,
	mutation MutationContext,
) error {
	if err := validateMutationContext(clientID, addressID, expectedVersion, mutation); err != nil {
		return err
	}
	requestFingerprint, err := fingerprintMutation(struct {
		AddressID       string `json:"addressId"`
		ExpectedVersion int    `json:"expectedVersion"`
	}{strings.TrimSpace(addressID), expectedVersion})
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return err
	}

	_, found, err := loadMutationReceipt(ctx, tx, clientID, mutation, "delete", requestFingerprint)
	if err != nil {
		return err
	}
	if found {
		return tx.Commit()
	}

	var currentDefault bool
	var currentVersion int
	if err := tx.QueryRowContext(ctx, `SELECT is_default, version FROM dsh_client_addresses
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL FOR UPDATE`,
		strings.TrimSpace(addressID), strings.TrimSpace(clientID),
	).Scan(&currentDefault, &currentVersion); errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return err
	}
	if currentVersion != expectedVersion {
		return ErrConflict
	}

	result, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses
		SET deleted_at=NOW(), is_default=FALSE, version=version+1, updated_at=NOW()
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL AND version=$3`,
		strings.TrimSpace(addressID), strings.TrimSpace(clientID), expectedVersion,
	)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return ErrConflict
	}
	newVersion := expectedVersion + 1

	if currentDefault {
		var promotedID string
		var promotedVersion int
		err := tx.QueryRowContext(ctx, `UPDATE dsh_client_addresses
			SET is_default=TRUE, version=version+1, updated_at=NOW()
			WHERE id=(
				SELECT id FROM dsh_client_addresses
				WHERE client_id=$1 AND deleted_at IS NULL
				ORDER BY updated_at DESC, id ASC LIMIT 1
			)
			RETURNING id, version`, strings.TrimSpace(clientID)).Scan(&promotedID, &promotedVersion)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if err == nil {
			if err := recordEvent(ctx, tx, promotedID, clientID, "defaulted", promotedVersion, mutation.CorrelationID); err != nil {
				return err
			}
		}
	}
	if err := recordEvent(ctx, tx, addressID, clientID, "deleted", newVersion, mutation.CorrelationID); err != nil {
		return err
	}
	if err := saveMutationReceipt(ctx, tx, clientID, mutation, "delete", requestFingerprint, addressID, newVersion, true); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit idempotent client address delete: %w", err)
	}
	return nil
}
