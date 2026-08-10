package checkout

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

func GeneratePreviewHash(cartID, addressID string, mode FulfillmentMode, quoteVersion int) string {
	raw := fmt.Sprintf("%s:%s:%s:%d", cartID, addressID, string(mode), quoteVersion)
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

// RefreshIntent updates the intent's dependencies, recalculates the preview hash, and performs validation.
func RefreshIntent(db *sql.DB, intentID, operatorContextID, clientID, addressID string, mode FulfillmentMode, quoteVersion int) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if intentID == "" || operatorContextID == "" || clientID == "" {
		return nil, ErrInvalid
	}

	hash := GeneratePreviewHash(intentID, addressID, mode, quoteVersion) // cartID isn't easily available, using intentID for simplicity or we can fetch first
	expiresAt := time.Now().Add(15 * time.Minute)

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Fetch current to ensure it exists and is in a refreshable state
	var cartID string
	var currentState string
	err = tx.QueryRow(`SELECT cart_id::text, state FROM dsh_checkout_intents WHERE id = $1::uuid AND operator_context_id = $2 AND client_id = $3 FOR UPDATE`, intentID, operatorContextID, clientID).Scan(&cartID, &currentState)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if currentState != string(StateDraft) && currentState != string(StateValidating) && currentState != string(StateReady) && currentState != string(StateBlocked) {
		return nil, fmt.Errorf("%w: cannot refresh intent in state %s", ErrConflict, currentState)
	}

	hash = GeneratePreviewHash(cartID, addressID, mode, quoteVersion)

	// 2. Perform dummy validation (in a real scenario, this would call serviceability, cart validation, etc.)
	// For this J050 transformation, we establish the infrastructure and schema.
	issues := []ValidationIssue{}
	if addressID == "" && mode != ModePickup {
		issues = append(issues, ValidationIssue{
			Code:    "MISSING_ADDRESS",
			Message: "Delivery address is required for delivery.",
			Field:   "deliveryAddressId",
		})
	}

	newState := StateReady
	if len(issues) > 0 {
		newState = StateBlocked
	}

	issuesJSON, _ := json.Marshal(issues)

	// 3. Update the intent
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, fulfillment_mode = $2, delivery_address = $3, preview_hash = $4, expires_at = $5, validation_issues = $6, version = version + 1, updated_at = NOW()
		WHERE id = $7::uuid AND operator_context_id = $8 AND client_id = $9
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`

	row := tx.QueryRow(q, string(newState), string(mode), addressID, hash, expiresAt, issuesJSON, intentID, operatorContextID, clientID)
	intent, err := scanIntent(row)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return intent, nil
}

// ValidateIntent performs validation without changing dependencies.
func ValidateIntent(db *sql.DB, intentID, operatorContextID, clientID string) (*Intent, error) {
	// This would re-run the validation rules and update state to blocked/ready
	operatorContextID = normalizeOperatorContext(operatorContextID)

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRow(`
		SELECT id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND operator_context_id = $2 AND client_id = $3
		FOR UPDATE`, intentID, operatorContextID, clientID)

	intent, err := scanIntent(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if intent.State != StateDraft && intent.State != StateValidating && intent.State != StateReady && intent.State != StateBlocked {
		return intent, nil // no-op if in confirming/confirmed/etc
	}

	// 2. Perform dummy validation
	issues := []ValidationIssue{}
	if intent.DeliveryAddress == "" && intent.FulfillmentMode != ModePickup {
		issues = append(issues, ValidationIssue{
			Code:    "MISSING_ADDRESS",
			Message: "Delivery address is required for delivery.",
			Field:   "deliveryAddressId",
		})
	}

	newState := StateReady
	if len(issues) > 0 {
		newState = StateBlocked
	}

	if intent.State != newState || len(issues) != len(intent.ValidationIssues) {
		issuesJSON, _ := json.Marshal(issues)
		row = tx.QueryRow(`
			UPDATE dsh_checkout_intents
			SET state = $1, validation_issues = $2, version = version + 1, updated_at = NOW()
			WHERE id = $3::uuid
			RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
					  state, payment_method, wlt_payment_session_id,
					  delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`,
			string(newState), issuesJSON, intentID)
		intent, err = scanIntent(row)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return intent, nil
}
