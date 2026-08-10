package checkout

import (
	"database/sql"
	"errors"
	"fmt"
)

// AttachWltPaymentSessionIdempotent binds the WLT-owned session once from any
// unresolved handoff state and treats an exact replay as success. A different
// session or a closed intent remains a conflict and must never overwrite the
// financial reference.
func AttachWltPaymentSessionIdempotent(
	db *sql.DB,
	intentID string,
	operatorContextID string,
	clientID string,
	paymentSessionID string,
) (*Intent, error) {
	operatorContextID = normalizeOperatorContext(operatorContextID)
	if intentID == "" || operatorContextID == "" || clientID == "" || paymentSessionID == "" {
		return nil, ErrInvalid
	}

	const q = `
		UPDATE dsh_checkout_intents
		SET state = $1,
		    wlt_payment_session_id = $2,
		    version = CASE
		        WHEN state = $1 AND wlt_payment_session_id = $2 THEN version
		        ELSE version + 1
		    END,
		    updated_at = CASE
		        WHEN state = $1 AND wlt_payment_session_id = $2 THEN updated_at
		        ELSE NOW()
		    END
		WHERE id = $3::uuid AND operator_context_id = $4 AND client_id = $5
		  AND (
		      state IN ('ready', 'blocked', 'draft', 'validating')
		      OR (state = 'confirming' AND wlt_payment_session_id = $2)
		  )
		RETURNING id, operator_context_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at, expires_at, preview_hash, validation_issues`

	row := db.QueryRow(
		q,
		string(StateConfirming),
		paymentSessionID,
		intentID,
		operatorContextID,
		clientID,
	)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, OperatorContext mismatch, session mismatch, or not handoff-ready", ErrConflict)
	}
	return intent, err
}
