package partnerfleet

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"math/big"
	"strings"
	"time"
)

var (
	ErrNotFound          = errors.New("courier connection code not found")
	ErrInvalid           = errors.New("invalid courier connection request")
	ErrExpired           = errors.New("courier connection code expired")
	ErrAlreadyBound      = errors.New("courier identity is already bound")
	ErrVersionConflict   = errors.New("courier connection code version conflict")
	ErrCourierIneligible = errors.New("courier team member is ineligible")
	ErrStoreIneligible   = errors.New("store is ineligible for partner fleet binding")
)

const codeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

type ConnectionCode struct {
	ID                       string  `json:"id"`
	StoreID                  string  `json:"storeId"`
	TeamMemberID             string  `json:"teamMemberId"`
	CodeLast4                string  `json:"codeLast4"`
	Status                   string  `json:"status"`
	ExpiresAt                string  `json:"expiresAt"`
	CreatedByActorID         string  `json:"createdByActorId"`
	RedeemedByCaptainActorID string  `json:"redeemedByCaptainActorId,omitempty"`
	RedeemedAt               *string `json:"redeemedAt,omitempty"`
	Version                  int     `json:"version"`
	CreatedAt                string  `json:"createdAt"`
	UpdatedAt                string  `json:"updatedAt"`
}

type IssuedConnectionCode struct {
	Connection ConnectionCode `json:"connection"`
	Code       string         `json:"code"`
}

type CaptainFleetMembership struct {
	TeamMemberID       string `json:"teamMemberId"`
	StoreID            string `json:"storeId"`
	StoreName          string `json:"storeName"`
	CourierName        string `json:"courierName"`
	Status             string `json:"status"`
	BranchAssignment   string `json:"branchAssignment"`
	DeliveryAssignment string `json:"deliveryAssignment"`
	Version            int    `json:"version"`
}

type queryRower interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func normalizeCode(value string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(value), "-", ""))
}

func hashCode(value string) string {
	sum := sha256.Sum256([]byte(normalizeCode(value)))
	return hex.EncodeToString(sum[:])
}

func generateCode(length int) (string, error) {
	if length < 8 {
		length = 10
	}
	var builder strings.Builder
	builder.Grow(length)
	max := big.NewInt(int64(len(codeAlphabet)))
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		builder.WriteByte(codeAlphabet[n.Int64()])
	}
	return builder.String(), nil
}

func nullableString(value sql.NullString) *string {
	if !value.Valid || value.String == "" {
		return nil
	}
	v := value.String
	return &v
}

func ensureStoreEligible(ctx context.Context, q queryRower, storeID string) error {
	var status string
	err := q.QueryRowContext(ctx, `SELECT status FROM dsh_stores WHERE id = $1`, storeID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if status != "active" {
		return ErrStoreIneligible
	}
	return nil
}

const connectionSelectCols = `id::TEXT, store_id, team_member_id, code_last4, status,
	expires_at::TEXT, created_by_actor_id, redeemed_by_captain_actor_id,
	redeemed_at::TEXT, version, created_at::TEXT, updated_at::TEXT`

func scanConnection(row interface{ Scan(dest ...any) error }) (ConnectionCode, error) {
	var result ConnectionCode
	var redeemedAt sql.NullString
	err := row.Scan(
		&result.ID, &result.StoreID, &result.TeamMemberID, &result.CodeLast4,
		&result.Status, &result.ExpiresAt, &result.CreatedByActorID,
		&result.RedeemedByCaptainActorID, &redeemedAt, &result.Version,
		&result.CreatedAt, &result.UpdatedAt,
	)
	result.RedeemedAt = nullableString(redeemedAt)
	return result, err
}

func IssueCode(ctx context.Context, db *sql.DB, storeID, teamMemberID, actorID string, ttl time.Duration) (IssuedConnectionCode, error) {
	if err := ensureStoreEligible(ctx, db, storeID); err != nil {
		return IssuedConnectionCode{}, err
	}
	var currentStatus string
	err := db.QueryRowContext(ctx, `SELECT status FROM dsh_captain_memberships WHERE id = $1 AND store_id = $2`, teamMemberID, storeID).Scan(&currentStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return IssuedConnectionCode{}, ErrNotFound
	}
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	if currentStatus != "invited" && currentStatus != "active" {
		return IssuedConnectionCode{}, ErrCourierIneligible
	}

	codeStr, err := generateCode(10)
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	hash := hashCode(codeStr)
	last4 := codeStr[len(codeStr)-4:]
	expiresAt := time.Now().Add(ttl)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	defer func() { _ = tx.Rollback() }()

	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'expired', version = version + 1, updated_at = NOW()
		WHERE team_member_id = $1 AND store_id = $2 AND status = 'pending'`, teamMemberID, storeID)
	if err != nil {
		return IssuedConnectionCode{}, err
	}

	row := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_partner_courier_connection_codes (
			store_id, team_member_id, code_hash, code_last4, status, expires_at, created_by_actor_id
		) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
		RETURNING `+connectionSelectCols,
		storeID, teamMemberID, hash, last4, expiresAt, actorID)

	connection, scanErr := scanConnection(row)
	if scanErr != nil {
		return IssuedConnectionCode{}, scanErr
	}
	if err := tx.Commit(); err != nil {
		return IssuedConnectionCode{}, err
	}
	return IssuedConnectionCode{Connection: connection, Code: codeStr}, nil
}

func RevokeCode(ctx context.Context, db *sql.DB, storeID, codeID, actorID string, expectedVersion int) (ConnectionCode, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ConnectionCode{}, err
	}
	defer func() { _ = tx.Rollback() }()

	row := tx.QueryRowContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'revoked', version = version + 1, revoked_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND store_id = $2 AND status = 'pending' AND version = $3
		RETURNING `+connectionSelectCols,
		codeID, storeID, expectedVersion)

	connection, err := scanConnection(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ConnectionCode{}, ErrNotFound
	}
	if err != nil {
		return ConnectionCode{}, err
	}
	if err := tx.Commit(); err != nil {
		return ConnectionCode{}, err
	}
	return connection, nil
}

func FormatCodeForDisplay(code string) string {
	normalized := normalizeCode(code)
	if len(normalized) <= 5 {
		return normalized
	}
	return normalized[:len(normalized)-5] + "-" + normalized[len(normalized)-5:]
}
