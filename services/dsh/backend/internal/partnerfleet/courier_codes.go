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
	ErrAlreadyIssued     = errors.New("a connection code already exists for this request")
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

func IssueCode(ctx context.Context, db *sql.DB, storeID, teamMemberID, actorID string, ttl time.Duration, idempotencyKey, correlationID string) (IssuedConnectionCode, error) {
	if ttl <= 0 || ttl > 48*time.Hour {
		return IssuedConnectionCode{}, ErrInvalid
	}
	idempotencyKey, err := validateLifecycleKey(idempotencyKey)
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	correlationID = resolveCorrelationID(correlationID, idempotencyKey)
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

	var storeStatus string
	err = tx.QueryRowContext(ctx, `SELECT status FROM dsh_stores WHERE id = $1 FOR UPDATE`, storeID).Scan(&storeStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return IssuedConnectionCode{}, ErrNotFound
	}
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	if storeStatus != "published" {
		return IssuedConnectionCode{}, ErrStoreIneligible
	}
	var currentStatus string
	err = tx.QueryRowContext(ctx, `SELECT status FROM dsh_captain_memberships WHERE id = $1 AND store_id = $2 FOR UPDATE`, teamMemberID, storeID).Scan(&currentStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return IssuedConnectionCode{}, ErrNotFound
	}
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	if currentStatus != "invited" {
		return IssuedConnectionCode{}, ErrCourierIneligible
	}

	_, err = scanConnection(tx.QueryRowContext(ctx, `
		SELECT `+connectionSelectCols+`
		FROM dsh_partner_courier_connection_codes
		WHERE store_id = $1 AND team_member_id = $2 AND issue_idempotency_key = $3
		FOR UPDATE`, storeID, teamMemberID, idempotencyKey))
	if err == nil {
		return IssuedConnectionCode{}, ErrAlreadyIssued
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return IssuedConnectionCode{}, err
	}
	var pendingCount int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_partner_courier_connection_codes
		WHERE store_id = $1 AND team_member_id = $2 AND status = 'pending'`,
		storeID, teamMemberID).Scan(&pendingCount); err != nil {
		return IssuedConnectionCode{}, err
	}
	if pendingCount > 0 {
		return IssuedConnectionCode{}, ErrAlreadyIssued
	}

	rows, err := tx.QueryContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'expired', version = version + 1, updated_at = NOW()
		WHERE team_member_id = $1 AND store_id = $2 AND status = 'pending' AND expires_at <= NOW()
		RETURNING id::TEXT, status, created_by_actor_id`, teamMemberID, storeID)
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	for rows.Next() {
		var codeID, status, createdBy string
		if scanErr := rows.Scan(&codeID, &status, &createdBy); scanErr != nil {
			rows.Close()
			return IssuedConnectionCode{}, scanErr
		}
		if err := insertMembershipHistory(ctx, tx, teamMemberID, "expire_captain_connection_code", actorID, "pending", "expired", idempotencyKey+":expire:"+codeID, correlationID); err != nil {
			rows.Close()
			return IssuedConnectionCode{}, err
		}
		if err := insertFleetNotification(ctx, tx, createdBy, "partner", "partner_fleet_connection", "انتهت صلاحية كود ربط الأسطول", "انتهت صلاحية كود ربط موصل المتجر."); err != nil {
			rows.Close()
			return IssuedConnectionCode{}, err
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return IssuedConnectionCode{}, err
	}
	rows.Close()

	row := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_partner_courier_connection_codes (
			store_id, team_member_id, code_hash, code_last4, status, expires_at, created_by_actor_id,
			issue_idempotency_key, issue_correlation_id
		) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
		RETURNING `+connectionSelectCols,
		storeID, teamMemberID, hash, last4, expiresAt, actorID, idempotencyKey, correlationID)

	connection, scanErr := scanConnection(row)
	if scanErr != nil {
		return IssuedConnectionCode{}, scanErr
	}
	if err := insertMembershipHistory(ctx, tx, teamMemberID, "issue_captain_connection_code", actorID, currentStatus, currentStatus, idempotencyKey, correlationID); err != nil {
		return IssuedConnectionCode{}, err
	}
	if err := insertFleetNotification(ctx, tx, actorID, "partner", "partner_fleet_connection", "تم إصدار كود ربط الأسطول", "تم إصدار كود ربط موصل المتجر بنجاح."); err != nil {
		return IssuedConnectionCode{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssuedConnectionCode{}, err
	}
	return IssuedConnectionCode{Connection: connection, Code: codeStr}, nil
}

func RevokeCode(ctx context.Context, db *sql.DB, storeID, codeID, actorID string, expectedVersion int, idempotencyKey, correlationID string) (ConnectionCode, error) {
	if expectedVersion < 1 {
		return ConnectionCode{}, ErrInvalid
	}
	idempotencyKey, err := validateLifecycleKey(idempotencyKey)
	if err != nil {
		return ConnectionCode{}, err
	}
	correlationID = resolveCorrelationID(correlationID, idempotencyKey)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ConnectionCode{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var currentVersion int
	var currentStatus, teamMemberID string
	if err := tx.QueryRowContext(ctx, `SELECT version, status, team_member_id FROM dsh_partner_courier_connection_codes WHERE id = $1 AND store_id = $2 FOR UPDATE`, codeID, storeID).Scan(&currentVersion, &currentStatus, &teamMemberID); errors.Is(err, sql.ErrNoRows) {
		return ConnectionCode{}, ErrNotFound
	} else if err != nil {
		return ConnectionCode{}, err
	}
	if currentVersion != expectedVersion || currentStatus != "pending" {
		var replayCount int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM dsh_captain_membership_history
			WHERE membership_id = $1 AND action_label = 'revoke_captain_connection_code' AND idempotency_key = $2`,
			teamMemberID, idempotencyKey).Scan(&replayCount); err != nil {
			return ConnectionCode{}, err
		}
		if replayCount > 0 && currentStatus == "revoked" && currentVersion == expectedVersion+1 {
			connection, err := scanConnection(tx.QueryRowContext(ctx, `SELECT `+connectionSelectCols+` FROM dsh_partner_courier_connection_codes WHERE id = $1 AND store_id = $2`, codeID, storeID))
			if err != nil {
				return ConnectionCode{}, err
			}
			return connection, nil
		}
		return ConnectionCode{}, ErrVersionConflict
	}

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
	if err := insertMembershipHistory(ctx, tx, connection.TeamMemberID, "revoke_captain_connection_code", actorID, "pending", "revoked", idempotencyKey, correlationID); err != nil {
		return ConnectionCode{}, err
	}
	if err := insertFleetNotification(ctx, tx, actorID, "partner", "partner_fleet_connection", "تم إلغاء كود ربط الأسطول", "تم إلغاء كود ربط موصل المتجر."); err != nil {
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
