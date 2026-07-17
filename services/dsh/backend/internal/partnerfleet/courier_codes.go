package partnerfleet

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"
)

var (
	ErrNotFound       = errors.New("courier connection code not found")
	ErrInvalid        = errors.New("invalid courier connection request")
	ErrExpired        = errors.New("courier connection code expired")
	ErrAlreadyBound   = errors.New("courier identity is already bound")
	ErrVersionConflict = errors.New("courier connection code version conflict")
	ErrCourierIneligible = errors.New("courier team member is ineligible")
)

const codeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

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
	TeamMemberID string `json:"teamMemberId"`
	StoreID      string `json:"storeId"`
	StoreName    string `json:"storeName"`
	CourierName  string `json:"courierName"`
	Status       string `json:"status"`
	BranchAssignment string `json:"branchAssignment"`
	DeliveryAssignment string `json:"deliveryAssignment"`
	Version      int    `json:"version"`
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

func IssueCode(ctx context.Context, db *sql.DB, storeID, teamMemberID, actorID string, ttl time.Duration) (IssuedConnectionCode, error) {
	if strings.TrimSpace(storeID) == "" || strings.TrimSpace(teamMemberID) == "" || strings.TrimSpace(actorID) == "" {
		return IssuedConnectionCode{}, ErrInvalid
	}
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	if ttl < 15*time.Minute || ttl > 48*time.Hour {
		return IssuedConnectionCode{}, ErrInvalid
	}
	plain, err := generateCode(10)
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	expiresAt := time.Now().UTC().Add(ttl)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	defer tx.Rollback()

	var role, status, identityActorID string
	err = tx.QueryRowContext(ctx, `
		SELECT role,status,identity_actor_id
		FROM dsh_store_team_members
		WHERE id=$1 AND store_id=$2
		FOR UPDATE`, teamMemberID, storeID).Scan(&role, &status, &identityActorID)
	if errors.Is(err, sql.ErrNoRows) {
		return IssuedConnectionCode{}, ErrNotFound
	}
	if err != nil {
		return IssuedConnectionCode{}, err
	}
	if role != "courier" || status == "blocked" || status == "review-needed" {
		return IssuedConnectionCode{}, ErrCourierIneligible
	}
	if identityActorID != "" {
		return IssuedConnectionCode{}, ErrAlreadyBound
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='revoked',revoked_at=NOW(),version=version+1,updated_at=NOW()
		WHERE team_member_id=$1 AND status='pending'`, teamMemberID); err != nil {
		return IssuedConnectionCode{}, err
	}

	connection, err := scanConnection(tx.QueryRowContext(ctx, `
		INSERT INTO dsh_partner_courier_connection_codes
			(store_id,team_member_id,code_hash,code_last4,expires_at,created_by_actor_id)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING `+connectionSelectCols,
		storeID, teamMemberID, hashCode(plain), plain[len(plain)-4:], expiresAt, actorID))
	if err != nil {
		return IssuedConnectionCode{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_team_member_actions
			(member_id,store_id,action_label,from_status,to_status,actor_id)
		VALUES ($1,$2,'issue_captain_connection_code',$3,$3,$4)`, teamMemberID, storeID, status, actorID); err != nil {
		return IssuedConnectionCode{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssuedConnectionCode{}, err
	}
	return IssuedConnectionCode{Connection: connection, Code: plain}, nil
}

func RevokeCode(ctx context.Context, db *sql.DB, storeID, codeID, actorID string, expectedVersion int) (ConnectionCode, error) {
	if storeID == "" || codeID == "" || actorID == "" || expectedVersion <= 0 {
		return ConnectionCode{}, ErrInvalid
	}
	connection, err := scanConnection(db.QueryRowContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='revoked',revoked_at=NOW(),version=version+1,updated_at=NOW()
		WHERE id::TEXT=$1 AND store_id=$2 AND status='pending' AND version=$3
		RETURNING `+connectionSelectCols, codeID, storeID, expectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		var exists int
		checkErr := db.QueryRowContext(ctx, `SELECT 1 FROM dsh_partner_courier_connection_codes WHERE id::TEXT=$1 AND store_id=$2`, codeID, storeID).Scan(&exists)
		if errors.Is(checkErr, sql.ErrNoRows) {
			return ConnectionCode{}, ErrNotFound
		}
		return ConnectionCode{}, ErrVersionConflict
	}
	return connection, err
}

func RedeemCode(ctx context.Context, db *sql.DB, plainCode, captainActorID string) (CaptainFleetMembership, error) {
	plainCode = normalizeCode(plainCode)
	if len(plainCode) < 8 || captainActorID == "" {
		return CaptainFleetMembership{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer tx.Rollback()

	var codeID, storeID, memberID, status string
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT id::TEXT,store_id,team_member_id,status,expires_at
		FROM dsh_partner_courier_connection_codes
		WHERE code_hash=$1
		FOR UPDATE`, hashCode(plainCode)).Scan(&codeID, &storeID, &memberID, &status, &expiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if status != "pending" {
		return CaptainFleetMembership{}, ErrInvalid
	}
	if !expiresAt.After(time.Now().UTC()) {
		if _, updateErr := tx.ExecContext(ctx, `UPDATE dsh_partner_courier_connection_codes SET status='expired',version=version+1,updated_at=NOW() WHERE id::TEXT=$1`, codeID); updateErr != nil {
			return CaptainFleetMembership{}, updateErr
		}
		if commitErr := tx.Commit(); commitErr != nil {
			return CaptainFleetMembership{}, commitErr
		}
		return CaptainFleetMembership{}, ErrExpired
	}

	var courierName, role, memberStatus, identityActorID, branchAssignment, deliveryAssignment string
	var version int
	err = tx.QueryRowContext(ctx, `
		SELECT name,role,status,identity_actor_id,branch_assignment,delivery_assignment,version
		FROM dsh_store_team_members WHERE id=$1 AND store_id=$2 FOR UPDATE`, memberID, storeID).
		Scan(&courierName, &role, &memberStatus, &identityActorID, &branchAssignment, &deliveryAssignment, &version)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if role != "courier" || memberStatus == "blocked" || memberStatus == "review-needed" {
		return CaptainFleetMembership{}, ErrCourierIneligible
	}
	if identityActorID != "" && identityActorID != captainActorID {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}
	var otherMemberID string
	err = tx.QueryRowContext(ctx, `
		SELECT id FROM dsh_store_team_members
		WHERE identity_actor_id=$1 AND id<>$2 LIMIT 1`, captainActorID, memberID).Scan(&otherMemberID)
	if err == nil {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, err
	}

	res, err := tx.ExecContext(ctx, `
		UPDATE dsh_store_team_members
		SET identity_actor_id=$1,status='active',invite_lifecycle='captain_code_redeemed',
			version=version+1,updated_at=NOW()
		WHERE id=$2 AND version=$3`, captainActorID, memberID, version)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		return CaptainFleetMembership{}, ErrVersionConflict
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='redeemed',redeemed_by_captain_actor_id=$1,redeemed_at=NOW(),
			version=version+1,updated_at=NOW()
		WHERE id::TEXT=$2 AND status='pending'`, captainActorID, codeID); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='revoked',revoked_at=NOW(),version=version+1,updated_at=NOW()
		WHERE team_member_id=$1 AND id::TEXT<>$2 AND status='pending'`, memberID, codeID); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_team_member_actions
			(member_id,store_id,action_label,from_status,to_status,actor_id)
		VALUES ($1,$2,'redeem_captain_connection_code',$3,'active',$4)`, memberID, storeID, memberStatus, captainActorID); err != nil {
		return CaptainFleetMembership{}, err
	}
	var storeName string
	if err := tx.QueryRowContext(ctx, `SELECT name FROM dsh_stores WHERE id=$1`, storeID).Scan(&storeName); err != nil {
		return CaptainFleetMembership{}, err
	}
	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}
	return CaptainFleetMembership{
		TeamMemberID: memberID,
		StoreID: storeID,
		StoreName: storeName,
		CourierName: courierName,
		Status: "active",
		BranchAssignment: branchAssignment,
		DeliveryAssignment: deliveryAssignment,
		Version: version + 1,
	}, nil
}

func ListStoreConnections(ctx context.Context, db *sql.DB, storeID string) ([]ConnectionCode, error) {
	if storeID == "" {
		return nil, ErrInvalid
	}
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='expired',version=version+1,updated_at=NOW()
		WHERE store_id=$1 AND status='pending' AND expires_at<=NOW()`, storeID); err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx, `SELECT `+connectionSelectCols+`
		FROM dsh_partner_courier_connection_codes
		WHERE store_id=$1 ORDER BY created_at DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ConnectionCode{}
	for rows.Next() {
		connection, err := scanConnection(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, connection)
	}
	return out, rows.Err()
}

func ListCaptainMemberships(ctx context.Context, db *sql.DB, captainActorID string) ([]CaptainFleetMembership, error) {
	if captainActorID == "" {
		return nil, ErrInvalid
	}
	rows, err := db.QueryContext(ctx, `
		SELECT m.id,m.store_id,s.name,m.name,m.status,m.branch_assignment,m.delivery_assignment,m.version
		FROM dsh_store_team_members m
		JOIN dsh_stores s ON s.id=m.store_id
		WHERE m.identity_actor_id=$1 AND m.role='courier'
		ORDER BY m.updated_at DESC`, captainActorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CaptainFleetMembership{}
	for rows.Next() {
		var membership CaptainFleetMembership
		if err := rows.Scan(
			&membership.TeamMemberID, &membership.StoreID, &membership.StoreName,
			&membership.CourierName, &membership.Status, &membership.BranchAssignment,
			&membership.DeliveryAssignment, &membership.Version,
		); err != nil {
			return nil, err
		}
		out = append(out, membership)
	}
	return out, rows.Err()
}

func FormatCodeForDisplay(code string) string {
	code = normalizeCode(code)
	if len(code) <= 5 {
		return code
	}
	return fmt.Sprintf("%s-%s", code[:5], code[5:])
}
