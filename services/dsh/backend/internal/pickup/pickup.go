package pickup

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound         = errors.New("pickup session not found")
	ErrInvalid          = errors.New("invalid pickup input")
	ErrConflict         = errors.New("pickup state conflict")
	ErrVersionConflict  = errors.New("pickup session version conflict")
	ErrAlreadyUsed      = errors.New("pickup code already used")
	ErrCancelled        = errors.New("pickup session cancelled with order")
	ErrExpired          = errors.New("pickup code expired")
	ErrAttemptsExceeded = errors.New("pickup code attempts exceeded")
	ErrInvalidCode      = errors.New("pickup code is invalid")
)

type SessionStatus string

const (
	SessionActive    SessionStatus = "active"
	SessionVerified  SessionStatus = "verified"
	SessionNoShow    SessionStatus = "no_show"
	SessionConsumed  SessionStatus = "consumed"
	SessionCancelled SessionStatus = "cancelled"
)

type PickupSession struct {
	ID                 string
	OrderID            string
	StoreID            string
	ClientID           string
	HashedOtp          string
	ExpiresAt          time.Time
	AttemptCount       int
	MaxAttempts        int
	UsedAt             *time.Time
	VerifiedByActorID  *string
	VerificationMethod *string
	Status             SessionStatus
	CancelledAt        *time.Time
	CancellationReason *string
	CustomerNotifiedAt *time.Time
	CustomerArrivedAt  *time.Time
	NoShowAt           *time.Time
	NoShowReason       *string
	RescheduledAt      *time.Time
	Version            int
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

const sessionColumns = `
	id, order_id::text, store_id, client_id::text, hashed_otp, expires_at,
	attempt_count, max_attempts, used_at, verified_by_actor_id, verification_method,
	status, cancelled_at, cancellation_reason,
	customer_notified_at, customer_arrived_at, no_show_at, no_show_reason, rescheduled_at,
	version, created_at, updated_at
`

func scanSession(scan func(...any) error) (*PickupSession, error) {
	var session PickupSession
	err := scan(
		&session.ID,
		&session.OrderID,
		&session.StoreID,
		&session.ClientID,
		&session.HashedOtp,
		&session.ExpiresAt,
		&session.AttemptCount,
		&session.MaxAttempts,
		&session.UsedAt,
		&session.VerifiedByActorID,
		&session.VerificationMethod,
		&session.Status,
		&session.CancelledAt,
		&session.CancellationReason,
		&session.CustomerNotifiedAt,
		&session.CustomerArrivedAt,
		&session.NoShowAt,
		&session.NoShowReason,
		&session.RescheduledAt,
		&session.Version,
		&session.CreatedAt,
		&session.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func GetForUpdate(tx *sql.Tx, id string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE id = $1 FOR UPDATE`
	session, err := scanSession(tx.QueryRow(query, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return session, err
}

func GetForUpdateByOrderID(tx *sql.Tx, orderID string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE order_id = $1::uuid FOR UPDATE`
	session, err := scanSession(tx.QueryRow(query, orderID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return session, err
}

func GetByOrderID(db *sql.DB, orderID string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE order_id = $1::uuid`
	session, err := scanSession(db.QueryRow(query, orderID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return session, err
}

func Get(db *sql.DB, id string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE id = $1`
	session, err := scanSession(db.QueryRow(query, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return session, err
}

type ListFilter struct {
	StoreID string
	Status  SessionStatus
	Limit   int
	Offset  int
}

func clampLimit(limit int) int {
	if limit <= 0 || limit > 200 {
		return 50
	}
	return limit
}

func List(db *sql.DB, filter ListFilter) ([]PickupSession, error) {
	limit := clampLimit(filter.Limit)
	where := "WHERE 1=1"
	var args []any
	index := 1
	if filter.StoreID != "" {
		where += " AND store_id = $" + itoa(index)
		args = append(args, filter.StoreID)
		index++
	}
	if filter.Status != "" {
		where += " AND status = $" + itoa(index)
		args = append(args, string(filter.Status))
		index++
	}
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions ` + where +
		` ORDER BY created_at DESC LIMIT $` + itoa(index) + ` OFFSET $` + itoa(index+1)
	args = append(args, limit, filter.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []PickupSession
	for rows.Next() {
		session, err := scanSession(rows.Scan)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, *session)
	}
	if sessions == nil {
		sessions = []PickupSession{}
	}
	return sessions, rows.Err()
}

func itoa(value int) string {
	if value == 0 {
		return "0"
	}
	negative := value < 0
	if negative {
		value = -value
	}
	var buffer [20]byte
	index := len(buffer)
	for value > 0 {
		index--
		buffer[index] = byte('0' + value%10)
		value /= 10
	}
	if negative {
		index--
		buffer[index] = '-'
	}
	return string(buffer[index:])
}
