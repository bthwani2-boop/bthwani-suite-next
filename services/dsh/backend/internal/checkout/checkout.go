package checkout

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var (
	ErrNotFound = errors.New("checkout intent not found")
	ErrInvalid  = errors.New("invalid checkout intent input")
	ErrConflict = errors.New("checkout intent state conflict")
)

type PaymentMethod string

const (
	MethodCOD            PaymentMethod = "cod"
	MethodWallet         PaymentMethod = "wallet"
	MethodMixed          PaymentMethod = "mixed"
	MethodOfficialWallet PaymentMethod = "official_wallet"
)

type IntentState string

const (
	StatePending          IntentState = "pending"
	StateWltHandoffFailed IntentState = "wlt_handoff_failed"
	StatePaymentPending   IntentState = "payment_pending"
	StateConfirmed        IntentState = "confirmed"
	StateCancelled        IntentState = "cancelled"
	StatePaymentConfirmed IntentState = "payment_confirmed"
	StatePaymentFailed    IntentState = "payment_failed"
	StateExpired          IntentState = "expired"
)

type FulfillmentMode string

const (
	ModeBthwaniDelivery FulfillmentMode = "bthwani_delivery"
	ModePartnerDelivery FulfillmentMode = "partner_delivery"
	ModePickup          FulfillmentMode = "pickup"
)

type Intent struct {
	ID                  string
	ClientID            string
	CartID              string
	StoreID             string
	FulfillmentMode     FulfillmentMode
	State               IntentState
	PaymentMethod       PaymentMethod
	WltPaymentSessionID string // opaque WLT-owned payment-session reference
	DeliveryAddress     string
	Note                string
	Version             int
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type CreateIntentInput struct {
	ID                  string
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

func CreateIntent(db *sql.DB, input CreateIntentInput) (*Intent, error) {
	if input.ID == "" || input.ClientID == "" || input.CartID == "" || input.StoreID == "" {
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
			(id, client_id, cart_id, store_id, fulfillment_mode, state, payment_method,
			 wlt_payment_session_id, delivery_address, note)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`

	row := db.QueryRow(q,
		input.ID, input.ClientID, input.CartID, input.StoreID,
		string(input.FulfillmentMode), string(StatePending), string(input.PaymentMethod),
		input.WltPaymentSessionID, input.DeliveryAddress, input.Note,
	)
	return scanIntent(row)
}

func AttachWltPaymentSession(db *sql.DB, intentID, clientID, paymentSessionID string) (*Intent, error) {
	if intentID == "" || clientID == "" || paymentSessionID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, wlt_payment_session_id = $2, version = version + 1, updated_at = NOW()
		WHERE id = $3::uuid AND client_id = $4
		  AND state IN ('pending', 'wlt_handoff_failed')
		RETURNING id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := db.QueryRow(q, string(StatePaymentPending), paymentSessionID, intentID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found or not handoff-ready", ErrConflict)
	}
	return intent, err
}

func MarkWltHandoffFailed(db *sql.DB, intentID, clientID string) (*Intent, error) {
	if intentID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND client_id = $3
		  AND state IN ('pending', 'payment_pending')
		RETURNING id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := db.QueryRow(q, string(StateWltHandoffFailed), intentID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found or not handoff-ready", ErrConflict)
	}
	return intent, err
}

func GetIntent(db *sql.DB, intentID, clientID string) (*Intent, error) {
	const q = `
		SELECT id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND client_id = $2`
	row := db.QueryRow(q, intentID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

func CancelIntent(db *sql.DB, intentID, clientID string) (*Intent, error) {
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND client_id = $3
		  AND state IN ('pending', 'wlt_handoff_failed', 'payment_pending')
		RETURNING id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := db.QueryRow(q, string(StateCancelled), intentID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: not found or already closed", ErrConflict)
	}
	return intent, err
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
		const q = `
			SELECT id, client_id, cart_id::text, store_id::text, fulfillment_mode,
			       state, payment_method, wlt_payment_session_id,
			       delivery_address, note, version, created_at, updated_at
			FROM dsh_checkout_intents
			WHERE state = $1
			ORDER BY created_at DESC
			LIMIT $2`
		rows, err = db.Query(q, stateFilter, limit)
	} else {
		const q = `
			SELECT id, client_id, cart_id::text, store_id::text, fulfillment_mode,
			       state, payment_method, wlt_payment_session_id,
			       delivery_address, note, version, created_at, updated_at
			FROM dsh_checkout_intents
			ORDER BY created_at DESC
			LIMIT $1`
		rows, err = db.Query(q, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var intents []Intent
	for rows.Next() {
		var i Intent
		if err := scanIntentRow(rows, &i); err != nil {
			return nil, err
		}
		intents = append(intents, i)
	}
	if intents == nil {
		intents = []Intent{}
	}
	return intents, rows.Err()
}

func scanIntent(row *sql.Row) (*Intent, error) {
	var i Intent
	err := row.Scan(
		&i.ID, &i.ClientID, &i.CartID, &i.StoreID,
		&i.FulfillmentMode, &i.State, &i.PaymentMethod,
		&i.WltPaymentSessionID, &i.DeliveryAddress, &i.Note,
		&i.Version, &i.CreatedAt, &i.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func scanIntentRow(rows *sql.Rows, i *Intent) error {
	return rows.Scan(
		&i.ID, &i.ClientID, &i.CartID, &i.StoreID,
		&i.FulfillmentMode, &i.State, &i.PaymentMethod,
		&i.WltPaymentSessionID, &i.DeliveryAddress, &i.Note,
		&i.Version, &i.CreatedAt, &i.UpdatedAt,
	)
}

// GetIntentForService loads a checkout intent by id without client scoping,
// for use by trusted service-to-service callers (e.g. the WLT payment-event
// webhook), which do not have an end-user identity to scope against.
func GetIntentForService(db *sql.DB, intentID string) (*Intent, error) {
	const q = `
		SELECT id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id = $1::uuid`
	row := db.QueryRow(q, intentID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

// ErrPaymentSessionMismatch indicates a WLT payment event referenced a
// paymentSessionId that does not match the session attached to the intent.
var ErrPaymentSessionMismatch = errors.New("wlt payment session id does not match checkout intent")

// ApplyWltPaymentEvent advances a checkout intent from payment_pending to a
// terminal payment outcome reported by WLT (the sole owner of payment
// authorization/capture truth). It is idempotent: replays of an event that
// already reflects the intent's current state are a no-op success, so WLT
// retries or out-of-order delivery cannot fail spuriously.
func ApplyWltPaymentEvent(db *sql.DB, intentID, paymentSessionID, wltStatus string) (*Intent, error) {
	if intentID == "" || paymentSessionID == "" || wltStatus == "" {
		return nil, ErrInvalid
	}

	var targetState IntentState
	switch wltStatus {
	case "captured", "cod_collected":
		targetState = StatePaymentConfirmed
	case "failed", "expired":
		targetState = StatePaymentFailed
	case "authorized", "reference_created", "cod_pending":
		// Intermediate WLT states are not yet a terminal DSH outcome; the
		// intent stays in payment_pending until capture/failure/expiry.
		return GetIntentForService(db, intentID)
	default:
		return nil, fmt.Errorf("%w: unsupported wltStatus %q", ErrInvalid, wltStatus)
	}

	current, err := GetIntentForService(db, intentID)
	if err != nil {
		return nil, err
	}
	if current.WltPaymentSessionID != paymentSessionID {
		return nil, ErrPaymentSessionMismatch
	}
	if current.State == targetState {
		return current, nil
	}
	if current.State != StatePaymentPending {
		return nil, fmt.Errorf("%w: intent is not awaiting a payment outcome", ErrConflict)
	}

	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND state = 'payment_pending'
		RETURNING id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := db.QueryRow(q, string(targetState), intentID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent state changed concurrently", ErrConflict)
	}
	return intent, err
}
