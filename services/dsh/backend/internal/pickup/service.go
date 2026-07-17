package pickup

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"dsh-api/internal/operationaloutbox"
	"dsh-api/internal/orders"
)

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

const (
	defaultOtpTTL      = 15 * time.Minute
	defaultMaxAttempts = 5
)

func sessionJSON(s *PickupSession) []byte {
	if s == nil {
		return nil
	}
	b, _ := json.Marshal(s)
	return b
}

func enqueueEvent(tx *sql.Tx, eventType, entityID string, payload []byte, correlationID string) error {
	return operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType:     eventType,
		EntityType:    "pickup_session",
		EntityID:      entityID,
		Payload:       payload,
		CorrelationID: correlationID,
	})
}

// generateOtp returns a cryptographically random 6-digit numeric code and
// its SHA-256 hex digest. The plaintext is only ever returned to the
// caller for out-of-band delivery to the customer -- it is never persisted
// or logged.
func generateOtp() (plain, hashed string, err error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", "", err
	}
	plain = fmt.Sprintf("%06d", n.Int64())
	sum := sha256.Sum256([]byte(plain))
	hashed = hex.EncodeToString(sum[:])
	return plain, hashed, nil
}

func hashOtp(code string) string {
	sum := sha256.Sum256([]byte(code))
	return hex.EncodeToString(sum[:])
}

// lockPickupOrder locks the order row and validates it is a pickup-mode
// order in the expected status.
func lockPickupOrder(tx *sql.Tx, orderID string, expectedStatus orders.OrderStatus) (storeID, clientID string, err error) {
	var fulfillmentMode, status string
	err = tx.QueryRow(`SELECT store_id, client_id, fulfillment_mode, status FROM dsh_orders WHERE id = $1::uuid FOR UPDATE`, orderID).
		Scan(&storeID, &clientID, &fulfillmentMode, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", ErrNotFound
	}
	if err != nil {
		return "", "", err
	}
	if fulfillmentMode != "pickup" {
		return "", "", fmt.Errorf("%w: order fulfillment mode is %s, not pickup", ErrConflict, fulfillmentMode)
	}
	if expectedStatus != "" && status != string(expectedStatus) {
		return "", "", fmt.Errorf("%w: order status is %s, expected %s", ErrConflict, status, expectedStatus)
	}
	return storeID, clientID, nil
}

// MarkReady transitions a pickup order from preparing to ready_for_pickup,
// reusing orders.TransitionDispatchOrder (the same caller-owned-tx status
// machine dispatch.go uses) rather than duplicating order-status logic.
func (s *Service) MarkReady(ctx context.Context, orderID, actorID, actorRole, correlationID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, _, err := lockPickupOrder(tx, orderID, ""); err != nil {
		return err
	}
	if _, err := orders.TransitionDispatchOrder(tx, orderID, actorRole, []orders.OrderStatus{orders.StatusPreparing}, orders.StatusReadyForPickup, "pickup ready"); err != nil {
		if errors.Is(err, orders.ErrNotFound) {
			return ErrNotFound
		}
		if errors.Is(err, orders.ErrConflict) {
			return fmt.Errorf("%w: order is not in a preparing state", ErrConflict)
		}
		return err
	}
	if err := WriteAuditEvent(tx, orderID, actorID, actorRole, "mark_ready", "", correlationID, nil, nil); err != nil {
		return err
	}
	if err := enqueueEvent(tx, "pickup_order_ready", orderID, nil, correlationID); err != nil {
		return err
	}
	return tx.Commit()
}

// NotifyCustomer is a best-effort, audit-only marker recording that the
// ready-for-pickup notification was dispatched to the customer. It does
// not mutate any pickup_sessions row.
func (s *Service) NotifyCustomer(ctx context.Context, orderID, actorID, actorRole, correlationID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, _, err := lockPickupOrder(tx, orderID, ""); err != nil {
		return err
	}
	if err := WriteAuditEvent(tx, orderID, actorID, actorRole, "notify_customer", "", correlationID, nil, nil); err != nil {
		return err
	}
	if err := enqueueEvent(tx, "pickup_customer_notified", orderID, nil, correlationID); err != nil {
		return err
	}
	return tx.Commit()
}

// IssueOtp generates a new 6-digit numeric OTP, persists only its SHA-256
// hash, and returns the plaintext to the caller for out-of-band delivery
// (push/SMS notification). The plaintext is never stored or logged. Issuing
// a new OTP for an order that already has a session replaces it (resets
// attempt_count and any prior used_at/verification state).
func (s *Service) IssueOtp(ctx context.Context, orderID, clientID, actorID, actorRole, correlationID string) (string, *PickupSession, error) {
	plain, hashed, err := generateOtp()
	if err != nil {
		return "", nil, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", nil, err
	}
	defer tx.Rollback()

	storeID, orderClientID, err := lockPickupOrder(tx, orderID, orders.StatusReadyForPickup)
	if err != nil {
		return "", nil, err
	}
	if clientID == "" {
		clientID = orderClientID
	}

	expiresAt := time.Now().UTC().Add(defaultOtpTTL)
	current, err := GetForUpdateByOrderID(tx, orderID)
	var sessionID string
	var fromJSON []byte
	if errors.Is(err, ErrNotFound) {
		row := tx.QueryRow(`
			INSERT INTO dsh_pickup_sessions
				(order_id, store_id, client_id, hashed_otp, expires_at, attempt_count, max_attempts)
			VALUES ($1::uuid, $2, $3::uuid, $4, $5, 0, $6)
			RETURNING id`,
			orderID, storeID, clientID, hashed, expiresAt, defaultMaxAttempts)
		if err := row.Scan(&sessionID); err != nil {
			return "", nil, err
		}
	} else if err != nil {
		return "", nil, err
	} else {
		fromJSON = sessionJSON(current)
		sessionID = current.ID
		res, err := tx.Exec(`
			UPDATE dsh_pickup_sessions
			SET hashed_otp = $1, expires_at = $2, attempt_count = 0, max_attempts = $3,
			    used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,
			    version = version + 1, updated_at = NOW()
			WHERE id = $4 AND version = $5`,
			hashed, expiresAt, defaultMaxAttempts, sessionID, current.Version)
		if err != nil {
			return "", nil, err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return "", nil, ErrVersionConflict
		}
	}

	updated, err := scanSession(tx.QueryRow(`SELECT `+sessionColumns+` FROM dsh_pickup_sessions WHERE id = $1`, sessionID).Scan)
	if err != nil {
		return "", nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "issue_otp", "", correlationID, fromJSON, sessionJSON(updated)); err != nil {
		return "", nil, err
	}
	if err := enqueueEvent(tx, "pickup_otp_issued", updated.ID, sessionJSON(updated), correlationID); err != nil {
		return "", nil, err
	}
	if err := tx.Commit(); err != nil {
		return "", nil, err
	}
	fresh, err := Get(s.db, updated.ID)
	if err != nil {
		return "", nil, err
	}
	return plain, fresh, nil
}

// CustomerArrived is a best-effort, audit-only marker for the operator
// dashboard that the customer has arrived at the store to collect a pickup
// order. It does not consume the OTP -- VerifyOtp is the state-mutating
// step.
func (s *Service) CustomerArrived(ctx context.Context, orderID, actorID, actorRole, correlationID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, _, err := lockPickupOrder(tx, orderID, ""); err != nil {
		return err
	}
	if err := WriteAuditEvent(tx, orderID, actorID, actorRole, "customer_arrived", "", correlationID, nil, nil); err != nil {
		return err
	}
	if err := enqueueEvent(tx, "pickup_customer_arrived", orderID, nil, correlationID); err != nil {
		return err
	}
	return tx.Commit()
}

// VerifyOtp validates a customer-submitted OTP against the stored hash
// using a constant-time comparison, and on success marks the session used
// and transitions the order to delivered (reusing
// orders.TransitionDispatchOrder in the same transaction). On mismatch it
// increments attempt_count and returns ErrInvalidCode.
func (s *Service) VerifyOtp(ctx context.Context, orderID, submittedOtp, actorID, actorRole, correlationID string) (*PickupSession, error) {
	if strings.TrimSpace(submittedOtp) == "" {
		return nil, fmt.Errorf("%w: code is required", ErrInvalid)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := GetForUpdateByOrderID(tx, orderID)
	if err != nil {
		return nil, err
	}
	if current.UsedAt != nil {
		return nil, ErrAlreadyUsed
	}
	if !current.ExpiresAt.After(time.Now().UTC()) {
		return nil, ErrExpired
	}
	if current.AttemptCount >= current.MaxAttempts {
		return nil, ErrAttemptsExceeded
	}

	submittedHash := hashOtp(strings.TrimSpace(submittedOtp))
	match := subtle.ConstantTimeCompare([]byte(submittedHash), []byte(current.HashedOtp)) == 1

	if !match {
		if _, err := tx.Exec(`
			UPDATE dsh_pickup_sessions
			SET attempt_count = attempt_count + 1, version = version + 1, updated_at = NOW()
			WHERE id = $1`, current.ID); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return nil, ErrInvalidCode
	}

	fromJSON := sessionJSON(current)
	res, err := tx.Exec(`
		UPDATE dsh_pickup_sessions
		SET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'otp',
		    version = version + 1, updated_at = NOW()
		WHERE id = $2 AND version = $3`,
		actorID, current.ID, current.Version)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}

	if _, err := orders.TransitionDispatchOrder(tx, orderID, actorRole, []orders.OrderStatus{orders.StatusReadyForPickup}, orders.StatusDelivered, "pickup verified"); err != nil {
		if errors.Is(err, orders.ErrNotFound) {
			return nil, ErrNotFound
		}
		if errors.Is(err, orders.ErrConflict) {
			return nil, fmt.Errorf("%w: order is not in a ready-for-pickup state", ErrConflict)
		}
		return nil, err
	}

	updated, err := scanSession(tx.QueryRow(`SELECT `+sessionColumns+` FROM dsh_pickup_sessions WHERE id = $1`, current.ID).Scan)
	if err != nil {
		return nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "verify_otp", "", correlationID, fromJSON, sessionJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "pickup_otp_verified", updated.ID, sessionJSON(updated), correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return Get(s.db, updated.ID)
}

// NoShow marks an issued-but-unused session as consumed via the
// verification_method "no_show" fallback, without transitioning the order
// (operators decide separately whether to cancel/re-route a no-show order).
func (s *Service) NoShow(ctx context.Context, orderID, actorID, actorRole, reason, correlationID string) (*PickupSession, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := GetForUpdateByOrderID(tx, orderID)
	if err != nil {
		return nil, err
	}
	if current.UsedAt != nil {
		return nil, ErrAlreadyUsed
	}
	fromJSON := sessionJSON(current)

	res, err := tx.Exec(`
		UPDATE dsh_pickup_sessions
		SET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'no_show',
		    version = version + 1, updated_at = NOW()
		WHERE id = $2 AND version = $3`,
		actorID, current.ID, current.Version)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}

	updated, err := scanSession(tx.QueryRow(`SELECT `+sessionColumns+` FROM dsh_pickup_sessions WHERE id = $1`, current.ID).Scan)
	if err != nil {
		return nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "no_show", reason, correlationID, fromJSON, sessionJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "pickup_no_show", updated.ID, sessionJSON(updated), correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return Get(s.db, updated.ID)
}

// ExtendWindow is the manual-override fallback for a session that would
// otherwise expire: it requires a reason (written to audit) and is gated by
// a higher-privilege permission at the HTTP layer.
func (s *Service) ExtendWindow(ctx context.Context, orderID string, newExpiry time.Time, actorID, actorRole, reason, correlationID string) (*PickupSession, error) {
	if strings.TrimSpace(reason) == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalid)
	}
	if !newExpiry.After(time.Now().UTC()) {
		return nil, fmt.Errorf("%w: newExpiry must be in the future", ErrInvalid)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := GetForUpdateByOrderID(tx, orderID)
	if err != nil {
		return nil, err
	}
	if current.UsedAt != nil {
		return nil, ErrAlreadyUsed
	}
	fromJSON := sessionJSON(current)

	res, err := tx.Exec(`
		UPDATE dsh_pickup_sessions
		SET expires_at = $1, attempt_count = 0, version = version + 1, updated_at = NOW()
		WHERE id = $2 AND version = $3`,
		newExpiry, current.ID, current.Version)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}

	updated, err := scanSession(tx.QueryRow(`SELECT `+sessionColumns+` FROM dsh_pickup_sessions WHERE id = $1`, current.ID).Scan)
	if err != nil {
		return nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "extend_window", reason, correlationID, fromJSON, sessionJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "pickup_window_extended", updated.ID, sessionJSON(updated), correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return Get(s.db, updated.ID)
}
