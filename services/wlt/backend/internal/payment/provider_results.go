package payment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"wlt-api/internal/dshoutbox"
	"wlt-api/internal/ledger"
)

var ErrProviderEventConflict = errors.New("provider event identity already exists with a different payload")
var ErrIllegalProviderTransition = errors.New("provider result is not legal from the current payment-session state")
var ErrProviderTenantMismatch = errors.New("provider event tenant does not own the payment session")

type ProviderEventInput struct {
	EventID           string
	TenantID          string
	PaymentSessionID  string
	EventType         string
	ProviderStatus    string
	ProviderReference string
	PayloadHash       string
	SignatureTime     time.Time
	OccurredAt        *time.Time
	ProcessingSource  string
}

type ProviderResultApplication struct {
	Session             *PaymentSession
	IdempotentReplay    bool
	LedgerTransactionID string
}

// ApplyAuthoritativeProviderEvent is the only asynchronous/provider-readback
// path that may finalize a payment session. The session is locked and its
// tenant is verified before an event row is accepted. Provider event
// persistence, legal state transition, reconciliation resolution, capture
// ledger posting and DSH outbox projection commit or roll back together.
func ApplyAuthoritativeProviderEvent(ctx context.Context, db *sql.DB, input ProviderEventInput) (*ProviderResultApplication, error) {
	if input.EventID == "" || input.TenantID == "" || input.PaymentSessionID == "" || input.PayloadHash == "" {
		return nil, fmt.Errorf("eventId, tenantId, paymentSessionId and payloadHash are required")
	}
	if input.SignatureTime.IsZero() {
		input.SignatureTime = time.Now().UTC()
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	session, err := getSessionForUpdateTx(tx, input.PaymentSessionID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, nil
	}
	if session.TenantID != input.TenantID {
		return nil, ErrProviderTenantMismatch
	}

	inserted := false
	err = tx.QueryRowContext(ctx, `
		WITH inserted AS (
			INSERT INTO wlt_payment_provider_events
				(provider_event_id, tenant_id, payment_session_id, event_type, provider_status,
				 provider_reference, payload_hash, signature_timestamp, occurred_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT DO NOTHING
			RETURNING true
		)
		SELECT true FROM inserted
		UNION ALL SELECT false
		WHERE NOT EXISTS (SELECT 1 FROM inserted)
		LIMIT 1`,
		input.EventID, input.TenantID, input.PaymentSessionID, input.EventType,
		input.ProviderStatus, input.ProviderReference, input.PayloadHash,
		input.SignatureTime, input.OccurredAt,
	).Scan(&inserted)
	if err != nil {
		return nil, err
	}
	if !inserted {
		var existingHash, existingSessionID, existingTenantID string
		err = tx.QueryRowContext(ctx, `
			SELECT payload_hash, payment_session_id, tenant_id
			FROM wlt_payment_provider_events
			WHERE provider_event_id = $1`, input.EventID,
		).Scan(&existingHash, &existingSessionID, &existingTenantID)
		if err != nil {
			return nil, err
		}
		if existingHash != input.PayloadHash || existingSessionID != input.PaymentSessionID || existingTenantID != input.TenantID {
			return nil, ErrProviderEventConflict
		}
		ledgerTransactionID := ""
		if session.Status == "captured" {
			_ = tx.QueryRowContext(ctx, `SELECT COALESCE(capture_ledger_transaction_id, '') FROM wlt_payment_sessions WHERE id = $1`, session.ID).Scan(&ledgerTransactionID)
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &ProviderResultApplication{
			Session:             session,
			IdempotentReplay:    true,
			LedgerTransactionID: ledgerTransactionID,
		}, nil
	}

	if !legalAuthoritativeTransition(session.Status, input.ProviderStatus) {
		_, _ = tx.ExecContext(ctx, `
			UPDATE wlt_payment_provider_events
			SET processing_state = 'conflict', processing_result = $2, processed_at = NOW()
			WHERE provider_event_id = $1`, input.EventID, "illegal transition from "+session.Status)
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return nil, ErrIllegalProviderTransition
	}

	ledgerTransactionID := ""
	if session.Status != input.ProviderStatus {
		if input.ProviderStatus == "captured" {
			ledgerTransactionID, err = postCapturedProviderResult(ctx, tx, session, input.ProviderReference, input.EventID)
			if err != nil {
				return nil, err
			}
		} else {
			session, err = updateAuthoritativeSessionState(ctx, tx, session, input.ProviderStatus, input.ProviderReference, input.EventID)
			if err != nil {
				return nil, err
			}
		}
	} else if input.ProviderStatus == "captured" {
		_ = tx.QueryRowContext(ctx, `SELECT COALESCE(capture_ledger_transaction_id, '') FROM wlt_payment_sessions WHERE id = $1`, session.ID).Scan(&ledgerTransactionID)
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE wlt_reconciliation_cases
		SET status = 'resolved',
		    resolution = $2,
		    resolution_action = CASE WHEN $3 IN ('authorized','captured') THEN 'confirmed_success' ELSE 'confirmed_failed' END,
		    resolution_note = $4,
		    resolved_at = NOW(), updated_at = NOW()
		WHERE payment_session_id = $1 AND status = 'open'`,
		session.ID, "authoritative provider status: "+input.ProviderStatus, input.ProviderStatus,
		"resolved by "+input.ProcessingSource+" event "+input.EventID,
	); err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `
		UPDATE wlt_payment_provider_events
		SET processing_state = 'applied', processing_result = $2, processed_at = NOW()
		WHERE provider_event_id = $1`, input.EventID, "session status "+input.ProviderStatus); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &ProviderResultApplication{Session: session, LedgerTransactionID: ledgerTransactionID}, nil
}

func legalAuthoritativeTransition(current, next string) bool {
	if current == next {
		return true
	}
	switch next {
	case "authorized":
		return current == "reference_created" || current == "pending_provider" || current == "authorization_pending" || current == "provider_result_unknown"
	case "captured":
		return current == "reference_created" || current == "pending_provider" || current == "authorization_pending" || current == "authorized" || current == "capture_pending" || current == "provider_result_unknown"
	case "failed":
		return current == "reference_created" || current == "pending_provider" || current == "authorization_pending" || current == "authorized" || current == "capture_pending" || current == "provider_result_unknown"
	case "expired":
		return current == "reference_created" || current == "pending_provider" || current == "authorization_pending" || current == "authorized" || current == "provider_result_unknown"
	default:
		return false
	}
}

func getSessionForUpdateTx(tx *sql.Tx, sessionID string) (*PaymentSession, error) {
	return scanSessionNullable(tx.QueryRow(`
		SELECT id, checkout_intent_id, special_request_id, tenant_id, client_id,
		       store_id, payment_method, status, provider_reference,
		       amount_minor_units, currency, captured_at, created_at, updated_at
		FROM wlt_payment_sessions WHERE id = $1 FOR UPDATE`, sessionID))
}

func scanSessionNullable(row *sql.Row) (*PaymentSession, error) {
	session, err := scanSession(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return session, err
}

func postCapturedProviderResult(ctx context.Context, tx *sql.Tx, session *PaymentSession, providerReference, eventID string) (string, error) {
	if session.AmountMinorUnits <= 0 || session.Currency == "" {
		return "", fmt.Errorf("captured session has invalid accounting amount or currency")
	}
	ledgerTransactionID, err := ledger.PostLedgerTransaction(ctx, tx, "payment_captured", "payment_session", session.ID, []ledger.LedgerLine{
		{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: session.AmountMinorUnits, Currency: session.Currency},
		{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: session.AmountMinorUnits, Currency: session.Currency},
	}, ledger.Actor{ID: "wlt", Type: "service"})
	if err != nil {
		return "", fmt.Errorf("post capture ledger transaction: %w", err)
	}
	row := tx.QueryRowContext(ctx, `
		UPDATE wlt_payment_sessions
		SET status = 'captured', provider_reference = $2, captured_at = COALESCE(captured_at, NOW()),
		    capture_ledger_transaction_id = $3, last_provider_event_id = $4,
		    last_provider_status = 'captured', updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, special_request_id, tenant_id, client_id,
		          store_id, payment_method, status, provider_reference,
		          amount_minor_units, currency, captured_at, created_at, updated_at`,
		session.ID, providerReference, ledgerTransactionID, eventID)
	updated, err := scanSession(row)
	if err != nil {
		return "", err
	}
	*session = *updated
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeCaptured, session.ID, session.TenantID, session.CheckoutIntentID, session.SpecialRequestID); err != nil {
		return "", err
	}
	return ledgerTransactionID, nil
}

func updateAuthoritativeSessionState(ctx context.Context, tx *sql.Tx, session *PaymentSession, status, providerReference, eventID string) (*PaymentSession, error) {
	row := tx.QueryRowContext(ctx, `
		UPDATE wlt_payment_sessions
		SET status = $2, provider_reference = CASE WHEN $3 = '' THEN provider_reference ELSE $3 END,
		    last_provider_event_id = $4, last_provider_status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, checkout_intent_id, special_request_id, tenant_id, client_id,
		          store_id, payment_method, status, provider_reference,
		          amount_minor_units, currency, captured_at, created_at, updated_at`,
		session.ID, status, providerReference, eventID)
	updated, err := scanSession(row)
	if err != nil {
		return nil, err
	}
	var eventType string
	switch status {
	case "failed":
		eventType = dshoutbox.EventTypeFailed
	case "expired":
		eventType = dshoutbox.EventTypeExpired
	}
	if eventType != "" {
		if err := dshoutbox.Enqueue(tx, eventType, updated.ID, updated.TenantID, updated.CheckoutIntentID, updated.SpecialRequestID); err != nil {
			return nil, err
		}
	}
	return updated, nil
}
