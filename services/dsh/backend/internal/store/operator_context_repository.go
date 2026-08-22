package store

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

var ErrStoreOperatorContextRequired = errors.New("trusted store OperatorContext context is required")

func normalizeStoreOperatorContextID(operatorContextID string) (string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return "", ErrStoreOperatorContextRequired
	}
	return operatorContextID, nil
}

// ListAllStoresForOperatorContext is the operator listing boundary for the partners and
// stores workspace. It never accepts a OperatorContext selector from the browser.
func ListAllStoresForOperatorContext(db *sql.DB, operatorContextID string, q DshStoreListQuery) (DshStoreListResult, error) {
	operatorContextID, err := normalizeStoreOperatorContextID(operatorContextID)
	if err != nil {
		return DshStoreListResult{}, err
	}
	conditions := []string{"operator_context_id = $1"}
	params := []any{operatorContextID}
	idx := 2
	add := func(column string, value any) {
		conditions = append(conditions, fmt.Sprintf("%s = $%d", column, idx))
		params = append(params, value)
		idx++
	}
	if q.CityCode != "" {
		add("city_code", q.CityCode)
	}
	if q.ServiceAreaCode != "" {
		add("service_area_code", q.ServiceAreaCode)
	}
	if q.Status != "" {
		add("status", q.Status)
	}
	if q.IsVisible != nil {
		add("is_visible", *q.IsVisible)
	}
	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM dsh_stores "+whereClause, params...).Scan(&total); err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to count OperatorContext stores: %w", err)
	}
	query := fmt.Sprintf(`SELECT %s FROM dsh_stores %s
		ORDER BY rating_average DESC NULLS LAST, display_name ASC
		LIMIT $%d OFFSET $%d`, storeColumns, whereClause, idx, idx+1)
	rows, err := db.Query(query, append(params, q.Limit, q.Offset)...)
	if err != nil {
		return DshStoreListResult{}, fmt.Errorf("failed to query OperatorContext stores: %w", err)
	}
	defer rows.Close()

	stores := make([]DshStoreSummary, 0)
	for rows.Next() {
		row, scanErr := scanStore(rows)
		if scanErr != nil {
			return DshStoreListResult{}, fmt.Errorf("failed to scan OperatorContext store row: %w", scanErr)
		}
		stores = append(stores, RowToSummary(row))
	}
	if err := rows.Err(); err != nil {
		return DshStoreListResult{}, fmt.Errorf("error reading OperatorContext stores: %w", err)
	}
	return DshStoreListResult{
		Stores: stores,
		Pagination: Pagination{
			Limit: q.Limit, Offset: q.Offset, Total: total,
		},
	}, nil
}

func GetStoreByIDInternalForOperatorContext(ctx context.Context, db *sql.DB, operatorContextID, storeID string) (*DshStoreRow, error) {
	operatorContextID, err := normalizeStoreOperatorContextID(operatorContextID)
	if err != nil {
		return nil, err
	}
	row, err := scanStore(db.QueryRowContext(ctx,
		"SELECT "+storeColumns+" FROM dsh_stores WHERE id = $1 AND operator_context_id = $2",
		storeID, operatorContextID,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrScopedStoreNotFound
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

var ErrFirstStoreReferenceMissing = errors.New("partner first-store reference is missing")

// EnsurePartnerFirstStoreReferenceTx records the first store only when the
// relationship is still unambiguous. Existing one-to-many partners are never
// guessed or reassigned by this helper.
func EnsurePartnerFirstStoreReferenceTx(ctx context.Context, tx *sql.Tx, partnerID, storeID, operatorContextID string) error {
	partnerID = strings.TrimSpace(partnerID)
	storeID = strings.TrimSpace(storeID)
	operatorContextID, err := normalizeStoreOperatorContextID(operatorContextID)
	if err != nil || partnerID == "" || storeID == "" {
		if err != nil {
			return err
		}
		return errors.New("partner and store identifiers are required")
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_partner_first_stores(partner_id, store_id, operator_context_id)
		SELECT $1, $2, $3
		WHERE EXISTS (
			SELECT 1 FROM dsh_stores
			WHERE id = $2 AND partner_id = $1 AND operator_context_id = $3
		)
		  AND NOT EXISTS (
			SELECT 1 FROM dsh_partner_first_stores WHERE partner_id = $1
		)
		  AND NOT EXISTS (
			SELECT 1 FROM dsh_stores WHERE partner_id = $1 AND id <> $2
		)
		ON CONFLICT (partner_id) DO NOTHING`, partnerID, storeID, operatorContextID)
	return err
}

func GetPartnerFirstStoreForOperatorContext(ctx context.Context, db *sql.DB, operatorContextID, partnerID string) (*DshStoreRow, error) {
	operatorContextID, err := normalizeStoreOperatorContextID(operatorContextID)
	if err != nil {
		return nil, err
	}
	row, err := scanStore(db.QueryRowContext(ctx, "SELECT "+storeColumns+` FROM dsh_stores
		WHERE id = (SELECT store_id FROM dsh_partner_first_stores
		           WHERE partner_id = $1 AND operator_context_id = $2)
		  AND operator_context_id = $2`, partnerID, operatorContextID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrFirstStoreReferenceMissing
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func CreateStoreForOperatorContextIdempotent(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	actorID string,
	idempotencyKey string,
	correlationID string,
	input CreateDraftStoreInput,
) (DshStoreRow, bool, error) {
	operatorContextID, err := normalizeStoreOperatorContextID(operatorContextID)
	if err != nil {
		return DshStoreRow{}, false, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return DshStoreRow{}, false, errors.New("idempotency key is required")
	}

	requestBytes, _ := json.Marshal(input)
	requestHash := fmt.Sprintf("%x", sha256.Sum256(requestBytes))

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return DshStoreRow{}, false, err
	}
	defer tx.Rollback()

	var replayHash string
	var replayJSON []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM dsh_store_idempotency
		WHERE actor_id = $1 AND operation = 'create-store' AND idempotency_key = $2
		FOR UPDATE`, actorID, idempotencyKey).Scan(&replayHash, &replayJSON)
	if err == nil {
		if replayHash != requestHash {
			return DshStoreRow{}, false, ErrIdempotencyConflict
		}
		var replay DshStoreRow
		if err := json.Unmarshal(replayJSON, &replay); err != nil {
			return DshStoreRow{}, false, err
		}
		return replay, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return DshStoreRow{}, false, err
	}

	// Verify partner ownership and active state
	var partnerStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT activation_status
		FROM dsh_partners
		WHERE id = $1 AND operator_context_id = $2`,
		input.PartnerID, operatorContextID,
	).Scan(&partnerStatus)

	if errors.Is(err, sql.ErrNoRows) {
		return DshStoreRow{}, false, errors.New("partner not found or does not belong to operator context")
	}
	if err != nil {
		return DshStoreRow{}, false, err
	}
	if partnerStatus != "client_visible" {
		return DshStoreRow{}, false, errors.New("partner must be client_visible to create a new store")
	}

	storeRow, err := CreateDraftStore(tx, input)
	if err != nil {
		return DshStoreRow{}, false, err
	}

	// Link store to operator_context_id explicitly
	if _, err = tx.ExecContext(ctx, `UPDATE dsh_stores SET operator_context_id = $1 WHERE id = $2`, operatorContextID, storeRow.ID); err != nil {
		return DshStoreRow{}, false, err
	}
	if err := EnsurePartnerFirstStoreReferenceTx(ctx, tx, input.PartnerID, storeRow.ID, operatorContextID); err != nil {
		return DshStoreRow{}, false, err
	}

	responseJSON, _ := json.Marshal(storeRow)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_store_idempotency
			(actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, 'create-store', $2, $3, $4::jsonb)`,
		actorID, idempotencyKey, requestHash, string(responseJSON))
	if err != nil {
		return DshStoreRow{}, false, err
	}

	if err := tx.Commit(); err != nil {
		return DshStoreRow{}, false, err
	}

	storeRow.PartnerActivationStatus = partnerStatus
	return storeRow, false, nil
}
