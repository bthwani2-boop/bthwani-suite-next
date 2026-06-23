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
	MethodCOD           PaymentMethod = "cod"
	MethodWallet        PaymentMethod = "wallet"
	MethodMixed         PaymentMethod = "mixed"
	MethodOfficialWallet PaymentMethod = "official_wallet"
)

type IntentState string

const (
	StatePending        IntentState = "pending"
	StatePaymentPending IntentState = "payment_pending"
	StateConfirmed      IntentState = "confirmed"
	StateCancelled      IntentState = "cancelled"
	StateExpired        IntentState = "expired"
)

type FulfillmentMode string

const (
	ModeBthwaniDelivery  FulfillmentMode = "bthwani_delivery"
	ModePartnerDelivery  FulfillmentMode = "partner_delivery"
	ModePickup           FulfillmentMode = "pickup"
)

type Intent struct {
	ID                   string
	ClientID             string
	CartID               string
	StoreID              string
	FulfillmentMode      FulfillmentMode
	State                IntentState
	PaymentMethod        PaymentMethod
	WltPaymentSessionID  string // opaque reference from WLT — empty until WLT-001 approved
	DeliveryAddress      string
	Note                 string
	Version              int
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type CreateIntentInput struct {
	ClientID        string
	CartID          string
	StoreID         string
	FulfillmentMode FulfillmentMode
	PaymentMethod   PaymentMethod
	DeliveryAddress string
	Note            string
}

func CreateIntent(db *sql.DB, input CreateIntentInput) (*Intent, error) {
	if input.ClientID == "" || input.CartID == "" || input.StoreID == "" {
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
			(client_id, cart_id, store_id, fulfillment_mode, state, payment_method,
			 wlt_payment_session_id, delivery_address, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`

	// WLT payment session: CONTRACT_ONLY until WLT-001 approved.
	// Stored as empty string; frontend treats empty as "payment_pending" display state.
	wltSessionID := ""

	row := db.QueryRow(q,
		input.ClientID, input.CartID, input.StoreID,
		string(input.FulfillmentMode), string(StatePending), string(input.PaymentMethod),
		wltSessionID, input.DeliveryAddress, input.Note,
	)
	return scanIntent(row)
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
		  AND state IN ('pending', 'payment_pending')
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
