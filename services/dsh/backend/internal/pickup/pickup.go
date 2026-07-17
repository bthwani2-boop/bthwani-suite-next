// Package pickup implements the pickup fulfillment mode's operational
// closure: the store marks an order ready, a one-time code is issued to the
// customer, and the customer's arrival is verified against that code. It is
// the first real consumer of dsh_pickup_sessions (dsh-055), which existed
// unused before this package.
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
	ErrExpired          = errors.New("pickup code expired")
	ErrAttemptsExceeded = errors.New("pickup code attempts exceeded")
	ErrInvalidCode      = errors.New("pickup code is invalid")
)

// PickupSession mirrors dsh_pickup_sessions' columns. hashed_otp is never
// exposed outside the repository/service layer.
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
	Version            int
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

const sessionColumns = `
	id, order_id::text, store_id, client_id::text, hashed_otp, expires_at,
	attempt_count, max_attempts, used_at, verified_by_actor_id, verification_method,
	version, created_at, updated_at
`

func scanSession(scan func(...any) error) (*PickupSession, error) {
	var s PickupSession
	err := scan(
		&s.ID, &s.OrderID, &s.StoreID, &s.ClientID, &s.HashedOtp, &s.ExpiresAt,
		&s.AttemptCount, &s.MaxAttempts, &s.UsedAt, &s.VerifiedByActorID, &s.VerificationMethod,
		&s.Version, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// GetForUpdate locks and returns the session row for id within tx.
func GetForUpdate(tx *sql.Tx, id string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE id = $1 FOR UPDATE`
	s, err := scanSession(tx.QueryRow(query, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

// GetForUpdateByOrderID locks and returns the session row for order_id
// within tx, if one exists.
func GetForUpdateByOrderID(tx *sql.Tx, orderID string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE order_id = $1::uuid FOR UPDATE`
	s, err := scanSession(tx.QueryRow(query, orderID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

// GetByOrderID returns the session row for order_id, if one exists.
func GetByOrderID(db *sql.DB, orderID string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE order_id = $1::uuid`
	s, err := scanSession(db.QueryRow(query, orderID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

// Get returns the session row by id.
func Get(db *sql.DB, id string) (*PickupSession, error) {
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions WHERE id = $1`
	s, err := scanSession(db.QueryRow(query, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return s, err
}

// ListFilter narrows List by store and/or "active"/"used"/"expired" state.
type ListFilter struct {
	StoreID string
	Limit   int
	Offset  int
}

func clampLimit(limit int) int {
	if limit <= 0 || limit > 200 {
		return 50
	}
	return limit
}

// List returns pickup sessions matching filter, newest first.
func List(db *sql.DB, filter ListFilter) ([]PickupSession, error) {
	limit := clampLimit(filter.Limit)
	where := "WHERE 1=1"
	var args []any
	idx := 1
	if filter.StoreID != "" {
		where += " AND store_id = $" + itoa(idx)
		args = append(args, filter.StoreID)
		idx++
	}
	query := `SELECT ` + sessionColumns + ` FROM dsh_pickup_sessions ` + where +
		` ORDER BY created_at DESC LIMIT $` + itoa(idx) + ` OFFSET $` + itoa(idx+1)
	args = append(args, limit, filter.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []PickupSession
	for rows.Next() {
		s, err := scanSession(rows.Scan)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, *s)
	}
	return sessions, rows.Err()
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
