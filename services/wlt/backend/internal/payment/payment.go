package payment

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/dshoutbox"
	"wlt-api/internal/provider"
	"wlt-api/internal/refund"
	"wlt-api/internal/shared"
)

// ErrNotAuthorizable is returned when AuthorizeSessionWithProvider is called
// on a session that is not in a state from which authorization can proceed
// (i.e. not reference_created or pending_provider) -- for example, a session
// that is already authorized/captured, or one already failed/expired.
var ErrNotAuthorizable = errors.New("payment session is not in an authorizable state")

// ErrNotExpirable is returned when ExpireSession (or the expire branch of
// CancelOrderFinanciallyWithContext) is called on a session that is not in a
// state from which expiry can proceed (i.e. not reference_created, pending_provider, or
// authorized) -- for example, a session that is already captured, which must
// never be silently flipped to expired and lose its true captured state.
var ErrNotExpirable = errors.New("payment session is not in an expirable state")

// ErrSessionClaimConflict is returned by claimSession when the session is
// not currently in one of the caller's allowed source statuses -- either
// because it was never eligible, or because a concurrent request already
// claimed it first (see claimSession's doc comment).
var ErrSessionClaimConflict = errors.New("payment session could not be claimed for this operation")

// dshNotifier delivery is handled by the durable outbox (internal/dshoutbox):
// each terminal transition below enqueues an event in the same transaction
// as its status update, and a background worker drains the outbox and calls
// dshnotify.Client.Notify with retry. This keeps the WLT transition itself
// free of any dependency on DSH being reachable.

// strOrEmpty dereferences a nullable text-column pointer (CheckoutIntentID /
// SpecialRequestID), returning "" for nil rather than requiring every caller
// to nil-check. Used only where a plain string is needed (e.g. the provider
// request payload); the JSON-marshaled PaymentSession itself keeps the
// pointer so a nil source identity serializes as null, not "".
func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func scanSession(row *sql.Row) (*PaymentSession, error) {
	var s PaymentSession
	err := row.Scan(
		&s.ID,
		&s.CheckoutIntentID,
		&s.SpecialRequestID,
		&s.OperatorContextID,
		&s.ClientID,
		&s.StoreID,
		&s.PaymentMethod,
		&s.Status,
		&s.ProviderReference,
		&s.AmountMinorUnits,
		&s.Currency,
		&s.FinancialPurpose,
		&s.CapturedAt,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func getSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	row := db.QueryRow(selectCols, sessionID)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

// sessionCols is the single column list every payment-session read and
// RETURNING clause shares. scanSession scans exactly these columns in exactly
// this order, so keeping one constant is what prevents a new column from being
// added to the scanner while one of the seven producing statements still
// selects the old set.
const sessionCols = `id, checkout_intent_id, special_request_id,
               operator_context_id,
               client_id, store_id, payment_method,
               status, provider_reference, amount_minor_units, currency,
               financial_purpose, captured_at, created_at, updated_at`

const selectCols = `
        SELECT ` + sessionCols + `
        FROM wlt_payment_sessions
        WHERE id = $1`

// claimSession locks sessionID (SELECT ... FOR UPDATE), verifies its status
// is one of allowedFrom, and atomically flips it to pendingStatus -- all
// inside a transaction that commits before this function returns, so the
// row lock is released quickly rather than held across the subsequent
// provider network call (holding a Postgres lock across a slow external
// HTTP call would itself be a availability/contention risk).
//
// A concurrent claim attempt on the same session blocks on the
// SELECT ... FOR UPDATE until this transaction commits, then observes the
// new pendingStatus and fails the allowedFrom check (ErrSessionClaimConflict)
// -- so at most one caller can ever successfully claim a session for a given
// operation, closing the authorize/capture double-call race.
func claimSession(db *sql.DB, sessionID string, allowedFrom []string, pendingStatus string) (*PaymentSession, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	row := tx.QueryRow(selectCols+` FOR UPDATE`, sessionID)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	allowed := false
	for _, st := range allowedFrom {
		if s.Status == st {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, ErrSessionClaimConflict
	}

	if _, err := tx.Exec(`UPDATE wlt_payment_sessions SET status = $2, updated_at = NOW() WHERE id = $1`, sessionID, pendingStatus); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	s.Status = pendingStatus
	return s, nil
}

// AuthorizeSessionWithProvider authorizes sessionID with the payment
// provider through the capability-checked CashInRail. The amount and currency
// are always read from the session's own row (never from caller input) so a
// client cannot tamper with the amount actually authorized by supplying a
// different value in the request body. The session must be in an authorizable
// status (reference_created or pending_provider); anything else -- already
// authorized/captured, or failed/expired -- returns ErrNotAuthorizable (409,
// not silently retried).
//
// The session is first claimed into 'authorization_pending' (see
// claimSession) before the provider is ever called, so two concurrent
// requests on the same session cannot both reach the provider call below --
// the second one's claim fails with ErrSessionClaimConflict.
// CaptureSessionWithProvider claims the session into 'capture_pending' (see
// claimSession) before calling the provider, closing the same double-call
// race described on AuthorizeSessionWithProvider.
// isAmbiguousProviderError distinguishes a clean provider decline from a
// genuinely ambiguous outcome.
//
//   - A provider.Error means the provider's HTTP response actually came back
//     (status >= 400) with a decoded error body: the provider explicitly
//     rejected the request, so the session can safely be marked 'failed'.
//   - Anything else -- a transport-level error from the HTTP round trip
//     (context.DeadlineExceeded, connection refused/reset, a body that
//     failed to decode), or authorizeProvider/captureProvider's own local
//     validation error when the provider responded 2xx but with an
//     unexpected status/missing reference -- means WLT sent the request but
//     does not know whether the provider actually processed it. Marking
//     that 'failed' risks silently losing a real charge, and letting a
//     naive retry re-fire the same provider call risks a double charge.
//     Both cases are treated as ambiguous here.
func isAmbiguousProviderError(err error) bool {
	var providerErr provider.Error
	return !errors.As(err, &providerErr)
}

// markSessionFailedAndNotify marks sessionID failed and enqueues the DSH
// outbox event in the same transaction, so a lost DSH webhook can never
// happen without the WLT-side status transition also being rolled back.
// expectedStatus guards the UPDATE (e.g. 'authorization_pending' or
// 'capture_pending') so this only ever affects the session this caller
// actually claimed via claimSession.
// withDurableRecoveryError preserves the provider/local cause while making a
// failed recovery write impossible to hide from the caller. Returning the
// original error alone would leave an ambiguous session without a durable
// recovery record and would invite an unsafe retry.
func withDurableRecoveryError(cause error, recovery func() error) error {
	if recoveryErr := recovery(); recoveryErr != nil {
		return errors.Join(cause, fmt.Errorf("durable provider recovery failed: %w", recoveryErr))
	}
	return cause
}

func recoverAfterFinalizationFailure(tx *sql.Tx, cause error, recovery func() error) error {
	if tx != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			return errors.Join(cause, fmt.Errorf("rollback of failed financial finalization failed: %w", rollbackErr))
		}
	}
	return withDurableRecoveryError(cause, recovery)
}

func markSessionFailedAndNotify(db *sql.DB, session *PaymentSession, expectedStatus string) error {
	if session == nil {
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.Exec(`UPDATE wlt_payment_sessions SET status = 'failed', last_provider_status = 'failed', updated_at = NOW() WHERE id = $1 AND status = $2`, session.ID, expectedStatus)
	if err != nil {
		return err
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		return fmt.Errorf("session %s was no longer %s when marking failed", session.ID, expectedStatus)
	}
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeFailed, session.ID, session.OperatorContextID, session.CheckoutIntentID, session.SpecialRequestID); err != nil {
		return err
	}
	return tx.Commit()
}

// markSessionResultUnknownAndOpenCase marks sessionID 'provider_result_unknown'
// and opens a wlt_reconciliation_cases row in the same transaction, for the
// ambiguous case where a provider call errored without a clean decline
// response (see isAmbiguousProviderError) -- we sent the request but don't
// know if the provider actually processed it.
//
// Deliberately, this does NOT enqueue any DSH outbox event. DSH's checkout
// intent simply remains in its existing 'payment_pending' (awaiting-outcome)
// state rather than being told anything definitive, because we genuinely do
// not know the outcome yet. That is correct until a human resolves the
// reconciliation case out-of-band and the session transitions to its true
// final state through the existing authorize/capture/expire paths -- do not
// "fix" this by adding a notification here.
func markSessionResultUnknownAndOpenCase(db *sql.DB, session *PaymentSession, operation string, cause error, expectedStatus string) error {
	if session == nil {
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.Exec(`UPDATE wlt_payment_sessions SET status = 'provider_result_unknown', last_provider_status = 'unknown', updated_at = NOW() WHERE id = $1 AND status = $2`, session.ID, expectedStatus)
	if err != nil {
		return err
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		return fmt.Errorf("session %s was no longer %s when marking provider_result_unknown", session.ID, expectedStatus)
	}
	reason := ""
	if cause != nil {
		reason = cause.Error()
	}
	if _, err := tx.Exec(`
                INSERT INTO wlt_reconciliation_cases (payment_session_id, operation, trigger_reason)
                VALUES ($1, $2, $3)`,
		session.ID, operation, reason,
	); err != nil {
		return err
	}
	return tx.Commit()
}

// captureSessionAndNotify commits the captured transition and enqueues the
// DSH outbox event atomically. Guarded on status = 'capture_pending' so it
// only finalizes the session this caller actually claimed via claimSession.
// sendProviderError is handled by shared.SendProviderError.

// ExpireSession commits the expired transition and enqueues the DSH outbox
// event atomically. Only sessions in reference_created, pending_provider, or
// authorized may be expired; anything else (already captured, already
// expired, failed, or COD-finalized, etc.) returns ErrNotExpirable instead of
// unconditionally overwriting the session's true status.
func ExpireSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
	if sessionID == "" {
		return nil, fmt.Errorf("paymentSessionId is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	s, err := expireSessionTx(tx, sessionID)
	if err != nil {
		return nil, err
	}
	if s == nil {
		return nil, nil
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s, nil
}

// expireSessionTx performs the guarded expire transition within an
// already-open transaction. It is shared by ExpireSession and the expire
// branch of CancelOrderFinanciallyWithContext so the guard/UPDATE/outbox-enqueue
// SQL is defined in exactly one place.
func expireSessionTx(tx *sql.Tx, sessionID string) (*PaymentSession, error) {
	var status string
	err := tx.QueryRow(`SELECT status FROM wlt_payment_sessions WHERE id = $1 FOR UPDATE`, sessionID).Scan(&status)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if status != "reference_created" && status != "pending_provider" && status != "authorized" {
		return nil, ErrNotExpirable
	}
	const q = `
                UPDATE wlt_payment_sessions
                SET status = 'expired', updated_at = NOW()
                WHERE id = $1
                RETURNING ` + sessionCols
	row := tx.QueryRow(q, sessionID)
	s, err := scanSession(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := dshoutbox.Enqueue(tx, dshoutbox.EventTypeExpired, s.ID, s.OperatorContextID, s.CheckoutIntentID, s.SpecialRequestID); err != nil {
		return nil, err
	}
	return s, nil
}

// CancelForOrderResult is the response shape for CancelOrderFinanciallyWithContext: the
// action taken ("expired", "refund_requested", or "none") plus whichever of
// PaymentSession/Refund/SessionStatus is relevant for that action.
type CancelForOrderResult struct {
	Action         string          `json:"action"`
	PaymentSession *PaymentSession `json:"paymentSession,omitempty"`
	Refund         *refund.Refund  `json:"refund,omitempty"`
	SessionStatus  string          `json:"sessionStatus,omitempty"`
}

// HTTP handlers

func HandleExpireSession(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, err := ExpireSession(db, r.PathValue("paymentSessionId"))
		if errors.Is(err, ErrNotExpirable) {
			shared.SendError(w, http.StatusConflict, "NOT_EXPIRABLE", "payment session is not in an expirable state")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}
