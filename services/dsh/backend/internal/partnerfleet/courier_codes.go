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
	storeID = strings.TrimSpace(storeID)
	teamMemberID = strings.TrimSpace(teamMemberID)
	actorID = strings.TrimSpace(actorID)
	if storeID == "" || teamMemberID == "" || actorID == "" {
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

	if err := ensureStoreEligible(ctx, tx, storeID); err != nil {
		return IssuedConnectionCode{}, err
	}

	var role, status, identityActorID, courierName string
	err = tx.QueryRowContext(ctx, `
		SELECT role,status,identity_actor_id,name
		FROM dsh_store_team_members
		WHERE id=$1 AND store_id=$2
		FOR UPDATE`, teamMemberID, storeID).Scan(&role, &status, &identityActorID, &courierName)
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
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'partner', 'partner_fleet_connection',
		        'تم إصدار رمز ربط للكابتن',
		        $2,
		        '/team')`,
		actorID, "تم إصدار رمز ربط آمن للموصل "+courierName+" وينتهي تلقائيًا في الموعد المحدد."); err != nil {
		return IssuedConnectionCode{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssuedConnectionCode{}, err
	}
	return IssuedConnectionCode{Connection: connection, Code: plain}, nil
}

func RevokeCode(ctx context.Context, db *sql.DB, storeID, codeID, actorID string, expectedVersion int) (ConnectionCode, error) {
	storeID = strings.TrimSpace(storeID)
	codeID = strings.TrimSpace(codeID)
	actorID = strings.TrimSpace(actorID)
	if storeID == "" || codeID == "" || actorID == "" || expectedVersion <= 0 {
		return ConnectionCode{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ConnectionCode{}, err
	}
	defer tx.Rollback()

	var teamMemberID, codeStatus, memberStatus, courierName string
	var version int
	err = tx.QueryRowContext(ctx, `
		SELECT c.team_member_id, c.status, c.version, m.status, m.name
		FROM dsh_partner_courier_connection_codes c
		JOIN dsh_store_team_members m ON m.id = c.team_member_id AND m.store_id = c.store_id
		WHERE c.id::text = $1 AND c.store_id = $2
		FOR UPDATE`, codeID, storeID).Scan(&teamMemberID, &codeStatus, &version, &memberStatus, &courierName)
	if errors.Is(err, sql.ErrNoRows) {
		return ConnectionCode{}, ErrNotFound
	}
	if err != nil {
		return ConnectionCode{}, err
	}
	if codeStatus != "pending" || version != expectedVersion {
		return ConnectionCode{}, ErrVersionConflict
	}

	connection, err := scanConnection(tx.QueryRowContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='revoked',revoked_at=NOW(),version=version+1,updated_at=NOW()
		WHERE id::text=$1 AND store_id=$2 AND status='pending' AND version=$3
		RETURNING `+connectionSelectCols, codeID, storeID, expectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return ConnectionCode{}, ErrVersionConflict
	}
	if err != nil {
		return ConnectionCode{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_team_member_actions
			(member_id,store_id,action_label,from_status,to_status,actor_id)
		VALUES ($1,$2,'revoke_captain_connection_code',$3,$3,$4)`, teamMemberID, storeID, memberStatus, actorID); err != nil {
		return ConnectionCode{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'partner', 'partner_fleet_connection',
		        'تم سحب رمز ربط الكابتن',
		        $2,
		        '/team')`,
		actorID, "تم سحب رمز الربط المعلق للموصل "+courierName+" ولن يمكن استخدامه."); err != nil {
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

func RedeemCode(ctx context.Context, db *sql.DB, captainActorID, plainCode string) (CaptainFleetMembership, error) {
	captainActorID = strings.TrimSpace(captainActorID)
	normalized := normalizeCode(plainCode)
	if captainActorID == "" || len(normalized) < 8 {
		return CaptainFleetMembership{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer tx.Rollback()

	var connectionID, storeID, memberID, status, createdByActorID string
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT id::TEXT,store_id,team_member_id,status,expires_at,created_by_actor_id
		FROM dsh_partner_courier_connection_codes
		WHERE code_hash=$1
		FOR UPDATE`, hashCode(normalized)).Scan(&connectionID, &storeID, &memberID, &status, &expiresAt, &createdByActorID)
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
		if _, err := tx.ExecContext(ctx, `
			UPDATE dsh_partner_courier_connection_codes
			SET status='expired',version=version+1,updated_at=NOW()
			WHERE id::text=$1 AND status='pending'`, connectionID); err != nil {
			return CaptainFleetMembership{}, err
		}
		if err := tx.Commit(); err != nil {
			return CaptainFleetMembership{}, err
		}
		return CaptainFleetMembership{}, ErrExpired
	}
	if err := ensureStoreEligible(ctx, tx, storeID); err != nil {
		return CaptainFleetMembership{}, err
	}

	var role, memberStatus, existingActor, courierName, branch, deliveryAssignment string
	var memberVersion int
	err = tx.QueryRowContext(ctx, `
		SELECT role,status,identity_actor_id,name,branch_assignment,delivery_assignment,version
		FROM dsh_store_team_members
		WHERE id=$1 AND store_id=$2
		FOR UPDATE`, memberID, storeID).Scan(
		&role,
		&memberStatus,
		&existingActor,
		&courierName,
		&branch,
		&deliveryAssignment,
		&memberVersion,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if role != "courier" || memberStatus == "blocked" || memberStatus == "review-needed" {
		return CaptainFleetMembership{}, ErrCourierIneligible
	}
	if existingActor != "" && existingActor != captainActorID {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}

	var otherMemberID string
	err = tx.QueryRowContext(ctx, `
		SELECT id::text
		FROM dsh_store_team_members
		WHERE identity_actor_id=$1 AND id<>$2
		LIMIT 1`, captainActorID, memberID).Scan(&otherMemberID)
	if err == nil {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, err
	}

	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_store_team_members
		SET identity_actor_id=$1,status='active',invite_lifecycle='captain_code_redeemed',version=version+1,updated_at=NOW()
		WHERE id=$2 AND store_id=$3 AND version=$4`, captainActorID, memberID, storeID, memberVersion)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return CaptainFleetMembership{}, ErrVersionConflict
	}

	result, err = tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='redeemed',redeemed_by_captain_actor_id=$1,redeemed_at=NOW(),version=version+1,updated_at=NOW()
		WHERE id::text=$2 AND status='pending'`, captainActorID, connectionID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return CaptainFleetMembership{}, ErrVersionConflict
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status='revoked',revoked_at=NOW(),version=version+1,updated_at=NOW()
		WHERE team_member_id=$1 AND id::text<>$2 AND status='pending'`, memberID, connectionID); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_team_member_actions
			(member_id,store_id,action_label,from_status,to_status,actor_id)
		VALUES ($1,$2,'redeem_captain_connection_code',$3,'active',$4)`, memberID, storeID, memberStatus, captainActorID); err != nil {
		return CaptainFleetMembership{}, err
	}

	var storeName string
	if err := tx.QueryRowContext(ctx, `SELECT display_name FROM dsh_stores WHERE id=$1`, storeID).Scan(&storeName); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'captain', 'partner_fleet_membership',
		        'تم ربطك بأسطول الشريك',
		        $2,
		        '/account/partner-fleet')`,
		captainActorID, "تم تفعيل عضويتك كموصل لمتجر "+storeName+"."); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'partner', 'partner_fleet_connection',
		        'تم ربط الكابتن بأسطول المتجر',
		        $2,
		        '/team')`,
		createdByActorID, "استهلك الكابتن رمز الربط وأصبحت عضوية "+courierName+" نشطة."); err != nil {
		return CaptainFleetMembership{}, err
	}
	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}

	return CaptainFleetMembership{
		TeamMemberID:       memberID,
		StoreID:            storeID,
		StoreName:          storeName,
		CourierName:        courierName,
		Status:             "active",
		BranchAssignment:   branch,
		DeliveryAssignment: deliveryAssignment,
		Version:            memberVersion + 1,
	}, nil
}
