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
	tenantID string,
	clientID string,
	paymentSessionID string,
) (*Intent, error) {
	tenantID = normalizeTenant(tenantID)
	if intentID == "" || tenantID == "" || clientID == "" || paymentSessionID == "" {
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
		WHERE id = $3::uuid AND tenant_id = $4 AND client_id = $5
		  AND (
		      state IN ('pending', 'wlt_handoff_failed', 'wlt_outcome_unknown')
		      OR (state = 'payment_pending' AND wlt_payment_session_id = $2)
		  )
		RETURNING id, tenant_id, client_id, cart_id::text, store_id::text, fulfillment_mode,
		          state, payment_method, wlt_payment_session_id,
		          delivery_address, note, version, created_at, updated_at`

	row := db.QueryRow(
		q,
		string(StatePaymentPending),
		paymentSessionID,
		intentID,
		tenantID,
		clientID,
	)
	intent, err := scanIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: intent not found, tenant mismatch, session mismatch, or not handoff-ready", ErrConflict)
	}
	return intent, err
}
