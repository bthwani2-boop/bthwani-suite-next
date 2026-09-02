package specialrequests

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"dsh-api/internal/opctx"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"dsh-api/internal/operationaloutbox"
	"dsh-api/internal/wlt"
)

// SpecialRequestSagaOperation identifies the cross-service mutation governed by
// a durable command. The command id is stable across retries and restarts.
type SpecialRequestSagaOperation string

const (
	SagaQuoteIssueAttach    SpecialRequestSagaOperation = "quote_issue_attach"
	SagaPaymentCreateAttach SpecialRequestSagaOperation = "payment_session_create_attach"
	SagaCancel              SpecialRequestSagaOperation = "cancel"
	sagaMaxAttempts                                     = 10
	sagaLease                                           = 2 * time.Minute
)

type SpecialRequestSagaState string

const (
	SagaRequested              SpecialRequestSagaState = "requested"
	SagaDispatched             SpecialRequestSagaState = "dispatched"
	SagaRemoteApplied          SpecialRequestSagaState = "remote_applied"
	SagaLocallyConfirmed       SpecialRequestSagaState = "locally_confirmed"
	SagaCompleted              SpecialRequestSagaState = "completed"
	SagaRetryableFailure       SpecialRequestSagaState = "retryable_failure"
	SagaReconciliationRequired SpecialRequestSagaState = "reconciliation_required"
	SagaTerminalFailure        SpecialRequestSagaState = "terminal_failure"
)

var (
	ErrSagaConflict = errors.New("special request saga command conflict")
	ErrSagaBusy     = errors.New("special request saga is already being processed")
)

type SpecialRequestSaga struct {
	ID                string
	OperatorContextID string
	SpecialRequestID  string
	Operation         SpecialRequestSagaOperation
	CommandID         string
	Payload           json.RawMessage
	PayloadHash       string
	State             SpecialRequestSagaState
	RemoteReference   string
	AttemptCount      int
	LastError         string
	NextAttemptAt     time.Time
	CompletedAt       *time.Time
	UpdatedAt         time.Time
}

type QuoteSagaInput struct {
	OperatorContextID        string
	SpecialRequestID         string
	ClientID                 string
	ExpectedVersion          int
	CommandID                string
	CorrelationID            string
	PolicyID                 string
	ProposedAmountMinorUnits int64
	ProposedCurrency         string
	ProposalReason           string
}

type PaymentSessionSagaInput struct {
	OperatorContextID string
	SpecialRequestID  string
	ClientID          string
	ExpectedVersion   int
	CommandID         string
	CorrelationID     string
	StoreID           string
	PaymentMethod     string
	PricingQuoteID    string
	AmountMinorUnits  int64
	Currency          string
}

type CancelSagaInput struct {
	OperatorContextID string
	SpecialRequestID  string
	ClientID          string
	ExpectedVersion   *int
	CommandID         string
	CorrelationID     string
	PaymentSessionID  string
	Reason            string
}

func sagaPayloadHash(payload []byte) string {
	digest := sha256.Sum256(payload)
	return hex.EncodeToString(digest[:])
}

func validateSagaIdentity(operatorContextID, requestID, commandID string) error {
	if strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(requestID) == "" {
		return fmt.Errorf("%w: OperatorContext and special request are required", ErrInvalid)
	}
	commandID = strings.TrimSpace(commandID)
	if len(commandID) < 8 || len(commandID) > 200 {
		return fmt.Errorf("%w: command id must contain between 8 and 200 characters", ErrInvalid)
	}
	return nil
}

func scanSaga(scan func(...any) error) (*SpecialRequestSaga, error) {
	var saga SpecialRequestSaga
	var payload string
	var completedAt sql.NullTime
	if err := scan(&saga.ID, &saga.OperatorContextID, &saga.SpecialRequestID, &saga.Operation,
		&saga.CommandID, &payload, &saga.PayloadHash, &saga.State, &saga.RemoteReference,
		&saga.AttemptCount, &saga.LastError, &saga.NextAttemptAt, &completedAt, &saga.UpdatedAt); err != nil {
		return nil, err
	}
	saga.Payload = json.RawMessage(payload)
	if completedAt.Valid {
		value := completedAt.Time
		saga.CompletedAt = &value
	}
	return &saga, nil
}

const sagaSelect = `
	SELECT id::text, operator_context_id, special_request_id::text, operation,
	       command_id, payload::text, payload_hash, state,
	       COALESCE(remote_reference, ''), attempt_count, COALESCE(last_error, ''),
	       next_attempt_at, completed_at, updated_at
	FROM dsh_special_request_sagas`

func getSaga(ctx context.Context, db *sql.DB, id string) (*SpecialRequestSaga, error) {
	return scanSaga(db.QueryRowContext(ctx, sagaSelect+` WHERE id = $1::uuid`, id).Scan)
}

func loadOrCreateSaga(ctx context.Context, db *sql.DB, operatorContextID, requestID string, operation SpecialRequestSagaOperation, commandID string, input any) (*SpecialRequestSaga, bool, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	requestID = strings.TrimSpace(requestID)
	commandID = strings.TrimSpace(commandID)
	if err := validateSagaIdentity(operatorContextID, requestID, commandID); err != nil {
		return nil, false, err
	}
	payload, err := json.Marshal(input)
	if err != nil {
		return nil, false, fmt.Errorf("marshal saga payload: %w", err)
	}
	payloadHash := sagaPayloadHash(payload)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer func() { _ = tx.Rollback() }()

	var id string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_special_request_sagas
			(operator_context_id, special_request_id, operation, command_id, payload, payload_hash)
		VALUES ($1, $2::uuid, $3, $4, $5::jsonb, $6)
		ON CONFLICT (operator_context_id, command_id) DO NOTHING
		RETURNING id::text`, operatorContextID, requestID, operation, commandID, string(payload), payloadHash).Scan(&id)
	if err == sql.ErrNoRows {
		saga, loadErr := scanSaga(tx.QueryRowContext(ctx, sagaSelect+` WHERE operator_context_id = $1 AND command_id = $2 FOR UPDATE`, operatorContextID, commandID).Scan)
		if loadErr != nil {
			return nil, false, loadErr
		}
		if saga.Operation != operation || saga.SpecialRequestID != requestID || saga.PayloadHash != payloadHash {
			return nil, false, fmt.Errorf("%w: command id is already bound to a different operation or payload", ErrSagaConflict)
		}
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return saga, true, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("create special request saga: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO dsh_special_request_saga_outbox (saga_id, status) VALUES ($1::uuid, 'blocked')`, id); err != nil {
		return nil, false, fmt.Errorf("create special request saga outbox: %w", err)
	}
	saga, err := scanSaga(tx.QueryRowContext(ctx, sagaSelect+` WHERE id = $1::uuid`, id).Scan)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return saga, false, nil
}

func StartQuoteSaga(ctx context.Context, db *sql.DB, input QuoteSagaInput) (*SpecialRequestSaga, bool, error) {
	return loadOrCreateSaga(ctx, db, input.OperatorContextID, input.SpecialRequestID, SagaQuoteIssueAttach, input.CommandID, input)
}

func StartPaymentSessionSaga(ctx context.Context, db *sql.DB, input PaymentSessionSagaInput) (*SpecialRequestSaga, bool, error) {
	return loadOrCreateSaga(ctx, db, input.OperatorContextID, input.SpecialRequestID, SagaPaymentCreateAttach, input.CommandID, input)
}

func StartCancelSaga(ctx context.Context, db *sql.DB, input CancelSagaInput) (*SpecialRequestSaga, bool, error) {
	return loadOrCreateSaga(ctx, db, input.OperatorContextID, input.SpecialRequestID, SagaCancel, input.CommandID, input)
}

func GetSaga(ctx context.Context, db *sql.DB, id string) (*SpecialRequestSaga, error) {
	return getSaga(ctx, db, id)
}

// ActivateSaga is called only after the initiating DSH intent has committed.
// A blocked outbox entry cannot race the local state transition.
func ActivateSaga(ctx context.Context, db *sql.DB, sagaID string) error {
	result, err := db.ExecContext(ctx, `UPDATE dsh_special_request_saga_outbox SET status = 'pending', next_attempt_at = NOW(), updated_at = NOW() WHERE saga_id = $1::uuid AND status = 'blocked'`, sagaID)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("%w: saga is not awaiting activation", ErrSagaConflict)
	}
	return nil
}

// claimSaga is the single dispatch gate. A worker and an HTTP retry cannot both
// execute the same command because the outbox lease and saga state are claimed
// under one row lock.
func claimSaga(ctx context.Context, db *sql.DB, sagaID string) (*SpecialRequestSaga, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var saga *SpecialRequestSaga
	row := tx.QueryRowContext(ctx, sagaSelect+` WHERE id = $1::uuid FOR UPDATE`, sagaID)
	saga, err = scanSaga(row.Scan)
	if err != nil {
		return nil, err
	}
	if saga.State == SagaCompleted || saga.State == SagaTerminalFailure || saga.State == SagaReconciliationRequired {
		return saga, nil
	}
	if saga.State == SagaLocallyConfirmed {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		if err := markCompleted(ctx, db, saga.ID); err != nil {
			return nil, err
		}
		return getSaga(ctx, db, saga.ID)
	}
	var next time.Time
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_special_request_saga_outbox
		SET status = 'in_flight', attempt_count = attempt_count + 1,
		    next_attempt_at = NOW() + $2::interval, updated_at = NOW()
		WHERE saga_id = $1::uuid
		  AND status IN ('pending', 'in_flight')
		  AND next_attempt_at <= NOW()
		RETURNING next_attempt_at`, sagaID, sagaLease.String()).Scan(&next)
	if err == sql.ErrNoRows {
		return nil, ErrSagaBusy
	}
	if err != nil {
		return nil, err
	}
	if saga.State == SagaRequested || saga.State == SagaRetryableFailure {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_special_request_sagas SET state = 'dispatched', attempt_count = attempt_count + 1, updated_at = NOW() WHERE id = $1::uuid`, sagaID); err != nil {
			return nil, err
		}
		saga.State = SagaDispatched
		saga.AttemptCount++
	}
	saga.NextAttemptAt = next
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return saga, nil
}

func markRemoteApplied(ctx context.Context, db *sql.DB, sagaID, remoteReference string) error {
	_, err := db.ExecContext(ctx, `UPDATE dsh_special_request_sagas SET state = 'remote_applied', remote_reference = $2, last_error = NULL, updated_at = NOW() WHERE id = $1::uuid AND state IN ('dispatched', 'remote_applied')`, sagaID, remoteReference)
	return err
}

func markLocallyConfirmed(ctx context.Context, db *sql.DB, sagaID string) error {
	_, err := db.ExecContext(ctx, `UPDATE dsh_special_request_sagas SET state = 'locally_confirmed', updated_at = NOW() WHERE id = $1::uuid AND state = 'remote_applied'`, sagaID)
	return err
}

func markCompleted(ctx context.Context, db *sql.DB, sagaID string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_special_request_sagas
		SET state = 'completed', completed_at = COALESCE(completed_at, NOW()), last_error = NULL, updated_at = NOW()
		WHERE id = $1::uuid AND state IN ('remote_applied', 'locally_confirmed')`, sagaID)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `UPDATE dsh_special_request_saga_outbox SET status = 'sent', sent_at = COALESCE(sent_at, NOW()), last_error = NULL, updated_at = NOW() WHERE saga_id = $1::uuid`, sagaID)
	return err
}

func markSagaFailure(ctx context.Context, db *sql.DB, sagaID string, cause error) error {
	message := "unknown saga failure"
	if cause != nil {
		message = cause.Error()
	}
	var attempt int
	if err := db.QueryRowContext(ctx, `SELECT attempt_count FROM dsh_special_request_sagas WHERE id = $1::uuid`, sagaID).Scan(&attempt); err != nil {
		return err
	}
	if attempt >= sagaMaxAttempts {
		_, err := db.ExecContext(ctx, `UPDATE dsh_special_request_sagas SET state = 'reconciliation_required', last_error = $2, updated_at = NOW() WHERE id = $1::uuid`, sagaID, message)
		if err != nil {
			return err
		}
		_, err = db.ExecContext(ctx, `UPDATE dsh_special_request_saga_outbox SET status = 'failed', failed_at = NOW(), last_error = $2, updated_at = NOW() WHERE saga_id = $1::uuid`, sagaID, message)
		return err
	}
	backoff := time.Duration(1<<uint(min(attempt, 9))) * time.Second
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_special_request_sagas
		SET state = 'retryable_failure', last_error = $2, next_attempt_at = NOW() + $3::interval, updated_at = NOW()
		WHERE id = $1::uuid`, sagaID, message, backoff.String())
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `
		UPDATE dsh_special_request_saga_outbox
		SET status = 'pending', last_error = $2, next_attempt_at = NOW() + $3::interval, updated_at = NOW()
		WHERE saga_id = $1::uuid`, sagaID, message, backoff.String())
	return err
}

func decodeSagaPayload(saga *SpecialRequestSaga, target any) error {
	if err := json.Unmarshal(saga.Payload, target); err != nil {
		return fmt.Errorf("decode saga payload: %w", err)
	}
	return nil
}

func quoteMatches(input QuoteSagaInput, quote *wlt.SpecialRequestQuote) bool {
	return quote != nil && quote.ID != "" && quote.OperatorContextID == input.OperatorContextID && quote.SpecialRequestID == input.SpecialRequestID && quote.ClientID == input.ClientID && quote.PolicyID == input.PolicyID && quote.ProposedAmountMinorUnits == input.ProposedAmountMinorUnits && quote.ProposedCurrency == input.ProposedCurrency && quote.Status == "active" && time.Now().Before(quote.ExpiresAt)
}

func paymentMatches(input PaymentSessionSagaInput, session *wlt.PaymentSession) bool {
	return session != nil && session.ID != "" && session.StoreID == input.StoreID && session.PaymentMethod == input.PaymentMethod && session.AmountMinorUnits == input.AmountMinorUnits && session.Currency == input.Currency && session.Status != "failed" && session.Status != "expired"
}

func executeQuoteSaga(ctx context.Context, db *sql.DB, client *wlt.Client, saga *SpecialRequestSaga, input QuoteSagaInput) error {
	wltCtx := opctx.WithOperatorContext(ctx, input.OperatorContextID)
	var quote *wlt.SpecialRequestQuote
	var err error
	if saga.State == SagaRemoteApplied {
		quote, err = client.GetActiveSpecialRequestQuote(wltCtx, input.SpecialRequestID)
	} else {
		// A dispatched command may have reached WLT before the process failed. Read
		// back first; only issue again when the authoritative readback is absent.
		quote, err = client.GetActiveSpecialRequestQuote(wltCtx, input.SpecialRequestID)
		if err != nil || !quoteMatches(input, quote) {
			_, err = client.IssueSpecialRequestQuote(wltCtx, wlt.SpecialRequestQuoteInput{
				SpecialRequestID: input.SpecialRequestID, ClientID: input.ClientID, PolicyID: input.PolicyID,
				ProposedAmountMinorUnits: input.ProposedAmountMinorUnits, ProposedCurrency: input.ProposedCurrency,
				ProposalReason: input.ProposalReason, CorrelationID: input.CorrelationID, IdempotencyKey: input.CommandID,
			})
			if err != nil {
				return err
			}
			quote, err = client.GetActiveSpecialRequestQuote(wltCtx, input.SpecialRequestID)
		}
	}
	if err != nil {
		return err
	}
	if !quoteMatches(input, quote) {
		return fmt.Errorf("WLT quote readback does not match the durable command")
	}
	if err := markRemoteApplied(ctx, db, saga.ID, quote.ID); err != nil {
		return err
	}
	repo := NewPostgresRepository(db)
	current, err := repo.GetInOperatorContext(ctx, input.OperatorContextID, input.SpecialRequestID)
	if err != nil {
		return err
	}
	if current.WltQuoteID == nil || *current.WltQuoteID != quote.ID {
		if _, err := NewService(repo).AttachWltQuoteInOperatorContext(ctx, input.OperatorContextID, input.SpecialRequestID, current.Version, quote); err != nil {
			return err
		}
	}
	if err := markLocallyConfirmed(ctx, db, saga.ID); err != nil {
		return err
	}
	return markCompleted(ctx, db, saga.ID)
}

func executePaymentSaga(ctx context.Context, db *sql.DB, client *wlt.Client, saga *SpecialRequestSaga, input PaymentSessionSagaInput) error {
	wltCtx := opctx.WithOperatorContext(ctx, input.OperatorContextID)
	var session *wlt.PaymentSession
	if saga.RemoteReference != "" {
		session, _ = client.GetPaymentSession(wltCtx, saga.RemoteReference)
	}
	if session == nil {
		created, err := client.CreatePaymentSession(wltCtx, wlt.CreatePaymentSessionInput{
			SpecialRequestID: input.SpecialRequestID, ClientID: input.ClientID, StoreID: input.StoreID,
			PaymentMethod: input.PaymentMethod, AmountMinorUnits: input.AmountMinorUnits, Currency: input.Currency,
			PricingQuoteID: input.PricingQuoteID, CorrelationID: input.CorrelationID, IdempotencyKey: input.CommandID,
		})
		if err != nil {
			// The remote call may have committed before the response was lost.
			// Without a session id, the deterministic WLT idempotency command is
			// retried; WLT owns deduplication and the readback closes the gap.
			return err
		}
		session, err = client.GetPaymentSession(wltCtx, created.ID)
		if err != nil {
			return err
		}
	}
	if !paymentMatches(input, session) {
		return fmt.Errorf("WLT payment-session readback does not match the durable command")
	}
	if err := markRemoteApplied(ctx, db, saga.ID, session.ID); err != nil {
		return err
	}
	repo := NewPostgresRepository(db)
	current, err := repo.GetInOperatorContext(ctx, input.OperatorContextID, input.SpecialRequestID)
	if err != nil {
		return err
	}
	if current.WltPaymentSessionID == nil || *current.WltPaymentSessionID != session.ID {
		if _, err := NewService(repo).AttachWltPaymentSessionInOperatorContext(ctx, input.OperatorContextID, input.SpecialRequestID, current.Version, session.ID); err != nil {
			return err
		}
	}
	if err := markLocallyConfirmed(ctx, db, saga.ID); err != nil {
		return err
	}
	return markCompleted(ctx, db, saga.ID)
}

func executeCancelSaga(ctx context.Context, db *sql.DB, client *wlt.Client, saga *SpecialRequestSaga, input CancelSagaInput) error {
	wltCtx := opctx.WithOperatorContext(ctx, input.OperatorContextID)
	if input.PaymentSessionID != "" {
		if err := client.ExpireSession(wltCtx, input.PaymentSessionID, input.CorrelationID); err != nil {
			// Confirm a timeout/ambiguous response through WLT readback before
			// retrying the mutation.
			session, readErr := client.GetPaymentSession(wltCtx, input.PaymentSessionID)
			if readErr != nil || (session.Status != "expired" && session.Status != "cancelled") {
				return err
			}
		}
	}
	// A request without a WLT session still has a completed remote step: the
	// cancellation command is durable and no provider mutation is required.
	if err := markRemoteApplied(ctx, db, saga.ID, input.PaymentSessionID); err != nil {
		return err
	}
	if _, err := applyCancellationLocally(ctx, db, input.OperatorContextID, input.SpecialRequestID, input.ClientID, input.ExpectedVersion); err != nil {
		return err
	}
	if err := markLocallyConfirmed(ctx, db, saga.ID); err != nil {
		return err
	}
	return markCompleted(ctx, db, saga.ID)
}

// DispatchSpecialRequestSaga executes one leased command. It is safe for an
// HTTP request and the background worker to call the same function.
func DispatchSpecialRequestSaga(ctx context.Context, db *sql.DB, client *wlt.Client, sagaID string) (*SpecialRequestSaga, error) {
	saga, err := getSaga(ctx, db, sagaID)
	if err != nil {
		return nil, err
	}
	if client == nil || !client.Configured() {
		if saga.Operation != SagaCancel {
			return nil, fmt.Errorf("WLT handoff is unavailable")
		}
		var cancelInput CancelSagaInput
		if err := decodeSagaPayload(saga, &cancelInput); err != nil {
			return nil, err
		}
		if cancelInput.PaymentSessionID != "" {
			return nil, fmt.Errorf("WLT payment-session expiry is unavailable")
		}
	}
	saga, err = claimSaga(ctx, db, sagaID)
	if err != nil {
		return nil, err
	}
	if saga.State == SagaCompleted || saga.State == SagaTerminalFailure || saga.State == SagaReconciliationRequired {
		return saga, nil
	}
	var dispatchErr error
	switch saga.Operation {
	case SagaQuoteIssueAttach:
		var input QuoteSagaInput
		dispatchErr = decodeSagaPayload(saga, &input)
		if dispatchErr == nil {
			dispatchErr = executeQuoteSaga(ctx, db, client, saga, input)
		}
	case SagaPaymentCreateAttach:
		var input PaymentSessionSagaInput
		dispatchErr = decodeSagaPayload(saga, &input)
		if dispatchErr == nil {
			dispatchErr = executePaymentSaga(ctx, db, client, saga, input)
		}
	case SagaCancel:
		var input CancelSagaInput
		dispatchErr = decodeSagaPayload(saga, &input)
		if dispatchErr == nil {
			dispatchErr = executeCancelSaga(ctx, db, client, saga, input)
		}
	default:
		dispatchErr = fmt.Errorf("unsupported special request saga operation %q", saga.Operation)
	}
	if dispatchErr != nil {
		if err := markSagaFailure(ctx, db, saga.ID, dispatchErr); err != nil {
			return saga, fmt.Errorf("record saga failure: %v (original: %v)", err, dispatchErr)
		}
		return getSaga(ctx, db, saga.ID)
	}
	return getSaga(ctx, db, saga.ID)
}

func applyCancellationLocally(ctx context.Context, db *sql.DB, operatorContextID, requestID, clientID string, expectedVersion *int) (*SpecialRequest, error) {
	repo := NewPostgresRepository(db)
	current, err := repo.GetInOperatorContext(ctx, operatorContextID, requestID)
	if err != nil {
		return nil, err
	}
	if current.ClientID != clientID {
		return nil, ErrNotFound
	}
	if current.Status == StatusCancelled {
		return current, nil
	}
	if !clientCancellableStatuses[current.Status] {
		return nil, fmt.Errorf("%w: cannot cancel from status %s", ErrConflict, current.Status)
	}
	version := current.Version
	if expectedVersion != nil {
		version = *expectedVersion
	}
	status := StatusCancelled
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	updated, err := repo.UpdateInOperatorContextTx(ctx, tx, operatorContextID, requestID, version, UpdateInput{Status: &status, setCancelledAt: true})
	if err != nil {
		return nil, err
	}
	correlationID := ""
	if current.CorrelationID != nil {
		correlationID = *current.CorrelationID
	}
	if err := WriteAuditEvent(tx, requestID, clientID, "client", "cancel", "", correlationID, requestJSON(current), requestJSON(updated)); err != nil {
		return nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := operationalEnqueueCancellation(tx, requestID, correlationID, updated); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

// RunSpecialRequestSagaWorker drains the transactional outbox. Stale in-flight
// leases become eligible again after the lease expires, so restart recovery can
// continue a remote-applied/local-unconfirmed command.
func RunSpecialRequestSagaWorker(ctx context.Context, db *sql.DB, client *wlt.Client, interval time.Duration) {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	run := func() {
		rows, err := db.QueryContext(ctx, `
			SELECT saga_id::text
			FROM dsh_special_request_saga_outbox
			WHERE status IN ('pending', 'in_flight') AND next_attempt_at <= NOW()
			ORDER BY created_at
			LIMIT 20`)
		if err != nil {
			return
		}
		var ids []string
		for rows.Next() {
			var id string
			if rows.Scan(&id) == nil {
				ids = append(ids, id)
			}
		}
		_ = rows.Close()
		for _, id := range ids {
			if _, err := DispatchSpecialRequestSaga(ctx, db, client, id); err != nil && !errors.Is(err, ErrSagaBusy) {
				// markSagaFailure is the recovery write: losing it leaves an
				// exhausted saga retrying forever with no operator visibility.
				// Log the failure -- the dispatcher re-scans pending/in_flight
				// rows on the next tick, so the saga itself self-heals.
				if markErr := markSagaFailure(ctx, db, id, err); markErr != nil {
					log.Printf("special request saga dispatcher: marking saga %s as failed after dispatch error %v failed: %v", id, err, markErr)
				}
			}
		}
	}
	run()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}

func operationalEnqueueCancellation(tx *sql.Tx, requestID, correlationID string, updated *SpecialRequest) error {
	return operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType: "special_request_cancelled", EntityType: "special_request", EntityID: requestID,
		Payload: requestJSON(updated), CorrelationID: correlationID,
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
