package checkout

import (
	"database/sql"
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
	MethodCOD            PaymentMethod = "cod"
	MethodWallet         PaymentMethod = "wallet"
	MethodMixed          PaymentMethod = "mixed"
	MethodOfficialWallet PaymentMethod = "official_wallet"
)

type IntentState string

const (
	StatePending           IntentState = "pending"
	StateWltHandoffFailed  IntentState = "wlt_handoff_failed"
	StateWltOutcomeUnknown IntentState = "wlt_outcome_unknown"
	StatePaymentPending    IntentState = "payment_pending"
	StateConfirmed         IntentState = "confirmed"
	StateCancelled         IntentState = "cancelled"
	StatePaymentConfirmed  IntentState = "payment_confirmed"
	StatePaymentFailed     IntentState = "payment_failed"
	StateExpired           IntentState = "expired"
)

type FulfillmentMode string

const (
	ModeBthwaniDelivery FulfillmentMode = "bthwani_delivery"
	ModePartnerDelivery FulfillmentMode = "partner_delivery"
	ModePickup          FulfillmentMode = "pickup"
)

type Intent struct {
	ID                  string
	TenantID            string
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
}

type CreateIntentInput struct {
	ID                  string
	TenantID            string
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

func normalizeTenant(tenantID string) string {
	return strings.TrimSpace(tenantID)
}

func CreateIntent(db *sql.DB, input CreateIntentInput) (*Intent, error) {
	input.TenantID = normalizeTenant(input.TenantID)
	if input.ID == "" || input.TenantID == "" || input.ClientID == "" || input.CartID == "" || input.StoreID == "" {
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
			(id, tenant_id, client_id, cart_id, store_id, fulfillment_mode, state, payment_method,
			 wlt_payment_session_id, delivery_address, note)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`

	row := db.QueryRow(q,
		input.ID, input.TenantID, input.ClientID, input.CartID, input.StoreID,
		string(input.FulfillmentMode), string(StatePending), string(input.PaymentMethod),
		input.WltPaymentSessionID, input.DeliveryAddress, input.Note,
	)
	return scanIntent(row)
}

func AttachWltPaymentSession(db *sql.DB, intentID, tenantID, clientID, paymentSessionID string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if intentID == "" || tenantID == "" || clientID == "" || paymentSessionID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, wlt_payment_session_id = $2, version = version + 1, updated_at = NOW()
		WHERE id = $3::uuid AND tenant_id = $4 AND client_id = $5
		  AND state IN ('pending', 'wlt_handoff_failed', 'wlt_outcome_unknown')
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := db.QueryRow(q, string(StatePaymentPending), paymentSessionID, intentID, tenantID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, tenant mismatch, or not handoff-ready", ErrConflict)
	}
	return intent, err
}

func MarkWltOutcomeUnknown(db *sql.DB, intentID, tenantID, clientID string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if intentID == "" || tenantID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND tenant_id = $3 AND client_id = $4
		  AND state IN ('pending', 'wlt_handoff_failed', 'wlt_outcome_unknown')
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := db.QueryRow(q, string(StateWltOutcomeUnknown), intentID, tenantID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, tenant mismatch, or not handoff-reconcilable", ErrConflict)
	}
	return intent, err
}

func MarkWltHandoffFailed(db *sql.DB, intentID, tenantID, clientID string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if intentID == "" || tenantID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND tenant_id = $3 AND client_id = $4
		  AND state IN ('pending', 'payment_pending', 'wlt_outcome_unknown')
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := db.QueryRow(q, string(StateWltHandoffFailed), intentID, tenantID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, tenant mismatch, or not handoff-ready", ErrConflict)
	}
	return intent, err
}

func GetIntent(db *sql.DB, intentID, tenantID, clientID string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if intentID == "" || tenantID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	const q = `
		SELECT id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND tenant_id = $2 AND client_id = $3`
	row := db.QueryRow(q, intentID, tenantID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

func CancelIntent(db *sql.DB, intentID, tenantID, clientID string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if intentID == "" || tenantID == "" || clientID == "" {
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
		WHERE id = $2::uuid AND tenant_id = $3 AND client_id = $4
		  AND state IN ('pending', 'wlt_handoff_failed', 'wlt_outcome_unknown', 'payment_pending')
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`
	row := tx.QueryRow(q, string(StateCancelled), intentID, tenantID, clientID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: not found, tenant mismatch, or already closed", ErrConflict)
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
			SELECT id, COALESCE(tenant_id,''), client_id, cart_id::text, store_id::text, fulfillment_mode,
			       state, payment_method, wlt_payment_session_id,
			       delivery_address, note, version, created_at, updated_at
			FROM dsh_checkout_intents
			WHERE state = $1
			ORDER BY created_at DESC
			LIMIT $2`, stateFilter, limit)
	} else {
		rows, err = db.Query(`
			SELECT id, COALESCE(tenant_id,''), client_id, cart_id::text, store_id::text, fulfillment_mode,
			       state, payment_method, wlt_payment_session_id,
			       delivery_address, note, version, created_at, updated_at
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
	err := row.Scan(
		&intent.ID, &intent.TenantID, &intent.ClientID, &intent.CartID, &intent.StoreID,
		&intent.FulfillmentMode, &intent.State, &intent.PaymentMethod,
		&intent.WltPaymentSessionID, &intent.DeliveryAddress, &intent.Note,
		&intent.Version, &intent.CreatedAt, &intent.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &intent, nil
}

func scanIntentRow(rows *sql.Rows, intent *Intent) error {
	return rows.Scan(
		&intent.ID, &intent.TenantID, &intent.ClientID, &intent.CartID, &intent.StoreID,
		&intent.FulfillmentMode, &intent.State, &intent.PaymentMethod,
		&intent.WltPaymentSessionID, &intent.DeliveryAddress, &intent.Note,
		&intent.Version, &intent.CreatedAt, &intent.UpdatedAt,
	)
}

func GetIntentForOperator(db *sql.DB, intentID string) (*Intent, error) {
	if strings.TrimSpace(intentID) == "" {
		return nil, ErrInvalid
	}
	row := db.QueryRow(`
		SELECT id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id = $1::uuid`, intentID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

func GetIntentForService(db *sql.DB, tenantID, intentID string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if tenantID == "" || intentID == "" {
		return nil, ErrInvalid
	}
	row := db.QueryRow(`
		SELECT id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND tenant_id = $2`, intentID, tenantID)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

var ErrPaymentSessionMismatch = errors.New("wlt payment session id does not match checkout intent")

func paymentEventTargetState(wltStatus string) (IntentState, bool, error) {
	switch strings.TrimSpace(wltStatus) {
	case "captured", "cod_collected":
		return StatePaymentConfirmed, false, nil
	case "failed":
		return StatePaymentFailed, false, nil
	case "expired":
		return StateExpired, false, nil
	case "authorized", "reference_created", "cod_pending":
		return "", true, nil
	default:
		return "", false, fmt.Errorf("%w: unsupported wltStatus %q", ErrInvalid, wltStatus)
	}
}

func ApplyWltPaymentEvent(db *sql.DB, tenantID, intentID, paymentSessionID, wltStatus string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if tenantID == "" || intentID == "" || paymentSessionID == "" || wltStatus == "" {
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
		SELECT id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id = $1::uuid AND tenant_id = $2
		FOR UPDATE`, intentID, tenantID))
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
	if current.State != StatePaymentPending {
		return nil, fmt.Errorf("%w: intent is not awaiting a payment outcome", ErrConflict)
	}

	intent, err := scanIntent(tx.QueryRow(`
		UPDATE dsh_checkout_intents
		SET state = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2::uuid AND tenant_id = $3 AND wlt_payment_session_id = $4
		  AND state = 'payment_pending'
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`,
		string(targetState), intentID, tenantID, paymentSessionID))
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
