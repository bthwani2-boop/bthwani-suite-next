package cart

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
)

var ErrIdempotencyConflict = errors.New("cart idempotency key was reused with a different mutation")

type MutationContext struct {
	IdempotencyKey string
	CorrelationID  string
	DeviceID       string
	SessionID      string
}

type MutationResult struct {
	CartID        string
	Item          *CartItem
	Version       int
	ResultDeleted bool
	Replayed      bool
}

type mutationReceiptRecord struct {
	Operation          string
	RequestFingerprint string
	CartID             sql.NullString
	ItemID             sql.NullString
	ResultVersion      int
	ResultDeleted      bool
	ResponseJSON       []byte
}

func validateMutationContext(mutation MutationContext) error {
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	if len(mutation.IdempotencyKey) < 8 || len(mutation.IdempotencyKey) > 200 {
		return ErrInvalid
	}
	if len(mutation.CorrelationID) < 8 || len(mutation.CorrelationID) > 200 {
		return ErrInvalid
	}
	return nil
}

func canonicalOptions(options []string) []string {
	if len(options) == 0 {
		return []string{}
	}
	result := append([]string(nil), options...)
	sort.Strings(result)
	return result
}

func cartMutationFingerprint(value any) (string, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(encoded)
	return hex.EncodeToString(hash[:]), nil
}

func validateUpsertItemInput(input UpsertItemInput) error {
	if strings.TrimSpace(input.MasterProductID) == "" || input.Quantity < 1 || len(input.Note) > 500 {
		return ErrInvalid
	}
	if input.FulfillmentMode != nil &&
		*input.FulfillmentMode != ModeBthwaniDelivery &&
		*input.FulfillmentMode != ModePartnerDelivery &&
		*input.FulfillmentMode != ModePickup {
		return ErrInvalid
	}
	return nil
}

func beginCartMutation(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	mutation MutationContext,
	operation string,
	fingerprint string,
) (*sql.Tx, *mutationReceiptRecord, error) {
	clientID = strings.TrimSpace(clientID)
	if clientID == "" || db == nil || operation == "" || fingerprint == "" {
		return nil, nil, ErrInvalid
	}
	if err := validateMutationContext(mutation); err != nil {
		return nil, nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	rollback := func(cause error) (*sql.Tx, *mutationReceiptRecord, error) {
		_ = tx.Rollback()
		return nil, nil, cause
	}
	if _, err := tx.ExecContext(ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		"dsh-cart-mutation:"+clientID+"\x1f"+mutation.IdempotencyKey,
	); err != nil {
		return rollback(err)
	}

	quarantined, err := mutationOutcomeQuarantinedTx(ctx, tx, clientID, mutation.IdempotencyKey)
	if err != nil {
		return rollback(err)
	}
	if quarantined {
		return rollback(ErrMutationOutcomeUnknown)
	}

	receipt, found, err := loadMutationReceiptTx(ctx, tx, clientID, mutation.IdempotencyKey)
	if err != nil {
		return rollback(err)
	}
	if found {
		if receipt.Operation != operation || receipt.RequestFingerprint != fingerprint {
			return rollback(ErrIdempotencyConflict)
		}
	}
	return tx, receipt, nil
}

func loadMutationReceiptTx(
	ctx context.Context,
	tx *sql.Tx,
	clientID string,
	idempotencyKey string,
) (*mutationReceiptRecord, bool, error) {
	receipt := &mutationReceiptRecord{}
	err := tx.QueryRowContext(ctx, `
		SELECT operation, request_fingerprint, cart_id::text, item_id::text,
		       result_version, result_deleted, result_json
		FROM dsh_cart_mutation_receipts
		WHERE client_id = $1 AND idempotency_key = $2
		FOR UPDATE`, clientID, idempotencyKey).Scan(
		&receipt.Operation,
		&receipt.RequestFingerprint,
		&receipt.CartID,
		&receipt.ItemID,
		&receipt.ResultVersion,
		&receipt.ResultDeleted,
		&receipt.ResponseJSON,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return receipt, true, nil
}

func replayCartMutation(receipt *mutationReceiptRecord, operation string) (*MutationResult, error) {
	if receipt == nil || receipt.Operation != operation {
		return nil, ErrIdempotencyConflict
	}
	result := &MutationResult{
		Version:       receipt.ResultVersion,
		ResultDeleted: receipt.ResultDeleted,
		Replayed:      true,
	}
	if receipt.CartID.Valid {
		result.CartID = receipt.CartID.String
	}
	if operation == "add_item" {
		var response struct {
			CartID string    `json:"cartId"`
			Item   *CartItem `json:"item"`
		}
		if err := json.Unmarshal(receipt.ResponseJSON, &response); err != nil || response.Item == nil {
			if err != nil {
				return nil, fmt.Errorf("stored cart mutation response is invalid: %w", err)
			}
			return nil, errors.New("stored cart mutation response does not contain an item")
		}
		result.CartID = response.CartID
		result.Item = response.Item
	}
	return result, nil
}

func recordMutationReceiptTx(
	ctx context.Context,
	tx *sql.Tx,
	clientID string,
	mutation MutationContext,
	operation string,
	fingerprint string,
	cartID string,
	itemID string,
	version int,
	resultDeleted bool,
	response any,
) error {
	responseJSON, err := json.Marshal(response)
	if err != nil {
		return err
	}
	var cartArg any
	if strings.TrimSpace(cartID) != "" {
		cartArg = strings.TrimSpace(cartID)
	}
	var itemArg any
	if strings.TrimSpace(itemID) != "" {
		itemArg = strings.TrimSpace(itemID)
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_cart_mutation_receipts (
			client_id, idempotency_key, operation, request_fingerprint,
			correlation_id, cart_id, item_id, result_version, result_deleted,
			result_json, device_id, session_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NULLIF($11, ''), NULLIF($12, ''))`,
		clientID,
		mutation.IdempotencyKey,
		operation,
		fingerprint,
		mutation.CorrelationID,
		cartArg,
		itemArg,
		version,
		resultDeleted,
		string(responseJSON),
		strings.TrimSpace(mutation.DeviceID),
		strings.TrimSpace(mutation.SessionID),
	)
	return err
}

func getOrCreateSingleStoreCartTx(
	ctx context.Context,
	tx *sql.Tx,
	clientID string,
	storeID string,
	mode FulfillmentMode,
	expectedVersion *int,
) (*Cart, error) {
	clientID = strings.TrimSpace(clientID)
	storeID = strings.TrimSpace(storeID)
	if clientID == "" || storeID == "" {
		return nil, ErrInvalid
	}
	if mode == "" {
		mode = ModeBthwaniDelivery
	}
	if mode != ModeBthwaniDelivery && mode != ModePartnerDelivery && mode != ModePickup {
		return nil, ErrInvalid
	}
	if _, err := tx.ExecContext(ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		"dsh-active-cart:"+clientID,
	); err != nil {
		return nil, err
	}

	var current Cart
	err := tx.QueryRowContext(ctx, `
		SELECT id::text, client_id, store_id, fulfillment_mode, state, note,
		       version, created_at, updated_at
		FROM dsh_carts
		WHERE client_id = $1 AND state = 'active'
		ORDER BY updated_at DESC, id DESC
		LIMIT 1
		FOR UPDATE`, clientID).Scan(
		&current.ID,
		&current.ClientID,
		&current.StoreID,
		&current.FulfillmentMode,
		&current.State,
		&current.Note,
		&current.Version,
		&current.CreatedAt,
		&current.UpdatedAt,
	)
	if err == nil {
		if current.StoreID != storeID {
			return nil, &StoreConflictError{ActiveCartID: current.ID, ActiveStoreID: current.StoreID}
		}
		if expectedVersion != nil && current.Version != *expectedVersion {
			return nil, ErrConflict
		}
		current.Items = []CartItem{}
		return &current, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var created Cart
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode)
		VALUES ($1, $2, $3)
		RETURNING id::text, client_id, store_id, fulfillment_mode, state, note,
		          version, created_at, updated_at`,
		clientID, storeID, mode).Scan(
		&created.ID,
		&created.ClientID,
		&created.StoreID,
		&created.FulfillmentMode,
		&created.State,
		&created.Note,
		&created.Version,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	created.Items = []CartItem{}
	return &created, nil
}

func upsertItemTx(ctx context.Context, tx *sql.Tx, storeID, cartID string, input UpsertItemInput) (*CartItem, error) {
	if err := validateUpsertItemInput(input); err != nil {
		return nil, err
	}
	var currentVersion int
	err := tx.QueryRowContext(ctx, `
		SELECT version
		FROM dsh_carts
		WHERE id = $1 AND store_id = $2 AND state = 'active'
		FOR UPDATE`, cartID, storeID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if input.ExpectedVersion != nil && currentVersion != *input.ExpectedVersion {
		return nil, ErrConflict
	}

	var assortmentID, name, currency string
	var unitPriceMinorUnits int64
	var purchasable bool
	err = tx.QueryRowContext(ctx, `
		SELECT
			a.id,
			mp.canonical_name_ar,
			COALESCE(p.amount_minor, 0),
			COALESCE(p.currency, ''),
			CASE
				WHEN c.id IS NULL THEN FALSE
				WHEN a.publication_status <> 'client_visible' OR a.paused_at IS NOT NULL THEN FALSE
				WHEN mp.approval_status <> 'approved' OR mp.is_active IS NOT TRUE THEN FALSE
				WHEN p.amount_minor IS NULL OR p.amount_minor <= 0 OR length(trim(p.currency)) <> 3 THEN FALSE
				WHEN i.store_assortment_id IS NULL OR i.step_quantity < 1 THEN FALSE
				WHEN $3 < i.min_order_quantity OR $3 > i.max_order_quantity THEN FALSE
				WHEN MOD($3 - i.min_order_quantity, i.step_quantity) <> 0 THEN FALSE
				WHEN i.policy_type = 'signal' AND i.quantity > 0 THEN TRUE
				WHEN i.policy_type = 'quantity' AND (i.quantity - i.reserved_quantity) >= $3 THEN TRUE
				WHEN i.policy_type = 'infinite' THEN TRUE
				ELSE FALSE
			END AS purchasable
		FROM dsh_store_assortments a
		JOIN dsh_master_products mp ON mp.id = a.master_product_id
		LEFT JOIN dsh_carts c
		  ON c.id = $4::uuid
		 AND c.store_id = a.store_id
		 AND c.state = 'active'
		LEFT JOIN LATERAL (
			SELECT price.amount_minor, price.currency
			FROM dsh_store_assortment_prices price
			WHERE price.store_assortment_id = a.id
			  AND price.effective_from <= NOW()
			  AND (price.effective_until IS NULL OR price.effective_until > NOW())
			ORDER BY price.effective_from DESC, price.version DESC, price.id DESC
			LIMIT 1
		) p ON TRUE
		LEFT JOIN dsh_store_assortment_inventory i ON i.store_assortment_id = a.id
		WHERE a.store_id = $1 AND a.master_product_id = $2
		LIMIT 1`, storeID, input.MasterProductID, input.Quantity, cartID).Scan(
		&assortmentID, &name, &unitPriceMinorUnits, &currency, &purchasable)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInvalid
	}
	if err != nil {
		return nil, err
	}
	if !purchasable || unitPriceMinorUnits <= 0 || currency == "" {
		return nil, ErrInvalid
	}

	optionsHash := hashOptions(input.Options)
	optionsJSON, _ := json.Marshal(input.Options)
	if input.Options == nil {
		optionsJSON = []byte("[]")
	}
	var item CartItem
	var optionsBytes []byte
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_cart_items (
			cart_id, product_id, master_product_id, store_assortment_id,
			product_name, price_reference, unit_price_minor, currency,
			quantity, options, note, options_hash
		) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (cart_id, master_product_id, options_hash) DO UPDATE
		SET quantity = EXCLUDED.quantity,
		    store_assortment_id = EXCLUDED.store_assortment_id,
		    product_name = EXCLUDED.product_name,
		    price_reference = EXCLUDED.price_reference,
		    unit_price_minor = EXCLUDED.unit_price_minor,
		    currency = EXCLUDED.currency,
		    note = EXCLUDED.note,
		    version = dsh_cart_items.version + 1,
		    updated_at = NOW()
		RETURNING id, cart_id, product_id, master_product_id, store_assortment_id,
		          product_name, price_reference, unit_price_minor, currency,
		          quantity, options, note, version, created_at, updated_at`,
		cartID, input.MasterProductID, assortmentID, name, "catalog",
		unitPriceMinorUnits, currency, input.Quantity, optionsJSON, input.Note, optionsHash).Scan(
		&item.ID, &item.CartID, &item.ProductID, &item.MasterProductID,
		&item.StoreAssortmentID, &item.ProductName, &item.PriceReference,
		&item.UnitPriceMinorUnits, &item.Currency, &item.Quantity,
		&optionsBytes, &item.Note, &item.Version, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(optionsBytes, &item.Options)
	if item.Options == nil {
		item.Options = []string{}
	}

	if input.FulfillmentMode != nil {
		_, err = tx.ExecContext(ctx, `
			UPDATE dsh_carts
			SET fulfillment_mode = $1, version = version + 1, updated_at = NOW()
			WHERE id = $2`, *input.FulfillmentMode, cartID)
	} else {
		_, err = tx.ExecContext(ctx,
			`UPDATE dsh_carts SET version = version + 1, updated_at = NOW() WHERE id = $1`, cartID)
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func UpsertItemIdempotent(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	storeID string,
	mode FulfillmentMode,
	input UpsertItemInput,
	mutation MutationContext,
) (*MutationResult, error) {
	clientID = strings.TrimSpace(clientID)
	storeID = strings.TrimSpace(storeID)
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	mutation.DeviceID = strings.TrimSpace(mutation.DeviceID)
	mutation.SessionID = strings.TrimSpace(mutation.SessionID)
	input.MasterProductID = strings.TrimSpace(input.MasterProductID)
	if mode == "" {
		mode = ModeBthwaniDelivery
	}
	input.FulfillmentMode = &mode
	if err := validateUpsertItemInput(input); err != nil {
		return nil, err
	}
	fingerprint, err := cartMutationFingerprint(struct {
		Operation       string   `json:"operation"`
		StoreID         string   `json:"storeId"`
		FulfillmentMode string   `json:"fulfillmentMode"`
		MasterProductID string   `json:"masterProductId"`
		Quantity        int      `json:"quantity"`
		Options         []string `json:"options"`
		Note            string   `json:"note"`
		ExpectedVersion *int     `json:"expectedVersion,omitempty"`
	}{"add_item", storeID, string(mode), input.MasterProductID, input.Quantity,
		canonicalOptions(input.Options), input.Note, input.ExpectedVersion})
	if err != nil {
		return nil, err
	}
	tx, receipt, err := beginCartMutation(ctx, db, clientID, mutation, "add_item", fingerprint)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	if receipt != nil {
		result, err := replayCartMutation(receipt, "add_item")
		if err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return result, nil
	}

	current, err := getOrCreateSingleStoreCartTx(ctx, tx, clientID, storeID, mode, input.ExpectedVersion)
	if err != nil {
		return nil, err
	}
	item, err := upsertItemTx(ctx, tx, storeID, current.ID, input)
	if err != nil {
		return nil, err
	}
	version := current.Version + 1
	response := struct {
		CartID string    `json:"cartId"`
		Item   *CartItem `json:"item"`
	}{current.ID, item}
	if err := recordMutationReceiptTx(ctx, tx, clientID, mutation, "add_item", fingerprint,
		current.ID, item.ID, version, false, response); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &MutationResult{CartID: current.ID, Item: item, Version: version}, nil
}

func removeOwnedItemTx(ctx context.Context, tx *sql.Tx, clientID, cartID, itemID string, expectedVersion *int) (int, error) {
	var currentVersion int
	err := tx.QueryRowContext(ctx, `
		SELECT version FROM dsh_carts
		WHERE id = $1 AND client_id = $2 AND state = 'active'
		FOR UPDATE`, cartID, clientID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, err
	}
	if expectedVersion != nil && currentVersion != *expectedVersion {
		return 0, ErrConflict
	}
	result, err := tx.ExecContext(ctx, `
		DELETE FROM dsh_cart_items item
		USING dsh_carts cart
		WHERE item.id = $1 AND item.cart_id = $2
		  AND cart.id = item.cart_id AND cart.client_id = $3 AND cart.state = 'active'`,
		itemID, cartID, clientID)
	if err != nil {
		return 0, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return 0, ErrNotFound
	}
	return bumpCartVersionTx(ctx, tx, cartID)
}

func bumpCartVersionTx(ctx context.Context, tx *sql.Tx, cartID string) (int, error) {
	var version int
	err := tx.QueryRowContext(ctx, `
		UPDATE dsh_carts SET version = version + 1, updated_at = NOW()
		WHERE id = $1 RETURNING version`, cartID).Scan(&version)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	return version, err
}

func RemoveItemIdempotent(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	cartID string,
	itemID string,
	expectedVersion *int,
	mutation MutationContext,
) (*MutationResult, error) {
	clientID = strings.TrimSpace(clientID)
	cartID = strings.TrimSpace(cartID)
	itemID = strings.TrimSpace(itemID)
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	mutation.DeviceID = strings.TrimSpace(mutation.DeviceID)
	mutation.SessionID = strings.TrimSpace(mutation.SessionID)
	if clientID == "" || cartID == "" || itemID == "" {
		return nil, ErrInvalid
	}
	fingerprint, err := cartMutationFingerprint(struct {
		Operation       string `json:"operation"`
		CartID          string `json:"cartId"`
		ItemID          string `json:"itemId"`
		ExpectedVersion *int   `json:"expectedVersion,omitempty"`
	}{"remove_item", cartID, itemID, expectedVersion})
	if err != nil {
		return nil, err
	}
	tx, receipt, err := beginCartMutation(ctx, db, clientID, mutation, "remove_item", fingerprint)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	if receipt != nil {
		result, err := replayCartMutation(receipt, "remove_item")
		if err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return result, nil
	}
	version, err := removeOwnedItemTx(ctx, tx, clientID, cartID, itemID, expectedVersion)
	if err != nil {
		return nil, err
	}
	// The item has already been deleted in this transaction, so the receipt
	// keeps the request identity and cart result without a dangling item FK.
	if err := recordMutationReceiptTx(ctx, tx, clientID, mutation, "remove_item", fingerprint,
		cartID, "", version, true, map[string]any{}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &MutationResult{CartID: cartID, Version: version, ResultDeleted: true}, nil
}

func clearOwnedCartTx(ctx context.Context, tx *sql.Tx, clientID, cartID string, expectedVersion *int) (int, error) {
	var currentVersion int
	err := tx.QueryRowContext(ctx, `
		SELECT version FROM dsh_carts
		WHERE id = $1 AND client_id = $2 AND state = 'active'
		FOR UPDATE`, cartID, clientID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, err
	}
	if expectedVersion != nil && currentVersion != *expectedVersion {
		return 0, ErrConflict
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id = $1`, cartID); err != nil {
		return 0, err
	}
	var version int
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_carts
		SET state = 'abandoned', version = version + 1, updated_at = NOW()
		WHERE id = $1 AND client_id = $2 AND state = 'active'
		RETURNING version`, cartID, clientID).Scan(&version)
	if err != nil {
		return 0, err
	}
	return version, nil
}

func ClearCartIdempotent(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	cartID string,
	storeID string,
	expectedVersion *int,
	mutation MutationContext,
) (*MutationResult, error) {
	clientID = strings.TrimSpace(clientID)
	cartID = strings.TrimSpace(cartID)
	storeID = strings.TrimSpace(storeID)
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	mutation.DeviceID = strings.TrimSpace(mutation.DeviceID)
	mutation.SessionID = strings.TrimSpace(mutation.SessionID)
	if clientID == "" || (cartID == "" && storeID == "") {
		return nil, ErrInvalid
	}
	fingerprint, err := cartMutationFingerprint(struct {
		Operation       string `json:"operation"`
		CartID          string `json:"cartId,omitempty"`
		StoreID         string `json:"storeId,omitempty"`
		ExpectedVersion *int   `json:"expectedVersion,omitempty"`
	}{"clear_cart", cartID, storeID, expectedVersion})
	if err != nil {
		return nil, err
	}
	tx, receipt, err := beginCartMutation(ctx, db, clientID, mutation, "clear_cart", fingerprint)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	if receipt != nil {
		result, err := replayCartMutation(receipt, "clear_cart")
		if err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return result, nil
	}

	resolvedCartID := cartID
	if resolvedCartID == "" {
		var version int
		err := tx.QueryRowContext(ctx, `
			SELECT id::text, version FROM dsh_carts
			WHERE client_id = $1 AND store_id = $2 AND state = 'active'
			ORDER BY updated_at DESC, id DESC
			LIMIT 1 FOR UPDATE`, clientID, storeID).Scan(&resolvedCartID, &version)
		if errors.Is(err, sql.ErrNoRows) {
			if err := recordMutationReceiptTx(ctx, tx, clientID, mutation, "clear_cart", fingerprint,
				"", "", 1, true, map[string]any{}); err != nil {
				return nil, err
			}
			if err := tx.Commit(); err != nil {
				return nil, err
			}
			return &MutationResult{Version: 1, ResultDeleted: true}, nil
		}
		if err != nil {
			return nil, err
		}
	}
	version, err := clearOwnedCartTx(ctx, tx, clientID, resolvedCartID, expectedVersion)
	if err != nil {
		return nil, err
	}
	if err := recordMutationReceiptTx(ctx, tx, clientID, mutation, "clear_cart", fingerprint,
		resolvedCartID, "", version, true, map[string]any{}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &MutationResult{CartID: resolvedCartID, Version: version, ResultDeleted: true}, nil
}
