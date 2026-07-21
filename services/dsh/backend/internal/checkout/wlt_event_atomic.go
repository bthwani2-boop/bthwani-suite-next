package checkout

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

var ErrWltEventReplayConflict = errors.New("wlt payment event replay conflict")

type WltPaymentEventEnvelope struct {
	EventID          string
	TenantID         string
	CheckoutIntentID string
	PaymentSessionID string
	Status           string
	CorrelationID    string
}

func normalizeWltPaymentEventEnvelope(input WltPaymentEventEnvelope) WltPaymentEventEnvelope {
	input.EventID = strings.TrimSpace(input.EventID)
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.Status = strings.TrimSpace(input.Status)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	return input
}

func WltPaymentEventIdentity(input WltPaymentEventEnvelope) (eventKey string, payloadHash string, err error) {
	input = normalizeWltPaymentEventEnvelope(input)
	if input.TenantID == "" || input.CheckoutIntentID == "" || input.PaymentSessionID == "" || input.Status == "" {
		return "", "", ErrInvalid
	}
	if _, _, statusErr := paymentEventTargetState(input.Status); statusErr != nil {
		return "", "", statusErr
	}
	if input.EventID != "" && (len(input.EventID) < 8 || len(input.EventID) > 200) {
		return "", "", fmt.Errorf("%w: eventId must contain between 8 and 200 characters", ErrInvalid)
	}

	canonicalPayload := strings.Join([]string{
		input.TenantID,
		input.CheckoutIntentID,
		input.PaymentSessionID,
		input.Status,
	}, "\x1f")
	payloadDigest := sha256.Sum256([]byte(canonicalPayload))
	payloadHash = hex.EncodeToString(payloadDigest[:])

	if input.EventID != "" {
		return "wlt:" + input.EventID, payloadHash, nil
	}
	return "wlt-derived:" + payloadHash, payloadHash, nil
}

// BeginWltPaymentEventTx registers the WLT event in the same transaction that
// mutates checkout and coupon projections. A duplicate with the same payload is
// a safe replay; reusing the same event key for a different payload is rejected.
func BeginWltPaymentEventTx(
	ctx context.Context,
	tx *sql.Tx,
	input WltPaymentEventEnvelope,
) (eventKey string, replayed bool, err error) {
	input = normalizeWltPaymentEventEnvelope(input)
	eventKey, payloadHash, err := WltPaymentEventIdentity(input)
	if err != nil {
		return "", false, err
	}

	result, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_checkout_wlt_event_receipts (
			event_key, tenant_id, checkout_intent_id, payment_session_id,
			wlt_status, payload_hash, correlation_id
		) VALUES ($1,$2,$3::uuid,$4,$5,$6,$7)
		ON CONFLICT (event_key) DO NOTHING`,
		eventKey,
		input.TenantID,
		input.CheckoutIntentID,
		input.PaymentSessionID,
		input.Status,
		payloadHash,
		input.CorrelationID,
	)
	if err != nil {
		return "", false, err
	}
	inserted, err := result.RowsAffected()
	if err != nil {
		return "", false, err
	}
	if inserted == 1 {
		return eventKey, false, nil
	}

	var existingPayloadHash, existingTenantID, existingIntentID, existingSessionID, existingStatus string
	if err := tx.QueryRowContext(ctx, `
		SELECT payload_hash, tenant_id, checkout_intent_id::text, payment_session_id, wlt_status
		FROM dsh_checkout_wlt_event_receipts
		WHERE event_key=$1
		FOR UPDATE`, eventKey).Scan(
		&existingPayloadHash,
		&existingTenantID,
		&existingIntentID,
		&existingSessionID,
		&existingStatus,
	); err != nil {
		return "", false, err
	}
	if existingPayloadHash != payloadHash ||
		existingTenantID != input.TenantID ||
		existingIntentID != input.CheckoutIntentID ||
		existingSessionID != input.PaymentSessionID ||
		existingStatus != input.Status {
		return "", false, ErrWltEventReplayConflict
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_checkout_wlt_event_receipts
		SET delivery_attempt_count=delivery_attempt_count+1,
		    last_received_at=NOW(),
		    correlation_id=CASE WHEN $2='' THEN correlation_id ELSE $2 END
		WHERE event_key=$1`, eventKey, input.CorrelationID); err != nil {
		return "", false, err
	}
	return eventKey, true, nil
}

func MarkWltPaymentEventAppliedTx(
	ctx context.Context,
	tx *sql.Tx,
	eventKey string,
	input WltPaymentEventEnvelope,
) error {
	input = normalizeWltPaymentEventEnvelope(input)
	if strings.TrimSpace(eventKey) == "" {
		return ErrInvalid
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_checkout_wlt_event_receipts
		SET applied_at=COALESCE(applied_at,NOW()), last_received_at=NOW()
		WHERE event_key=$1 AND tenant_id=$2 AND checkout_intent_id=$3::uuid`,
		eventKey,
		input.TenantID,
		input.CheckoutIntentID,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return ErrNotFound
	}
	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_checkout_intents
		SET last_wlt_status=$1,
		    last_wlt_event_at=NOW(),
		    reconciliation_attempt_count=reconciliation_attempt_count+1
		WHERE id=$2::uuid AND tenant_id=$3`,
		input.Status,
		input.CheckoutIntentID,
		input.TenantID,
	)
	return err
}

func GetIntentForServiceTx(ctx context.Context, tx *sql.Tx, tenantID, intentID string) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	intentID = strings.TrimSpace(intentID)
	if tenantID == "" || intentID == "" {
		return nil, ErrInvalid
	}
	intent, err := scanIntent(tx.QueryRowContext(ctx, `
		SELECT id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id=$1::uuid AND tenant_id=$2`, intentID, tenantID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return intent, err
}

// ApplyWltPaymentEventTx changes only the DSH projection. It must be called in
// the same transaction as the event receipt and dependent operational effects.
func ApplyWltPaymentEventTx(
	ctx context.Context,
	tx *sql.Tx,
	tenantID,
	intentID,
	paymentSessionID,
	wltStatus string,
) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	intentID = strings.TrimSpace(intentID)
	paymentSessionID = strings.TrimSpace(paymentSessionID)
	wltStatus = strings.TrimSpace(wltStatus)
	if tenantID == "" || intentID == "" || paymentSessionID == "" || wltStatus == "" {
		return nil, ErrInvalid
	}

	targetState, intermediate, err := paymentEventTargetState(wltStatus)
	if err != nil {
		return nil, err
	}
	current, err := scanIntent(tx.QueryRowContext(ctx, `
		SELECT id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		       state, payment_method, wlt_payment_session_id,
		       delivery_address, note, version, created_at, updated_at
		FROM dsh_checkout_intents
		WHERE id=$1::uuid AND tenant_id=$2
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
		return current, nil
	}
	if current.State != StatePaymentPending {
		return nil, fmt.Errorf("%w: intent is not awaiting a payment outcome", ErrConflict)
	}

	intent, err := scanIntent(tx.QueryRowContext(ctx, `
		UPDATE dsh_checkout_intents
		SET state=$1, version=version+1, updated_at=NOW()
		WHERE id=$2::uuid AND tenant_id=$3 AND wlt_payment_session_id=$4
		  AND state='payment_pending'
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`,
		string(targetState), intentID, tenantID, paymentSessionID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent state changed concurrently", ErrConflict)
	}
	return intent, err
}
