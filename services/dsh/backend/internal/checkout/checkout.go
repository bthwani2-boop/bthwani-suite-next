package checkout

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/checkoutfinanceoutbox"
)

var (
	ErrNotFound = errors.New("checkout intent not found")
	ErrInvalid  = errors.New("invalid checkout intent input")
	ErrConflict = errors.New("checkout intent state conflict")
)

type PaymentMethod string

const (
	MethodCOD    PaymentMethod = "cod"
	MethodWallet PaymentMethod = "wallet"
	MethodMixed  PaymentMethod = "mixed"
)

type IntentState string

const (
	StateDraft      IntentState = "draft"
	StateValidating IntentState = "validating"
	StateReady      IntentState = "ready"
	StateBlocked    IntentState = "blocked"
	StateConfirming IntentState = "confirming"
	StateConfirmed  IntentState = "confirmed"
	StateCancelled  IntentState = "cancelled"
	StateExpired    IntentState = "expired"
)

type FulfillmentMode string

const (
	ModeBthwaniDelivery FulfillmentMode = "bthwani_delivery"
	ModePartnerDelivery FulfillmentMode = "partner_delivery"
	ModePickup          FulfillmentMode = "pickup"
)

type ValidationIssue struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field"`
}

type Intent struct {
	ID                  string
	OperatorContextID   string
	ClientID            string
	CartID              string
	StoreID             string
	FulfillmentMode     FulfillmentMode
	State               IntentState
	PaymentMethod       PaymentMethod
	WltPaymentSessionID string
	DeliveryAddress     string
	Note                string
	Version             int
	CreatedAt           time.Time
	UpdatedAt           time.Time
	ExpiresAt           *time.Time
	PreviewHash         string
	ValidationIssues    []ValidationIssue
}

type CreateIntentInput struct {
	ID                  string
	OperatorContextID   string
	ClientID            string
	CartID              string
	StoreID             string
	FulfillmentMode     FulfillmentMode
	PaymentMethod       PaymentMethod
	WltPaymentSessionID string
	DeliveryAddress     string
	Note                string
}

func NewIntentID(db *sql.DB) (string, error) {
	var id string
	if err := db.QueryRow(`SELECT gen_random_uuid()::text`).Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}

func normalizeOperatorContext(operatorContextID string) string {
	return strings.TrimSpace(operatorContextID)
}

func CreateIntent(db *sql.DB, input CreateIntentInput) (*Intent, error) {
	input.OperatorContextID = normalizeOperatorContext(input.OperatorContextID)
	if input.ID == "" || input.OperatorContextID == "" || input.ClientID == "" || input.CartID == "" || input.StoreID == "" {
		return nil, ErrInvalid
	}
	if input.FulfillmentMode == "" {
		input.FulfillmentMode = ModeBthwaniDelivery
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = MethodCOD
	}

	const q = `
		INSERT INTO dsh_checkout_intents
			(id, operator_context_id, client_id, cart_id, store_id, fulfillment_mode, state, payment_method,
			 wlt_payment_session_id, delivery_address, note, preview_hash, validation_issues)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '', '[]'::jsonb)
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`

	row := db.QueryRow(q,
		input.ID, input.OperatorContextID, input.ClientID, input.CartID, input.StoreID,
		string(input.FulfillmentMode), string(StateDraft), string(input.PaymentMethod),
		input.WltPaymentSessionID, input.DeliveryAddress, input.Note,
	)
	return scanIntent(row)
}

func AttachWltPaymentSession(db *sql.DB, intentID, operatorContextID, clientID, paymentSessionID string) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if intentID == "" || operatorContextID == "" || clientID == "" || paymentSessionID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, wlt_payment_session_id = $2, version = version + 1, updated_at = NOW()
		WHERE id = $3::uuid AND operator_context_id = $4 AND client_id = $5
		  AND state IN ('ready', 'confirming', 'blocked')
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`
	row := db.QueryRow(q, string(StateConfirming), paymentSessionID, intentID, operatorContextID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, OperatorContext mismatch, or not handoff-ready", ErrConflict)
	}
	return intent, err
}

func MarkWltOutcomeUnknown(db *sql.DB, intentID, operatorContextID, clientID string) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if intentID == "" || operatorContextID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND operator_context_id = $3 AND client_id = $4
		  AND state IN ('ready', 'confirming', 'blocked')
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`
	row := db.QueryRow(q, string(StateConfirming), intentID, operatorContextID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, OperatorContext mismatch, or not handoff-reconcilable", ErrConflict)
	}
	return intent, err
}

func MarkWltHandoffFailed(db *sql.DB, intentID, operatorContextID, clientID string) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if intentID == "" || operatorContextID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND operator_context_id = $3 AND client_id = $4
		  AND state IN ('ready', 'confirming')
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`
	row := db.QueryRow(q, string(StateBlocked), intentID, operatorContextID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, OperatorContext mismatch, or not handoff-ready", ErrConflict)
	}
	return intent, err
}

// MarkHandoffBlocked is the J050 canonical name for MarkWltHandoffFailed.
// Transitions the intent to 'blocked' when WLT handoff or funding fails.
func MarkHandoffBlocked(db *sql.DB, intentID, operatorContextID, clientID string) (*Intent, error) {
	return MarkWltHandoffFailed(db, intentID, operatorContextID, clientID)
}

func GetIntent(db *sql.DB, intentID, operatorContextID, clientID string) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if intentID == "" || operatorContextID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	const q = `
		SELECT id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND operator_context_id = $2 AND client_id = $3`
	row := db.QueryRow(q, intentID, operatorContextID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

func CancelIntent(db *sql.DB, intentID, operatorContextID, clientID string) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if intentID == "" || operatorContextID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND operator_context_id = $3 AND client_id = $4
		  AND state IN ('draft', 'validating', 'ready', 'blocked', 'confirming')
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`
	row := tx.QueryRow(q, string(StateCancelled), intentID, operatorContextID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: not found, OperatorContext mismatch, or already closed", ErrConflict)
	}
	if err != nil {
		return nil, err
	}

	if intent.WltPaymentSessionID != "" {
		if err := checkoutfinanceoutbox.Enqueue(tx, checkoutfinanceoutbox.EnqueueInput{
			EventType:        checkoutfinanceoutbox.EventTypeExpireSession,
			CheckoutIntentID: intent.ID,
			PaymentSessionID: intent.WltPaymentSessionID,
			ClientID:         clientID,
		}); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return intent, nil
}

func ListOperatorIntents(db *sql.DB, stateFilter string, limit int) ([]Intent, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var (
		rows *sql.Rows
		err  error
	)
	if stateFilter != "" {
		rows, err = db.Query(`
			SELECT id, COALESCE(operator_context_id,''), client_id, cart_id::text, store_id::text, fulfillment_mode,
			       state, payment_method, wlt_payment_session_id,
			       delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues
			FROM dsh_checkout_intents
			WHERE state = $1
			ORDER BY created_at DESC
			LIMIT $2`, stateFilter, limit)
	} else {
		rows, err = db.Query(`
			SELECT id, COALESCE(operator_context_id,''), client_id, cart_id::text, store_id::text, fulfillment_mode,
			       state, payment_method, wlt_payment_session_id,
			       delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues
			FROM dsh_checkout_intents
			ORDER BY created_at DESC
			LIMIT $1`, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	intents := make([]Intent, 0)
	for rows.Next() {
		var intent Intent
		if err := scanIntentRow(rows, &intent); err != nil {
			return nil, err
		}
		intents = append(intents, intent)
	}
	return intents, rows.Err()
}

func scanIntent(row *sql.Row) (*Intent, error) {
	var intent Intent
	var issuesJSON []byte
	err := row.Scan(
		&intent.ID, &intent.OperatorContextID, &intent.ClientID, &intent.CartID, &intent.StoreID,
		&intent.FulfillmentMode, &intent.State, &intent.PaymentMethod,
		&intent.WltPaymentSessionID, &intent.DeliveryAddress, &intent.Note,
		&intent.Version, &intent.CreatedAt, &intent.UpdatedAt,
		&intent.ExpiresAt, &intent.PreviewHash, &issuesJSON,
	)
	if err != nil {
		return nil, err
	}
	if len(issuesJSON) > 0 {
		importJson := []ValidationIssue{}
		if err := json.Unmarshal(issuesJSON, &importJson); err == nil {
			intent.ValidationIssues = importJson
		}
	} else {
		intent.ValidationIssues = make([]ValidationIssue, 0)
	}
	return &intent, nil
}

func scanIntentRow(rows *sql.Rows, intent *Intent) error {
	var issuesJSON []byte
	err := rows.Scan(
		&intent.ID, &intent.OperatorContextID, &intent.ClientID, &intent.CartID, &intent.StoreID,
		&intent.FulfillmentMode, &intent.State, &intent.PaymentMethod,
		&intent.WltPaymentSessionID, &intent.DeliveryAddress, &intent.Note,
		&intent.Version, &intent.CreatedAt, &intent.UpdatedAt,
		&intent.ExpiresAt, &intent.PreviewHash, &issuesJSON,
	)
	if err != nil {
		return err
	}
	if len(issuesJSON) > 0 {
		importJson := []ValidationIssue{}
		if err := json.Unmarshal(issuesJSON, &importJson); err == nil {
			intent.ValidationIssues = importJson
		}
	} else {
		intent.ValidationIssues = make([]ValidationIssue, 0)
	}
	return nil
}

func GetIntentForOperator(db *sql.DB, intentID string) (*Intent, error) {
	if strings.TrimSpace(intentID) == "" {
		return nil, ErrInvalid
	}
	row := db.QueryRow(`
		SELECT id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues
		FROM dsh_checkout_intents
		WHERE id = $1::uuid`, intentID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

func GetIntentForService(db *sql.DB, operatorContextID, intentID string) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if operatorContextID == "" || intentID == "" {
		return nil, ErrInvalid
	}
	row := db.QueryRow(`
		SELECT id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND operator_context_id = $2`, intentID, operatorContextID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

var ErrPaymentSessionMismatch = errors.New("wlt payment session id does not match checkout intent")

func paymentEventTargetState(wltStatus string) (IntentState, bool, error) {
	switch strings.TrimSpace(wltStatus) {
	case "captured", "cod_finalized":
		return StateConfirmed, false, nil
	case "failed":
		return StateCancelled, false, nil
	case "expired":
		return StateExpired, false, nil
	case "authorized", "reference_created", "cod_pending":
		return "", true, nil
	default:
		return "", false, fmt.Errorf("%w: unsupported wltStatus %q", ErrInvalid, wltStatus)
	}
}

func ApplyWltPaymentEvent(db *sql.DB, operatorContextID, intentID, paymentSessionID, wltStatus string) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if operatorContextID == "" || intentID == "" || paymentSessionID == "" || wltStatus == "" {
		return nil, ErrInvalid
	}

	targetState, intermediate, err := paymentEventTargetState(wltStatus)
	if err != nil {
		return nil, err
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := scanIntent(tx.QueryRow(`
		SELECT id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND operator_context_id = $2
		FOR UPDATE`, intentID, operatorContextID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if current.WltPaymentSessionID != paymentSessionID {
		return nil, ErrPaymentSessionMismatch
	}
	if intermediate || current.State == targetState {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return current, nil
	}
	if current.State != StateConfirming {
		return nil, fmt.Errorf("%w: intent is not awaiting a payment outcome", ErrConflict)
	}

	intent, err := scanIntent(tx.QueryRow(`
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND operator_context_id = $3 AND wlt_payment_session_id = $4
		  AND state = 'confirming'
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`,
		string(targetState), intentID, operatorContextID, paymentSessionID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent state changed concurrently", ErrConflict)
	}
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return intent, nil
}
