package checkoutpaymentsaga

import (
        "context"
        "crypto/sha256"
        "database/sql"
        "encoding/hex"
        "encoding/json"
        "errors"
        "fmt"
        "strings"
        "time"

        "dsh-api/internal/checkout"
        "dsh-api/internal/wlt"

        "github.com/google/uuid"
)

type State string

const (
        Ready                  State = "ready"
        Dispatched             State = "dispatched"
        RemoteOutcomeUnknown   State = "remote_outcome_unknown"
        RemoteConfirmed        State = "remote_confirmed"
        LocalProjectionPending State = "local_projection_pending"
        Completed              State = "completed"
        RetryScheduled         State = "retry_scheduled"
        ReconciliationRequired State = "reconciliation_required"
        CompensationPending    State = "compensation_pending"
        Compensated            State = "compensated"
        TerminalFailure        State = "terminal_failure"
        maxAttempts                  = 10
        leaseDuration                = 2 * time.Minute
)

var (
        ErrConflict = errors.New("checkout payment saga command conflict")
        ErrBusy     = errors.New("checkout payment saga is already in flight")
)

type Input struct {
        OperatorContextID string `json:"operatorContextId"`
        CheckoutIntentID  string `json:"checkoutIntentId"`
        ClientID          string `json:"clientId"`
        SourceVersion     int    `json:"sourceVersion"`
        CommandID         string `json:"commandId"`
        CorrelationID     string `json:"correlationId"`
        StoreID           string `json:"storeId"`
        PaymentMethod     string `json:"paymentMethod"`
        AmountMinorUnits  int64  `json:"amountMinorUnits"`
        Currency          string `json:"currency"`
        CartSnapshotHash  string `json:"cartSnapshotHash"`
        PricingQuoteID    string `json:"pricingQuoteId"`
}

type Saga struct {
        ID                string
        OperatorContextID string
        CheckoutIntentID  string
        ClientID          string
        SourceVersion     int
        CommandID         string
        Payload           json.RawMessage
        PayloadHash       string
        State             State
        PaymentSessionID  string
        AttemptCount      int
        ReadbackAttempts  int
        LastError         string
        NextAttemptAt     time.Time
        LeaseToken        string
        LeaseExpiresAt    *time.Time
        CompletedAt       *time.Time
}

func hashPayload(payload []byte) string { d := sha256.Sum256(payload); return hex.EncodeToString(d[:]) }

func validateInput(in Input) error {
        if strings.TrimSpace(in.OperatorContextID) == "" || strings.TrimSpace(in.CheckoutIntentID) == "" || strings.TrimSpace(in.ClientID) == "" || in.SourceVersion <= 0 {
                return fmt.Errorf("%w: operator context, intent, client, and source version are required", checkout.ErrInvalid)
        }
        if len(strings.TrimSpace(in.CommandID)) < 8 || len(strings.TrimSpace(in.CommandID)) > 200 {
                return fmt.Errorf("%w: command id must contain between 8 and 200 characters", checkout.ErrInvalid)
        }
        if in.AmountMinorUnits <= 0 || strings.TrimSpace(in.Currency) == "" || strings.TrimSpace(in.PricingQuoteID) == "" {
                return fmt.Errorf("%w: payment amount, currency, and pricing quote are required", checkout.ErrInvalid)
        }
        return nil
}

const selectSaga = `SELECT id::text, operator_context_id, checkout_intent_id::text, client_id, source_version, command_id, payload::text, payload_hash, state, COALESCE(payment_session_id,''), attempt_count, readback_attempt_count, COALESCE(last_error,''), next_attempt_at, lease_token::text, lease_expires_at, completed_at FROM dsh_checkout_payment_sagas`

func scanSaga(scan func(...any) error) (*Saga, error) {
        var s Saga
        var payload string
        var token sql.NullString
        var lease, completed sql.NullTime
        if err := scan(&s.ID, &s.OperatorContextID, &s.CheckoutIntentID, &s.ClientID, &s.SourceVersion, &s.CommandID, &payload, &s.PayloadHash, &s.State, &s.PaymentSessionID, &s.AttemptCount, &s.ReadbackAttempts, &s.LastError, &s.NextAttemptAt, &token, &lease, &completed); err != nil {
                return nil, err
        }
        s.Payload = json.RawMessage(payload)
        if token.Valid {
                s.LeaseToken = token.String
        }
        if lease.Valid {
                value := lease.Time
                s.LeaseExpiresAt = &value
        }
        if completed.Valid {
                value := completed.Time
                s.CompletedAt = &value
        }
        return &s, nil
}

func Get(ctx context.Context, db *sql.DB, id string) (*Saga, error) {
        return scanSaga(db.QueryRowContext(ctx, selectSaga+` WHERE id=$1::uuid`, id).Scan)
}

func Start(ctx context.Context, db *sql.DB, in Input) (*Saga, bool, error) {
        if err := validateInput(in); err != nil {
                return nil, false, err
        }
        payload, err := json.Marshal(in)
        if err != nil {
                return nil, false, err
        }
        hash := hashPayload(payload)
        tx, err := db.BeginTx(ctx, nil)
        if err != nil {
                return nil, false, err
        }
        defer func() { _ = tx.Rollback() }()
        var id string
        err = tx.QueryRowContext(ctx, `INSERT INTO dsh_checkout_payment_sagas (operator_context_id,checkout_intent_id,client_id,source_version,command_id,payload,payload_hash) VALUES ($1,$2::uuid,$3,$4,$5,$6::jsonb,$7) ON CONFLICT (operator_context_id,command_id) DO NOTHING RETURNING id::text`, in.OperatorContextID, in.CheckoutIntentID, in.ClientID, in.SourceVersion, in.CommandID, string(payload), hash).Scan(&id)
        if err == sql.ErrNoRows {
                s, loadErr := scanSaga(tx.QueryRowContext(ctx, selectSaga+` WHERE operator_context_id=$1 AND command_id=$2 FOR UPDATE`, in.OperatorContextID, in.CommandID).Scan)
                if loadErr != nil {
                        return nil, false, loadErr
                }
                if s.CheckoutIntentID != in.CheckoutIntentID || s.PayloadHash != hash {
                        return nil, false, ErrConflict
                }
                if err := tx.Commit(); err != nil {
                        return nil, false, err
                }
                return s, true, nil
        }
        if err != nil {
                return nil, false, err
        }
        if _, err := tx.ExecContext(ctx, `INSERT INTO dsh_checkout_payment_saga_outbox(saga_id,status) VALUES ($1::uuid,'blocked')`, id); err != nil {
                return nil, false, err
        }
        s, err := scanSaga(tx.QueryRowContext(ctx, selectSaga+` WHERE id=$1::uuid`, id).Scan)
        if err != nil {
                return nil, false, err
        }
        if err := tx.Commit(); err != nil {
                return nil, false, err
        }
        return s, false, nil
}

func Activate(ctx context.Context, db *sql.DB, id string) error {
        result, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_saga_outbox SET status='pending',next_attempt_at=NOW(),updated_at=NOW() WHERE saga_id=$1::uuid AND status='blocked'`, id)
        if err != nil {
                return err
        }
        n, _ := result.RowsAffected()
        if n == 0 {
                return ErrConflict
        }
        return nil
}

func claim(ctx context.Context, db *sql.DB, id string) (*Saga, error) {
        tx, err := db.BeginTx(ctx, nil)
        if err != nil {
                return nil, err
        }
        defer func() { _ = tx.Rollback() }()
        s, err := scanSaga(tx.QueryRowContext(ctx, selectSaga+` WHERE id=$1::uuid FOR UPDATE`, id).Scan)
        if err != nil {
                return nil, err
        }
        if s.State == Completed || s.State == ReconciliationRequired || s.State == TerminalFailure || s.State == Compensated {
                return s, nil
        }
        token := uuid.NewString()
        var lease time.Time
        err = tx.QueryRowContext(ctx, `UPDATE dsh_checkout_payment_saga_outbox SET status='in_flight',attempt_count=attempt_count+1,next_attempt_at=NOW()+$2::interval,updated_at=NOW() WHERE saga_id=$1::uuid AND status IN ('pending','in_flight') AND next_attempt_at<=NOW() RETURNING next_attempt_at`, id, leaseDuration.String()).Scan(&lease)
        if err == sql.ErrNoRows {
                return nil, ErrBusy
        }
        if err != nil {
                return nil, err
        }
        // attempt_count is the single attempt authority: every claim — including
        // lease-expiry re-claims after a crashed dispatch — increments it, so
        // fail()/scheduleRetry() escalation can never be defeated by crash loops.
        if _, err := tx.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET attempt_count=attempt_count+1,updated_at=NOW() WHERE id=$1::uuid`, id); err != nil {
                return nil, err
        }
        if _, err := tx.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='dispatched',lease_token=$2::uuid,lease_expires_at=$3,updated_at=NOW() WHERE id=$1::uuid AND state IN ('ready','retry_scheduled','remote_outcome_unknown')`, id, token, lease); err != nil {
                return nil, err
        }
        if err := tx.Commit(); err != nil {
                return nil, err
        }
        s.LeaseToken, s.State, s.AttemptCount = token, Dispatched, s.AttemptCount+1
        s.LeaseExpiresAt = &lease
        return s, nil
}

func scheduleRetry(ctx context.Context, db *sql.DB, id string, cause error) error {
        message := "unknown checkout payment saga failure"
        if cause != nil {
                message = cause.Error()
        }
        var attempts int
        if err := db.QueryRowContext(ctx, `SELECT attempt_count FROM dsh_checkout_payment_sagas WHERE id=$1::uuid`, id).Scan(&attempts); err != nil {
                return err
        }
        backoff := time.Duration(1<<uint(min(attempts, 9))) * time.Second
        if _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='remote_outcome_unknown',last_error=$2,next_attempt_at=NOW()+$3::interval,updated_at=NOW() WHERE id=$1::uuid`, id, message, backoff.String()); err != nil {
                return err
        }
        _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_saga_outbox SET status='pending',last_error=$2,next_attempt_at=NOW()+$3::interval,updated_at=NOW() WHERE saga_id=$1::uuid`, id, message, backoff.String())
        return err
}

func fail(ctx context.Context, db *sql.DB, id string, cause error) error {
        message := "unknown checkout payment saga failure"
        if cause != nil {
                message = cause.Error()
        }
        var attempts int
        if err := db.QueryRowContext(ctx, `SELECT attempt_count FROM dsh_checkout_payment_sagas WHERE id=$1::uuid`, id).Scan(&attempts); err != nil {
                return err
        }
        if attempts >= maxAttempts {
                _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='reconciliation_required',last_error=$2,updated_at=NOW() WHERE id=$1::uuid`, id, message)
                if err != nil {
                        return err
                }
                _, err = db.ExecContext(ctx, `UPDATE dsh_checkout_payment_saga_outbox SET status='failed',failed_at=NOW(),last_error=$2,updated_at=NOW() WHERE saga_id=$1::uuid`, id, message)
                return err
        }
        backoff := time.Duration(1<<uint(min(attempts, 9))) * time.Second
        _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='retry_scheduled',last_error=$2,next_attempt_at=NOW()+$3::interval,updated_at=NOW() WHERE id=$1::uuid`, id, message, backoff.String())
        if err != nil {
                return err
        }
        _, err = db.ExecContext(ctx, `UPDATE dsh_checkout_payment_saga_outbox SET status='pending',last_error=$2,next_attempt_at=NOW()+$3::interval,updated_at=NOW() WHERE saga_id=$1::uuid`, id, message, backoff.String())
        return err
}

func markRemote(ctx context.Context, db *sql.DB, id, sessionID string) error {
        _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='remote_confirmed',payment_session_id=$2,last_error=NULL,updated_at=NOW() WHERE id=$1::uuid AND state IN ('dispatched','remote_outcome_unknown','remote_confirmed','local_projection_pending')`, id, sessionID)
        return err
}
func markComplete(ctx context.Context, db *sql.DB, id string) error {
        if _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='completed',completed_at=COALESCE(completed_at,NOW()),last_error=NULL,updated_at=NOW() WHERE id=$1::uuid AND state IN ('remote_confirmed','local_projection_pending')`, id); err != nil {
                return err
        }
        _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_saga_outbox SET status='sent',sent_at=COALESCE(sent_at,NOW()),last_error=NULL,updated_at=NOW() WHERE saga_id=$1::uuid`, id)
        return err
}

func matches(in Input, session *wlt.PaymentSessionDetail) bool {
        return session != nil && session.ID != "" && session.ClientID == in.ClientID && session.StoreID == in.StoreID && session.PaymentMethod == in.PaymentMethod && session.AmountMinorUnits == in.AmountMinorUnits && session.Currency == in.Currency && session.Status != "failed" && session.Status != "expired"
}

func Dispatch(ctx context.Context, db *sql.DB, client *wlt.Client, id string) (*Saga, error) {
        if client == nil || !client.Configured() {
                return nil, fmt.Errorf("WLT payment-session handoff is unavailable")
        }
        s, err := claim(ctx, db, id)
        if err != nil {
                return nil, err
        }
        if s.State == Completed || s.State == ReconciliationRequired || s.State == TerminalFailure || s.State == Compensated {
                return s, nil
        }
        var in Input
        if err := json.Unmarshal(s.Payload, &in); err != nil {
                _ = fail(ctx, db, id, err)
                return Get(ctx, db, id)
        }
        wltCtx := wlt.WithOperatorContext(ctx, in.OperatorContextID)
        var session *wlt.PaymentSessionDetail
        if s.PaymentSessionID != "" {
                session, _ = client.GetPaymentSession(wltCtx, s.PaymentSessionID)
        }
        if !matches(in, session) {
                created, callErr := client.CreatePaymentSession(wltCtx, wlt.CreatePaymentSessionInput{CheckoutIntentID: in.CheckoutIntentID, ClientID: in.ClientID, StoreID: in.StoreID, PaymentMethod: in.PaymentMethod, AmountMinorUnits: in.AmountMinorUnits, Currency: in.Currency, CartSnapshotHash: in.CartSnapshotHash, PricingQuoteID: in.PricingQuoteID, CorrelationID: in.CorrelationID, IdempotencyKey: in.CommandID})
                if callErr != nil {
                        if wlt.IsPaymentSessionOutcomeUnknown(callErr) {
                                // The remote create may have committed before the response was
                                // lost. Keep the outcome-unknown state (it survives the retry
                                // scheduling below) so the saga status API and operators can see
                                // that the next attempt is a resolution attempt, not a blind
                                // mutation.
                                if _, err := db.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='remote_outcome_unknown',readback_attempt_count=readback_attempt_count+1,updated_at=NOW() WHERE id=$1::uuid`, id); err != nil {
                                        return nil, err
                                }
                                if err := scheduleRetry(ctx, db, id, callErr); err != nil {
                                        return nil, err
                                }
                                return Get(ctx, db, id)
                        }
                        _ = fail(ctx, db, id, callErr)
                        return Get(ctx, db, id)
                }
                session, err = client.GetPaymentSession(wltCtx, created.ID)
                if err != nil {
                        _ = fail(ctx, db, id, err)
                        return Get(ctx, db, id)
                }
        }
        if !matches(in, session) {
                _ = fail(ctx, db, id, fmt.Errorf("WLT payment-session readback does not match checkout command"))
                return Get(ctx, db, id)
        }
        if err := markRemote(ctx, db, id, session.ID); err != nil {
                return nil, err
        }
        if _, err := checkout.AttachWltPaymentSessionIdempotent(db, in.CheckoutIntentID, in.OperatorContextID, in.ClientID, session.ID); err != nil {
                _, _ = db.ExecContext(ctx, `UPDATE dsh_checkout_payment_sagas SET state='local_projection_pending',last_error=$2,updated_at=NOW() WHERE id=$1::uuid`, id, err.Error())
                _ = fail(ctx, db, id, err)
                return Get(ctx, db, id)
        }
        if err := markComplete(ctx, db, id); err != nil {
                return nil, err
        }
        return Get(ctx, db, id)
}

func RunWorker(ctx context.Context, db *sql.DB, client *wlt.Client, interval time.Duration) {
        if interval <= 0 {
                interval = 15 * time.Second
        }
        run := func() {
                rows, err := db.QueryContext(ctx, `SELECT saga_id::text FROM dsh_checkout_payment_saga_outbox WHERE status IN ('pending','in_flight') AND next_attempt_at<=NOW() ORDER BY created_at LIMIT 20`)
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
                        _, _ = Dispatch(ctx, db, client, id)
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

func min(a, b int) int {
        if a < b {
                return a
        }
        return b
}
