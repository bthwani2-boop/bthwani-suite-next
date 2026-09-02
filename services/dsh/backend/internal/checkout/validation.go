package checkout

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type IntentDependencyValidation struct {
	CartReady          bool
	CartCode           string
	Serviceable        bool
	ServiceabilityCode string
}

type RefreshIntentInput struct {
	IntentID          string
	OperatorContextID string
	ClientID          string
	AddressID         string
	AddressSnapshot   string
	Mode              FulfillmentMode
	QuoteVersion      int
	Dependencies      IntentDependencyValidation
}

func GeneratePreviewHash(cartID, addressID string, mode FulfillmentMode, quoteVersion int) string {
	raw := fmt.Sprintf("%s:%s:%s:%d", cartID, addressID, string(mode), quoteVersion)
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

func dependencyValidationIssues(dependencies IntentDependencyValidation, mode FulfillmentMode, addressID string) []ValidationIssue {
	issues := make([]ValidationIssue, 0, 3)
	if mode != ModePickup && strings.TrimSpace(addressID) == "" {
		issues = append(issues, ValidationIssue{
			Code:    "MISSING_ADDRESS",
			Message: "Delivery address is required for delivery.",
			Field:   "deliveryAddressId",
		})
	}
	if !dependencies.CartReady {
		code := strings.TrimSpace(dependencies.CartCode)
		if code == "" {
			code = "CART_REQUIRES_REVIEW"
		}
		issues = append(issues, ValidationIssue{
			Code:    code,
			Message: "The cart is no longer ready for checkout.",
			Field:   "cart",
		})
	}
	if !dependencies.Serviceable {
		code := strings.TrimSpace(dependencies.ServiceabilityCode)
		if code == "" {
			code = "SERVICEABILITY_UNAVAILABLE"
		}
		issues = append(issues, ValidationIssue{
			Code:    code,
			Message: "The selected store and fulfillment mode are not currently serviceable.",
			Field:   "fulfillmentMode",
		})
	}
	return issues
}

func resolveIntentValidationState(issues []ValidationIssue) IntentState {
	if len(issues) > 0 {
		return StateBlocked
	}
	return StateReady
}

// RefreshIntent updates an intent only after the HTTP boundary has supplied
// fresh, canonical cart and serviceability evidence. It never calls WLT and it
// stores the address snapshot, not a mutable address identifier, as the intent
// dependency used by later order creation.
func RefreshIntent(db *sql.DB, input RefreshIntentInput) (*Intent, error) {
	input.OperatorContextID = normalizeOperatorContext(input.OperatorContextID)
	input.IntentID = strings.TrimSpace(input.IntentID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.AddressID = strings.TrimSpace(input.AddressID)
	if input.IntentID == "" || input.OperatorContextID == "" || input.ClientID == "" || input.Mode == "" || input.QuoteVersion < 0 {
		return nil, ErrInvalid
	}
	if input.Mode != ModeBthwaniDelivery && input.Mode != ModePartnerDelivery && input.Mode != ModePickup {
		return nil, ErrInvalid
	}
	if input.Mode == ModePickup {
		input.AddressID = ""
		input.AddressSnapshot = ""
	} else if input.AddressID == "" || strings.TrimSpace(input.AddressSnapshot) == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var cartID string
	var currentState string
	var cartVersion int
	err = tx.QueryRow(`
		SELECT i.cart_id::text, i.state, c.version
		FROM dsh_checkout_intents i
		JOIN dsh_carts c ON c.id=i.cart_id
		WHERE i.id=$1::uuid AND i.operator_context_id=$2 AND i.client_id=$3
		FOR UPDATE OF i, c`, input.IntentID, input.OperatorContextID, input.ClientID).Scan(&cartID, &currentState, &cartVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if currentState != string(StateDraft) && currentState != string(StateValidating) && currentState != string(StateReady) && currentState != string(StateBlocked) {
		return nil, fmt.Errorf("%w: cannot refresh intent in state %s", ErrConflict, currentState)
	}
	if input.QuoteVersion == 0 {
		input.QuoteVersion = cartVersion
	}

	issues := dependencyValidationIssues(input.Dependencies, input.Mode, input.AddressID)
	issuesJSON, err := json.Marshal(issues)
	if err != nil {
		return nil, err
	}
	newState := resolveIntentValidationState(issues)
	row := tx.QueryRow(`
		UPDATE dsh_checkout_intents
		SET state=$1, fulfillment_mode=$2, delivery_address_id=NULLIF($3,''), delivery_address=$4, preview_hash=$5,
			expires_at=$6, validation_issues=$7, version=version+1, updated_at=NOW()
		WHERE id=$8::uuid AND operator_context_id=$9 AND client_id=$10
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		      state, payment_method, wlt_payment_session_id, delivery_address, note,
		      version, created_at, updated_at, expires_at, preview_hash, validation_issues`,
		string(newState), string(input.Mode), input.AddressID, input.AddressSnapshot,
		GeneratePreviewHash(cartID, input.AddressID, input.Mode, input.QuoteVersion),
		time.Now().Add(15*time.Minute), issuesJSON, input.IntentID, input.OperatorContextID, input.ClientID)
	intent, err := scanIntent(row)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return intent, nil
}

// ValidateIntent records the result of a fresh canonical dependency check. It
// does not mutate cart, policy, address, payment, or WLT state.
func ValidateIntent(db *sql.DB, intentID, operatorContextID, clientID string, dependencies IntentDependencyValidation) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	intentID = strings.TrimSpace(intentID)
	clientID = strings.TrimSpace(clientID)
	if intentID == "" || operatorContextID == "" || clientID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	row := tx.QueryRow(`
		SELECT id, operator_context_id, client_id, cart_id::text, store_id, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id, delivery_address, note,
		       version, created_at, updated_at, expires_at, preview_hash, validation_issues
		FROM dsh_checkout_intents
		WHERE id=$1::uuid AND operator_context_id=$2 AND client_id=$3
		FOR UPDATE`, intentID, operatorContextID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if intent.State != StateDraft && intent.State != StateValidating && intent.State != StateReady && intent.State != StateBlocked {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return intent, nil
	}

	issues := dependencyValidationIssues(dependencies, intent.FulfillmentMode, intent.DeliveryAddress)
	issuesJSON, err := json.Marshal(issues)
	if err != nil {
		return nil, err
	}
	previousIssues, err := json.Marshal(intent.ValidationIssues)
	if err != nil {
		return nil, err
	}
	newState := resolveIntentValidationState(issues)
	if intent.State != newState || !bytes.Equal(previousIssues, issuesJSON) {
		intent, err = scanIntent(tx.QueryRow(`
			UPDATE dsh_checkout_intents
			SET state=$1, validation_issues=$2, version=version+1, updated_at=NOW()
			WHERE id=$3::uuid AND operator_context_id=$4 AND client_id=$5
			RETURNING id, operator_context_id, client_id, cart_id::text, store_id, fulfillment_mode,
			          state, payment_method, wlt_payment_session_id, delivery_address, note,
			          version, created_at, updated_at, expires_at, preview_hash, validation_issues`,
			string(newState), issuesJSON, intentID, operatorContextID, clientID))
		if err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return intent, nil
}
